extends RefCounted

const L10n = preload("res://app/localization.gd")
const DIRECTORY := "user://planet-patchup-free-web-v1/profiles"
const SLOT_NAMES := ["pixel-demolition-arch-v2-a.json", "pixel-demolition-arch-v2-b.json"]
var schema
var _warning_template := ""
var _warning_args: Array = []
var _warning_prefix := ""
var warning: String:
	get:
		if not recovery_notice.is_empty() and OS.has_feature("web") and not OS.is_userfs_persistent():
			return recovery_notice
		var args := _warning_args.duplicate()
		if not args.is_empty():
			args[0] = str(args[0]).replace(": malformed JSON", ": " + L10n.text("malformed JSON")).replace("Same revision has conflicting contents", L10n.text("Same revision has conflicting contents"))
		var body := L10n.format(_warning_template, args) if not _warning_template.is_empty() else ""
		return L10n.text(_warning_prefix) + (" " + body if not body.is_empty() else "") if not _warning_prefix.is_empty() else body
var blocked := false
var recovery_notice := ""

func setup(profile_schema) -> void:
	schema = profile_schema

func read() -> Dictionary:
	var candidates: Array = []
	var errors: Array = []
	if not recovery_notice.is_empty():
		errors.append(recovery_notice)
	var existing := 0
	for name in SLOT_NAMES:
		var path: String = DIRECTORY.path_join(name)
		if not FileAccess.file_exists(path):
			continue
		existing += 1
		var text := FileAccess.get_file_as_string(path)
		var parsed := JSON.new()
		if parsed.parse(text) != OK:
			errors.append(name + ": malformed JSON")
			continue
		var result: Dictionary = schema.normalize(parsed.data)
		if not result.ok:
			errors.append(name + ": " + str(result.reason))
			continue
		candidates.append(result.profile)
	if candidates.size() == 2 and candidates[0].revision == candidates[1].revision and JSON.stringify(candidates[0], "", true) != JSON.stringify(candidates[1], "", true):
		errors.append("Same revision has conflicting contents")
	if existing == 0 and has_profile_or_recovery():
		errors.append("Only recovery copies exist; import a verified backup before continuing")
	blocked = not errors.is_empty()
	_warning_prefix = ""
	_warning_template = "Save data preserved. %s. Import a verified JSON backup to recover." if blocked else ""
	_warning_args = ["; ".join(errors)] if blocked else []
	if existing > 0 and candidates.is_empty():
		return {"ok": false, "reason": "corrupt", "warning": warning}
	candidates.sort_custom(func(a, b): return a.revision > b.revision)
	return {"ok": true, "reason": "", "profile": candidates[0] if not candidates.is_empty() else schema.fresh(), "blocked": blocked, "warning": warning}

func save(profile: Dictionary) -> Dictionary:
	if blocked:
		return {"ok": false, "reason": "storage-blocked"}
	var reason: String = schema.validate(profile)
	if not reason.is_empty():
		return {"ok": false, "reason": "invalid-profile:" + reason}
	var disk := read()
	if not disk.ok or blocked:
		return {"ok": false, "reason": "storage-blocked"}
	if int(profile.revision) != int(disk.profile.revision) + 1:
		return {"ok": false, "reason": "stale"}
	return _write_slot(profile)

