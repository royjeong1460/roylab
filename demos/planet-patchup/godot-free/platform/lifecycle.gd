extends Node

signal active_changed(active: bool)
signal back_requested
var active := true
var app_active := true
var focused := true
var audio: Node

func _ready() -> void:
	process_mode=Node.PROCESS_MODE_ALWAYS
	get_tree().auto_accept_quit=false
	get_tree().quit_on_go_back=false

func setup(audio_player: Node) -> void:
	audio=audio_player
	_sync()

func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_PAUSED:
			app_active=false
			_sync()
		NOTIFICATION_APPLICATION_RESUMED:
			app_active=true
			focused=true
			_sync()
		NOTIFICATION_APPLICATION_FOCUS_OUT:
			focused=false
			_sync()
		NOTIFICATION_APPLICATION_FOCUS_IN:
			focused=true
			_sync()
		NOTIFICATION_WM_GO_BACK_REQUEST, NOTIFICATION_WM_CLOSE_REQUEST:
			back_requested.emit()

func _sync() -> void:
	var value := app_active and focused
	if audio != null:
		audio.set_paused(not value)
	if active != value:
		active=value
		active_changed.emit(active)
