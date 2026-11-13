extends Control

signal closed

const UITheme = preload("res://app/ui_theme.gd")
const L10n = preload("res://app/localization.gd")
var _title := ""
var _body: Control
var _panel: PanelContainer
var _previous_focus: Control
var _focus_controls: Array[Control] = []
var _closing := false

func configure(title: String, body: Control) -> void:
	_title = title
	_body = body

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_previous_focus = get_viewport().gui_get_focus_owner()
	var dim := Button.new()
	dim.focus_mode = Control.FOCUS_NONE
	for state in ["normal", "hover", "pressed"]:
		dim.add_theme_stylebox_override(state, UITheme.box(Color(0,0,0,0.7),Color.TRANSPARENT,0,0))
	add_child(dim)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dim.pressed.connect(close)
	_panel = PanelContainer.new()
	_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_panel.add_theme_stylebox_override("panel",UITheme.box(UITheme.MENU_PANEL,UITheme.GOLD,1,12))
	add_child(_panel)
	var column := VBoxContainer.new()
	_panel.add_child(column)
	var heading := HBoxContainer.new()
	column.add_child(heading)
	var title := Label.new()
	title.text = _title
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	title.add_theme_font_size_override("font_size",18)
	title.add_theme_color_override("font_color",UITheme.GOLD)
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	heading.add_child(title)
	var dismiss := Button.new()
	dismiss.text = "×"
	dismiss.tooltip_text = L10n.text("Close")
	dismiss.custom_minimum_size = Vector2(44,44)
	dismiss.add_theme_font_size_override("font_size",18)
	dismiss.pressed.connect(close)
	heading.add_child(dismiss)
	_focus_controls.append(dismiss)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.scroll_deadzone = 8
	scroll.follow_focus = true
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(scroll)
	scroll.get_v_scroll_bar().focus_mode = Control.FOCUS_ALL
	_focus_controls.append(scroll.get_v_scroll_bar())
	if _body != null:
		_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		scroll.add_child(_body)
		for child in _body.find_children("*","Control",true,false):
			if child is BaseButton:
				child.mouse_filter = Control.MOUSE_FILTER_PASS
				if not child.disabled and child.focus_mode != Control.FOCUS_NONE:
					_focus_controls.append(child)
			elif child is PanelContainer:
				child.mouse_filter = Control.MOUSE_FILTER_PASS
			elif child is Label or child is TextureRect:
				child.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for index in range(_focus_controls.size()):
		var control := _focus_controls[index]
		var previous := control.get_path_to(_focus_controls[posmod(index-1,_focus_controls.size())])
		var next := control.get_path_to(_focus_controls[(index+1)%_focus_controls.size()])
		control.focus_previous = previous
		control.focus_next = next
		control.focus_neighbor_left = previous
		control.focus_neighbor_top = previous
		control.focus_neighbor_right = next
		control.focus_neighbor_bottom = next
	resized.connect(_layout)
	_layout()
	dismiss.grab_focus()

func _layout() -> void:
	if _panel == null:
		return
	var available := (size-Vector2(24,24)).max(Vector2.ZERO)
	_panel.size = Vector2(minf(358,available.x),minf(available.y,minf(560,maxf(180,size.y*0.72))))
	_panel.position = (size-_panel.size)/2.0

func _input(event: InputEvent) -> void:
	if _closing or not is_visible_in_tree() or not event is InputEventKey:
		return
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		close()
	elif event.is_action_pressed("ui_focus_next") or event.is_action_pressed("ui_focus_prev"):
		var controls: Array[Control] = []
		for control in _focus_controls:
			if control.is_visible_in_tree():
				controls.append(control)
		var direction := -1 if event.is_action_pressed("ui_focus_prev") else 1
		var index := controls.find(get_viewport().gui_get_focus_owner())
		if index < 0:
			index = -1 if direction > 0 else 0
		controls[posmod(index+direction,controls.size())].grab_focus()
		get_viewport().set_input_as_handled()

func close() -> void:
	if _closing:
		return
	_closing = true
	hide()
	if is_instance_valid(_previous_focus) and _previous_focus.is_inside_tree() and _previous_focus.is_visible_in_tree():
		_previous_focus.grab_focus()
	closed.emit()
	queue_free()
