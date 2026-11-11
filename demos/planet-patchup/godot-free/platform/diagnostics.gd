extends RefCounted

# This preference never touches campaign progress or exported profiles.
const PATH := "user://diagnostics.cfg"
const VISIBILITY_REVISION := 1
static var _loaded := false
static var _enabled := bool(ProjectSettings.get_setting("diagnostics/performance_overlay", false))

static func is_enabled() -> bool:
	if not _loaded:
		var config := ConfigFile.new()
		if config.load(PATH) == OK and config.get_value("diagnostics", "visibility_revision", 0) == VISIBILITY_REVISION:
			_enabled = config.get_value("diagnostics", "visible", false) == true
		_loaded = true
	return _enabled

static func set_enabled(value: bool) -> void:
	_loaded = true
	_enabled = value
	var config := ConfigFile.new()
	config.set_value("diagnostics", "visible", value)
	config.set_value("diagnostics", "visibility_revision", VISIBILITY_REVISION)
	if config.save(PATH) != OK:
		push_warning("Diagnostic visibility could not be saved; current session still works.")
