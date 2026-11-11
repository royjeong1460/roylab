extends RefCounted

const L10n = preload("res://app/localization.gd")
const DIRECTORY := "user://planet-patchup-free-web-v1/journal"
const LIMIT := 200
const SAMPLE_LIMIT := 24
var _failed := false
var warning: String:
	get:
		return L10n.text("Local play journal could not be saved. Export JSON before closing the app.") if _failed else ""
var current: Dictionary = {}
var current_run
var memory: Dictionary = {}
var truncated := 0
var session_id := "%d-%d" % [Time.get_ticks_usec(), randi()]
var performance := {"frames": 0, "elapsedMs": 0.0, "slowFrames": 0, "updateMs": 0.0, "updates": 0}

func setup() -> void:
	for record in records():
		if record.get("id") == "dropped":
			truncated = int(record.get("dropped", 0))
		elif record.get("status") == "running":
			record.status = "abandoned"
			record.endReason = "reload-or-close"
			record.reward = 0
			record.endedAt = record.get("checkpointAt", _now())
			_write(record)
	prune()

func _now() -> int:
	return int(Time.get_unix_time_from_system() * 1000)

func _fail() -> void:
	_failed = true

func records() -> Array:
	var all := memory.duplicate(true)
	var directory := DirAccess.open(DIRECTORY)
	if directory != null:
		for name in directory.get_files():
			if not name.ends_with(".json"):
				continue
			var value = JSON.parse_string(FileAccess.get_file_as_string(DIRECTORY.path_join(name)))
			if not value is Dictionary or value.get("schemaVersion") != 1 or not value.get("samples") is Array or not value.get("id") is String:
				_fail()
				continue
			if not all.has(value.id):
				all[value.id] = value
	var result: Array = all.values()
	result.sort_custom(func(a, b): return a.get("startedAt", 0) < b.get("startedAt", 0) or (a.get("startedAt", 0) == b.get("startedAt", 0) and str(a.id) < str(b.id)))
	return result

func _write(record: Dictionary) -> void:
	memory[record.id] = record.duplicate(true)
	if DirAccess.make_dir_recursive_absolute(DIRECTORY) != OK:
		_fail()
		return
	var path: String = DIRECTORY.path_join(str(record.id).validate_filename() + ".json")
	var file := FileAccess.open(path + ".tmp", FileAccess.WRITE)
	if file == null:
		_fail()
		return
	file.store_string(JSON.stringify(record, "", true))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK or DirAccess.rename_absolute(ProjectSettings.globalize_path(path + ".tmp"), ProjectSettings.globalize_path(path)) != OK:
		_fail()

func prune() -> void:
	var list := records()
	var kept := 0
	for record in list:
		if record.id != "dropped":
			kept += 1
	for record in list:
		if kept <= LIMIT:
			break
		if record.id == "dropped" or record.get("status") == "running":
			continue
		var path: String = DIRECTORY.path_join(str(record.id).validate_filename() + ".json")
		if FileAccess.file_exists(path) and DirAccess.remove_absolute(ProjectSettings.globalize_path(path)) != OK:
			_fail()
			continue
		memory.erase(record.id)
		kept -= 1
		truncated += 1
	if truncated:
		_write({"schemaVersion": 1, "id": "dropped", "samples": [], "dropped": truncated, "startedAt": 0})

func start(run, flags: Dictionary = {}) -> void:
	if not current.is_empty():
		abandon(current_run, "replaced")
	current_run = run
	performance = {"frames": 0, "elapsedMs": 0.0, "slowFrames": 0, "updateMs": 0.0, "updates": 0}
	current = {"schemaVersion": 1, "id": session_id + "-" + run.id, "sessionId": session_id,
		"runId": run.id, "startedAt": _now(), "checkpointAt": _now(), "status": "running",
		"campaign": "arch", "physicsVersion": "godot-free-skills-v059", "balanceVersion": run.profile.balanceVersion,
		"mapVersion": "arch-quarter-v2", "mapId": run.site.id, "mapSeed": run.site.get("seed"),
		"mode": run.mode, "training": run.mode == "tutorial", "preview": flags.get("preview", false),
		"qa": flags.get("qa", false), "resetCount": run.profile.resetCount,
		"profileStart": run.profile.duplicate(true), "samples": [], "droppedSamples": 0,
		"pauses": 0, "reward": 0, "latest": run.snapshot()}
	_write(current)
	prune()

func frame(elapsed_ms: float, update_ms: float = 0.0) -> void:
	if current.is_empty():
		return
	performance.frames += 1
	performance.elapsedMs += elapsed_ms
	performance.slowFrames += int(elapsed_ms > 50)
	performance.updateMs += update_ms
	performance.updates += 1

func sample(run) -> void:
	if current.is_empty():
		return
	current.latest = run.snapshot()
	var sample_data: Dictionary = current.latest.duplicate(true)
	sample_data.at = _now()
	current.samples.append(sample_data)
	if current.samples.size() > SAMPLE_LIMIT:
		current.samples.pop_front()
		current.droppedSamples += 1
	checkpoint(run)

func checkpoint(run, options: Dictionary = {}) -> void:
	if current.is_empty() or run == null:
		return
	current.latest = run.snapshot()
	if run.world != null and run.world.blast_trace.enabled:
		current.attackTrace = run.world.blast_trace.export_data()
	if run.world != null:
		current.boundaryGuard = {"count": run.world.boundary_guard_count, "recent": run.world.boundary_guard_history.duplicate(true)}
	current.closed = options.get("closed", false)
	current.checkpointAt = _now()
	current.pauses += int(options.get("paused", false))
	current.performance = performance.duplicate(true)
	current.performance.averageFps = 1000.0 * performance.frames / performance.elapsedMs if performance.elapsedMs > 0 else 0
	current.performance.averageUpdateMs = performance.updateMs / performance.updates if performance.updates > 0 else 0
	_write(current)

func finish(run, receipt: Dictionary, profile: Dictionary) -> void:
	if current.is_empty():
		return
	checkpoint(run)
	current.status = "finished"
	current.endedAt = _now()
	current.endReason = run.finish_reason if not run.finish_reason.is_empty() else "return"
	current.reward = receipt.reward
	current.qualified = receipt.qualified
	current.securedAtEnd = run.secured_at_end
	current.profileEnd = profile.duplicate(true)
	current.receipt = receipt.duplicate(true)
	_write(current)
	current = {}
	current_run = null
	prune()

func abandon(run, reason := "abandoned") -> void:
	if current.is_empty():
		return
	checkpoint(run)
	current.status = "abandoned"
	current.endReason = reason
	current.reward = 0
	current.endedAt = _now()
	_write(current)
	current = {}
	current_run = null
	prune()

func export_data(profile: Dictionary) -> Dictionary:
	var list: Array = records().filter(func(record): return record.id != "dropped")
	return {"schemaVersion": 1, "exportedAt": Time.get_datetime_string_from_system(true) + "Z",
		"campaign": "arch", "balanceVersion": profile.balanceVersion, "mapVersion": "arch-quarter-v2",
		"currentProfile": profile.duplicate(true), "records": list, "truncated": truncated,
		"storageWarning": warning, "truncationApproximate": false, "limits": {"records": LIMIT, "samplesPerRun": SAMPLE_LIMIT}}
