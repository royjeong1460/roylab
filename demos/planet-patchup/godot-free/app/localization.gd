extends RefCounted

const SETTINGS_PATH := "user://free-web-language-v1.json"
const KOREAN_PATH := "res://data/locale-ko.json"
const SUPPORTED := ["ko", "en"]
static var _initialized := false
static var _language := "en"
static var _korean: Translation

static func setup() -> void:
	if _initialized:
		return
	_initialized = true
	_language = "ko" if OS.get_locale_language() == "ko" else "en"
	if FileAccess.file_exists(SETTINGS_PATH):
		var saved = JSON.parse_string(FileAccess.get_file_as_string(SETTINGS_PATH))
		if saved is Dictionary and saved.get("language") in SUPPORTED:
			_language = saved.language
	var messages = JSON.parse_string(FileAccess.get_file_as_string(KOREAN_PATH))
	if messages is Dictionary:
		_korean = Translation.new()
		_korean.locale = "ko"
		for source in messages:
			if source is String and messages[source] is String:
				_korean.add_message(source, messages[source])
		TranslationServer.add_translation(_korean)
	else:
		push_warning("Korean translations could not be loaded; English source text is available.")
	TranslationServer.set_locale(_language)

static func text(source: String) -> String:
	if not _initialized:
		setup()
	return str(TranslationServer.translate(source))

static func format(source: String, args: Array) -> String:
	return text(source) % args

static func language() -> String:
	if not _initialized:
		setup()
	return _language

static func set_language(code: String) -> Error:
	if code not in SUPPORTED:
		return ERR_INVALID_PARAMETER
	if not _initialized:
		setup()
	var payload := JSON.stringify({"language": code})
	var temporary := SETTINGS_PATH + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(payload)
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		return error
	if FileAccess.get_file_as_string(temporary) != payload:
		return ERR_FILE_CORRUPT
	error = DirAccess.rename_absolute(ProjectSettings.globalize_path(temporary), ProjectSettings.globalize_path(SETTINGS_PATH))
	if error != OK:
		return error
	_language = code
	TranslationServer.set_locale(_language)
	return OK
