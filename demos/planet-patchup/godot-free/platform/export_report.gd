extends RefCounted

static func save_json(path: String, report: Dictionary) -> Dictionary:
	if path.is_empty():
		return {"ok": false, "reason": "export-path"}
	var temporary := path + ".tmp"
	var file := FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return {"ok": false, "reason": "export-open", "error": FileAccess.get_open_error()}
	file.store_string(JSON.stringify(report, "\t", true))
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK:
		return {"ok": false, "reason": "export-write", "error": error}
	if not JSON.parse_string(FileAccess.get_file_as_string(temporary)) is Dictionary:
		return {"ok": false, "reason": "export-readback"}
	error = DirAccess.rename_absolute(ProjectSettings.globalize_path(temporary), ProjectSettings.globalize_path(path))
	return {"ok": error == OK, "reason": "" if error == OK else "export-commit", "error": error, "path": path}
