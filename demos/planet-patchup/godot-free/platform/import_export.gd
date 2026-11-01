extends Node

signal import_ready(text: String)
signal failure(message: String)
signal exported(path: String)
const ExportReport = preload("res://platform/export_report.gd")
const L10n = preload("res://app/localization.gd")
const MAX_BYTES := 16 * 1024 * 1024
const IOS_REQUEST := "pp-document-request.json"
const IOS_RESPONSE := "pp-document-response.json"
const IOS_IMPORT := "pp-document-import.json"
var dialog: FileDialog
var _pending_id := ""
var _pending_action := ""
var _pending_export_path := ""
var _poll_remaining := 0.0

func request_import() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("""(() => { const input=document.createElement('input'); input.type='file'; input.accept='.json,application/json'; input.onchange=async()=>{const f=input.files[0]; if(!f)return;if(f.size>16777216){window.__ppFreeImportError='File is larger than 16 MB.';return;}try{window.__ppFreeImportText=await f.text();}catch(e){window.__ppFreeImportError='Could not read the selected file.';}}; input.click(); })();""")
		return
	if OS.has_feature("ios"):
		_request_ios("import")
		return
	dialog = FileDialog.new()
	dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	dialog.access = FileDialog.ACCESS_FILESYSTEM
	dialog.filters = PackedStringArray(["*.json ; " + L10n.text("Planet Patchup records")])
	dialog.use_native_dialog = true
	dialog.file_selected.connect(_read_file)
	dialog.canceled.connect(func(): dialog.queue_free())
	add_child(dialog)
	dialog.popup_centered_ratio(0.85)

func _read_file(path: String) -> void:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		failure.emit("Could not read the selected file.")
	elif file.get_length() > MAX_BYTES:
		failure.emit("File is larger than 16 MB.")
	else:
		import_ready.emit(file.get_as_text())
	if file != null:
		file.close()
	if is_instance_valid(dialog):
		dialog.queue_free()

func export_json(report: Dictionary) -> void:
	if OS.has_feature("ios") and not _pending_id.is_empty():
		return
	var name := "planet-patchup-%s.json" % Time.get_datetime_string_from_system().replace(":", "-")
	var data := JSON.stringify(report, "\t", true)
	if OS.has_feature("web"):
		JavaScriptBridge.download_buffer(data.to_utf8_buffer(), name, "application/json")
		exported.emit(name)
		return
	var directory := OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS) if OS.has_feature("ios") else "user://"
	if directory.is_empty():
		directory = "user://"
	var path := directory.path_join(name)
	var saved: Dictionary = ExportReport.save_json(path, report)
	if saved.ok:
		if OS.has_feature("ios"):
			_pending_export_path = path
			_request_ios("export",name)
		else:
			exported.emit(path)
	else:
		failure.emit("Could not export records. Existing progress is safe.")

func _documents_path(filename: String) -> String:
	return OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS).path_join(filename)

func _request_ios(action: String, filename := "") -> void:
	if not _pending_id.is_empty():
		return
	var directory := OS.get_system_dir(OS.SYSTEM_DIR_DOCUMENTS)
	if directory.is_empty():
		failure.emit("The app Documents folder is unavailable.")
		return
	var request_id := "%d-%d" % [Time.get_ticks_usec(),randi()]
	var request := {"id":request_id,"action":action}
	if not filename.is_empty():
		request.filename=filename
	var saved: Dictionary=ExportReport.save_json(directory.path_join(IOS_REQUEST),request)
	if not saved.ok:
		failure.emit("Could not open the document picker. Existing progress is safe.")
		return
	_pending_id=request_id
	_pending_action=action
	_poll_remaining=0.0

func _poll_ios(dt: float) -> void:
	if _pending_id.is_empty():
		return
	_poll_remaining-=maxf(0,dt)
	if _poll_remaining>0:
		return
	_poll_remaining=0.25
	var response_path:=_documents_path(IOS_RESPONSE)
	if not FileAccess.file_exists(response_path):
		return
	var file:=FileAccess.open(response_path,FileAccess.READ)
	if file==null:
		return
	if file.get_length()>8192:
		file.close()
		DirAccess.remove_absolute(response_path)
		return
	var response=JSON.parse_string(file.get_as_text())
	file.close()
	DirAccess.remove_absolute(response_path)
	if not response is Dictionary or response.get("id")!=_pending_id:
		return
	var action:=_pending_action
	var export_path:=_pending_export_path
	_pending_id=""
	_pending_action=""
	_pending_export_path=""
	if response.get("canceled",false):
		return
	if not response.get("ok",false):
		failure.emit(str(response.get("error","Could not complete the document request. Existing progress is safe.")))
		return
	if action=="export":
		exported.emit(export_path)
	elif response.get("filename")==IOS_IMPORT:
		var path:=_documents_path(IOS_IMPORT)
		_read_file(path)
		DirAccess.remove_absolute(path)
	else:
		failure.emit("The imported file could not be prepared. Existing progress is safe.")

func _process(dt: float) -> void:
	if OS.has_feature("ios"):
		_poll_ios(dt)
		return
	if not OS.has_feature("web"):
		return
	var error = JavaScriptBridge.eval("(()=>{const x=window.__ppFreeImportError||'';delete window.__ppFreeImportError;return x;})()")
	if error is String and not error.is_empty():
		failure.emit(error)
	var text = JavaScriptBridge.eval("(()=>{const x=window.__ppFreeImportText||'';delete window.__ppFreeImportText;return x;})()")
	if text is String and not text.is_empty():
		import_ready.emit(text)