func _write_slot(profile: Dictionary) -> Dictionary:
	if OS.has_feature("web") and not OS.is_userfs_persistent():
		return {"ok": false, "reason": "storage-unavailable"}
	var invalid: String = schema.validate(profile)
	if not invalid.is_empty():
		return {"ok": false, "reason": "invalid-profile:" + invalid}
	var error := DirAccess.make_dir_recursive_absolute(DIRECTORY)
	if error != OK:
		return {"ok": false, "reason": "storage-directory", "error": error}
	var wire: Dictionary = profile.duplicate(true)
	wire.balanceVersion = schema.SAVE_BALANCE_VERSION
	var payload := JSON.stringify(wire, "", true, true)
	var path: String = DIRECTORY.path_join(SLOT_NAMES[int(profile.revision) % 2])
	var temporary := path + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return {"ok": false, "reason": "storage-write", "error": FileAccess.get_open_error()}
	file.store_string(payload)
	file.flush()
	error = file.get_error()
	file.close()
	if error != OK:
		return {"ok": false, "reason": "storage-flush", "error": error}
	# Compare the written JSON, since parsing changes integer zero into float zero.
	var stored_payload := FileAccess.get_file_as_string(temporary)
	if stored_payload != payload:
		return {"ok": false, "reason": "storage-readback"}
	var readback: Dictionary = schema.normalize(JSON.parse_string(stored_payload))
	if not readback.ok:
		return {"ok": false, "reason": "storage-readback"}
	var absolute := ProjectSettings.globalize_path(path)
	var temp_absolute := ProjectSettings.globalize_path(temporary)
	# rename over an existing file is atomic on native platforms; previous slot remains a recovery revision.
	if FileAccess.file_exists(path):
		error = DirAccess.copy_absolute(absolute, absolute + ".backup")
		if error != OK:
			return {"ok": false, "reason": "storage-backup", "error": error}
	error = DirAccess.rename_absolute(temp_absolute, absolute)
	if error != OK:
		return {"ok": false, "reason": "storage-commit", "error": error}
	return {"ok": true, "reason": "", "profile": profile.duplicate(true)}

func import_verified(profile: Dictionary) -> Dictionary:
	if OS.has_feature("web") and not OS.is_userfs_persistent():
		return {"ok": false, "reason": "storage-unavailable"}
	var normalized: Dictionary = schema.normalize(profile)
	if not normalized.ok:
		return normalized
	var stamp := str(Time.get_unix_time_from_system()).replace(".", "-")
	# Explicit import preserves both original slots, including corrupt input, before replacement.
	for name in SLOT_NAMES:
		var path: String = DIRECTORY.path_join(name)
		if FileAccess.file_exists(path):
			var error := DirAccess.copy_absolute(ProjectSettings.globalize_path(path), ProjectSettings.globalize_path(path + ".before-import-" + stamp))
			if error != OK:
				return {"ok": false, "reason": "import-backup", "error": error}
	var disk := read()
	var next: Dictionary = normalized.profile.duplicate(true)
	var local_revision := int(disk.profile.revision) if disk.ok else 0
	if maxi(local_revision, int(next.revision)) >= schema.MAX_SAFE_INTEGER - 1:
		return {"ok": false, "reason": "revision-overflow"}
	next.revision = maxi(local_revision, int(next.revision)) + 1
	var result := _write_slot(next)
	if not result.ok:
		return result
	recovery_notice = ""
	# Make both slots valid after recovery, retaining the imported history exactly once.
	var mirror: Dictionary = next.duplicate(true)
	mirror.revision += 1
	result = _write_slot(mirror)
	if result.ok:
		recovery_notice = ""
		blocked = false
		_warning_template = ""
		_warning_args = []
		_warning_prefix = ""
		return result
	# The first live rename is the commit point. A redundant-copy failure cannot report
	# an uncommitted import or leave Journey holding the pre-import in-memory profile.
	var other_path: String = DIRECTORY.path_join(SLOT_NAMES[int(mirror.revision) % 2])
	if FileAccess.file_exists(other_path):
		var other: Dictionary = schema.normalize(JSON.parse_string(FileAccess.get_file_as_string(other_path)))
		if not other.ok:
			var original_backup := other_path + ".before-import-" + stamp
			# The exact corrupt original was copied before the live commit; retain that copy.
			if FileAccess.file_exists(original_backup):
				DirAccess.remove_absolute(ProjectSettings.globalize_path(other_path))
	var committed := read()
	var committed_profile: Dictionary = committed.profile if committed.ok else next
	_warning_prefix = "Imported profile committed. The redundant save copy could not be written; original backups are preserved."
	return {"ok": true, "reason": "", "profile": committed_profile.duplicate(true),
		"warning": warning, "redundancyPending": true, "storageBlocked": blocked}

func has_profile_or_recovery() -> bool:
	var directory := DirAccess.open(DIRECTORY)
	if directory == null:
		return false
	for file in directory.get_files():
		for name in SLOT_NAMES:
			if file.begins_with(name):
				return true
	return false
