extends RefCounted

const L10n = preload("res://app/localization.gd")
const Legacy = preload("res://platform/legacy_profile.gd")
const BACKUP_DIRECTORY := "user://planet-patchup-free-web-v1/legacy"
const AUDIO_SETTINGS := "user://free-web-audio-v1.json"
const MAX_SNAPSHOT_BYTES := 64 * 1024 * 1024
const STORAGE_UNAVAILABLE := "Browser storage is unavailable. Saving and importing are blocked. Allow storage for this site, then reload. Export any loaded profile before leaving. Original browser saves are preserved."
var shell
var legacy_settings: Dictionary = {}
var _feedback_callback

func available() -> bool:
	return OS.has_feature("web") and shell != null

func bootstrap(journey) -> void:
	if not OS.has_feature("web"):
		return
	# Engine initialization can complete even when IDBFS has fallen back to volatile MEMFS.
	if not OS.is_userfs_persistent():
		_recovery(journey, "browser-storage-unavailable")
		return
	if not bool(JavaScriptBridge.eval("typeof globalThis.PPFreeWeb === 'object' && typeof globalThis.PPFreeWeb.legacySnapshot === 'function' && typeof globalThis.PPFreeWeb.event === 'function'")):
		return
	shell = JavaScriptBridge.get_interface("PPFreeWeb")
	if shell == null:
		return
	var settings_raw = shell.legacySettings() if bool(JavaScriptBridge.eval("typeof globalThis.PPFreeWeb.legacySettings === 'function'")) else "{}"
	if settings_raw is String and settings_raw.to_utf8_buffer().size() <= 65536:
		var parsed = JSON.parse_string(settings_raw)
		if parsed is Dictionary:
			legacy_settings = parsed
	if journey.store.has_profile_or_recovery():
		return
	var raw = shell.legacySnapshot()
	if not raw is String:
		_recovery(journey, "legacy-snapshot-response")
		return
	if raw.to_utf8_buffer().size() > MAX_SNAPSHOT_BYTES:
		_recovery(journey, "legacy-snapshot-size")
		return
	var snapshot = JSON.parse_string(raw)
	if not snapshot is Dictionary or not snapshot.get("slots") is Dictionary or not snapshot.get("journals") is Dictionary or snapshot.has("error"):
		_recovery(journey, "legacy-snapshot-invalid")
		return
	for key in snapshot.slots:
		if key not in Legacy.V2_KEYS + Legacy.V1_KEYS or not snapshot.slots[key] is String:
			_recovery(journey, "legacy-snapshot-key")
			return
	for key in snapshot.journals:
		if not str(key).begins_with(Legacy.JOURNAL_PREFIX) or not snapshot.journals[key] is String:
			_recovery(journey, "legacy-journal-key")
			return
	if snapshot.slots.is_empty():
		return
	# Archive exact raw strings before decoding/normalizing or writing either destination slot.
	var digest: String = raw.sha256_text()
	var backup_path: String = BACKUP_DIRECTORY.path_join("snapshot-" + digest + ".json")
	if not _write_verified(backup_path, raw):
		_recovery(journey, "legacy-backup-write")
		return
	var selected: Dictionary = Legacy.select_free_slots(snapshot.slots, journey.schema)
	if not selected.ok:
		_recovery(journey, str(selected.reason) + ": " + str(selected.get("detail", "")))
		return
	# Check absence again immediately before committing; an advisory JS marker is never authoritative.
	if journey.store.has_profile_or_recovery():
		return
	var result: Dictionary = journey.import_profile(selected.profile)
	if not result.ok:
		_recovery(journey, "legacy-import: " + str(result.reason))
		return
	var marker := {"schemaVersion": 1, "sourceRevision": selected.profile.revision,
		"resetCount": selected.profile.resetCount, "snapshotSha256": digest, "rawBackup": backup_path,
		"destinationRevision": journey.profile.revision}
	var recorded := _write_verified(BACKUP_DIRECTORY.path_join("migration.json"), JSON.stringify(marker, "", true))
	journey.notice = L10n.text("Free browser progress imported. Original browser saves and a raw recovery copy are preserved.")
	if not recorded:
		journey.notice += " Migration receipt could not be saved; export your profile before closing."
	JavaScriptBridge.force_fs_sync()

func _write_verified(path: String, raw: String) -> bool:
	if DirAccess.make_dir_recursive_absolute(path.get_base_dir()) != OK:
		return false
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(raw)
	file.flush()
	var error := file.get_error()
	file.close()
	return error == OK and FileAccess.get_file_as_string(path) == raw

func _recovery(journey, reason: String) -> void:
	journey.store.recovery_notice = L10n.text(STORAGE_UNAVAILABLE) if reason == "browser-storage-unavailable" else "Legacy free progress needs recovery (" + reason + ")"
	journey.store.read()
	journey.persistent = false
	journey.notice = journey.store.warning
	JavaScriptBridge.force_fs_sync()

func apply_legacy_settings(audio) -> void:
	if not available() or FileAccess.file_exists(AUDIO_SETTINGS):
		return
	var sound = legacy_settings.get("free30-collection-sound")
	if sound in ["on", "off"]:
		audio.set_settings({"music": sound == "on", "effects": sound == "on"})
		JavaScriptBridge.force_fs_sync()

func bind_feedback(callback: Callable) -> void:
	if not available() or not bool(JavaScriptBridge.eval("typeof globalThis.PPFreeWeb.bindFeedback === 'function'")):
		return
	# Keep the JavaScript callback alive for the shell's entire lifetime.
	_feedback_callback = JavaScriptBridge.create_callback(func(args: Array):
		if args.size() == 1 and args[0] is bool:
			callback.call(args[0]))
	shell.bindFeedback(_feedback_callback)

func request_feedback() -> void:
	if available() and bool(JavaScriptBridge.eval("typeof globalThis.PPFreeWeb.requestFeedback === 'function'")):
		shell.requestFeedback()

func emit_event(kind: String, payload: Dictionary = {}) -> void:
	if available():
		shell.event(kind, JSON.stringify(payload))

static func run_payload(run) -> Dictionary:
	return {"id": run.id, "site": {"id": run.site.id}, "mode": run.mode,
		"world": {"collected": run.recovered(), "initial": run.total(),
			"charge": run.world.charge if run.world != null else 0, "attackCounts": run.attacks.duplicate()},
		"paused": run.paused, "finishReady": run.finish_ready, "qualified": run.qualified()}
