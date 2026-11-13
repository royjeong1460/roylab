extends Control

signal closed

const UITheme = preload("res://app/ui_theme.gd")
const L10n = preload("res://app/localization.gd")
const Artwork = preload("res://presentation/restoration_artwork.gd")
const INK := UITheme.TEXT
const CREAM := UITheme.MENU_BG
const OLIVE := UITheme.MENU_BORDER
var catalog
var journey
var mode := "gallery"
var region := 0
var on_close := Callable()
var on_records := Callable()
var _entries: Array = []
var _panel: PanelContainer
var _column: VBoxContainer
var _viewer: Control
var _previous_focus: Control
var _viewer_previous_focus: Control
var _closing := false

func setup(source, progress, page_mode := "gallery", index := 0, close_action := Callable(), records_action := Callable()) -> void:
	catalog = source
	journey = progress
	mode = page_mode
	region = index
	on_close = close_action
	on_records = records_action
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/restoration_art.json"))
	if data is Dictionary and data.get("cultures") is Array:
		_entries = data.cultures

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_previous_focus = get_viewport().gui_get_focus_owner()
	var background := ColorRect.new()
	background.color = UITheme.MENU_BG if mode == "gallery" else Color(0.12,0.17,0.14,0.65)
	background.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(background)
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_panel = PanelContainer.new()
	_panel.add_theme_stylebox_override("panel",UITheme.box(CREAM,OLIVE,2,18))
	add_child(_panel)
	_column = VBoxContainer.new()
	_column.add_theme_constant_override("separation",14)
	_panel.add_child(_column)
	if mode == "reward": _build_reward()
	else: _build_gallery()
	resized.connect(_layout)
	_layout()
	_wire_focus(_panel)
	_focus_first.call_deferred()

func _label(value: String, pixels := 12, color := INK) -> Label:
	var label := Label.new()
	label.text = L10n.text(value)
	label.add_theme_font_size_override("font_size",pixels)
	label.add_theme_color_override("font_color",color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

func _button(value: String, action: Callable, primary := false) -> Button:
	var button := Button.new()
	button.text = L10n.text(value)
	button.custom_minimum_size.y = 44
	button.add_theme_font_size_override("font_size",12)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	for variant in ["normal","hover","pressed","disabled","focus"]:
		var fill := UITheme.GOLD if primary else UITheme.MENU_PANEL
		if variant == "hover": fill = fill.lightened(0.06)
		elif variant == "pressed": fill = fill.darkened(0.08)
		elif variant == "focus": fill = Color.TRANSPARENT
		button.add_theme_stylebox_override(variant,UITheme.box(fill,OLIVE,2,8))
	for variant in ["font_color","font_hover_color","font_pressed_color","font_focus_color","font_disabled_color"]:
		button.add_theme_color_override(variant,UITheme.BG if primary else INK)
	button.pressed.connect(action)
	return button

func _entry(index: int) -> Dictionary:
	return _entries[index] if index >= 0 and index < _entries.size() else {}

func _name(index: int) -> String:
	return L10n.text(str(_entry(index).get("name",catalog.region(index).get("name",""))))

func _art(index: int, status: String, thumbnail := true, crop := false) -> Control:
	var art := Artwork.new()
	var uri := str(_entry(index).get("thumbnail" if thumbnail else "full",""))
	var texture: Texture2D = load(uri) as Texture2D if not uri.is_empty() and ResourceLoader.exists(uri) else null
	art.setup(texture,status,crop)
	return art

func _build_gallery() -> void:
	_column.add_child(_label("Achievements",11,UITheme.MUTED))
	var heading := HBoxContainer.new()
	_column.add_child(heading)
	var title := _label("Restoration records",21)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	heading.add_child(title)
	var count := 0
	for index in range(catalog.regions.size()):
		count += int(journey.artwork_state(index).unlocked)
	heading.add_child(_label(str(count)+" / 6",12))
	heading.add_child(_button("×",close))
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.follow_focus = true
	scroll.scroll_deadzone = 8
	_column.add_child(scroll)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation",12)
	grid.add_theme_constant_override("v_separation",16)
	scroll.add_child(grid)
	for index in range(catalog.regions.size()):
		grid.add_child(_card(index))
	var condition := _label("All 6 sites + boss at 100%",10,UITheme.MUTED)
	condition.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_column.add_child(condition)

func _card(index: int) -> Button:
	var state: Dictionary = journey.artwork_state(index)
	var button := _button("",func(): _open_viewer(index))
	button.disabled = state.status == "locked"
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.custom_minimum_size = Vector2(0,157)
	button.mouse_filter = Control.MOUSE_FILTER_PASS
	button.tooltip_text = _name(index)
	var column := VBoxContainer.new()
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	column.offset_left = 4
	column.offset_right = -4
	column.offset_top = 4
	column.offset_bottom = -4
	column.add_theme_constant_override("separation",7)
	button.add_child(column)
	var art := _art(index,str(state.status),true,true)
	art.custom_minimum_size.y = 96
	column.add_child(art)
	var name_label := _label(_name(index),11)
	name_label.clip_text = true
	column.add_child(name_label)
	var row := HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	column.add_child(row)
	var status := _label("Fully restored" if state.unlocked else "Partly revealed" if state.status == "preview" else "Unrestored",9,UITheme.MUTED)
	status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(status)
	row.add_child(_label(str(state.perfect)+"/7",9,UITheme.MUTED))
	return button

func _build_reward() -> void:
	var badge := _label("100%",22,UITheme.GOLD)
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_column.add_child(badge)
	var kicker := _label("Fully restored",12,UITheme.MUTED)
	kicker.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_column.add_child(kicker)
	var title := _label(_name(region),21)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_column.add_child(title)
	var image_button := _button("",func(): _open_viewer(region))
	image_button.custom_minimum_size.y = 132
	var art := _art(region,"restored",false)
	image_button.add_child(art)
	art.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	art.offset_left = 2
	art.offset_right = -2
	art.offset_top = 2
	art.offset_bottom = -2
	image_button.tooltip_text = L10n.text("View full picture")
	_column.add_child(image_button)
	_column.add_child(_button("Restoration records",func():
		close(false)
		if on_records.is_valid(): on_records.call(),true))

func _open_viewer(index: int) -> void:
	if _closing or not is_visible_in_tree() or is_instance_valid(_viewer): return
	var state: Dictionary = journey.artwork_state(index)
	if state.status == "locked": return
	_viewer_previous_focus = get_viewport().gui_get_focus_owner()
	_viewer = Control.new()
	_viewer.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_viewer)
	_viewer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0.12,0.17,0.14,0.85)
	_viewer.add_child(dim)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel",UITheme.box(CREAM,OLIVE,2,12))
	_viewer.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	panel.add_child(column)
	var header := HBoxContainer.new()
	column.add_child(header)
	var title := _label(_name(index),14)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	var zoom := _button("+",func(): pass)
	zoom.visible = state.unlocked
	header.add_child(zoom)
	var dismiss := _button("×",_close_viewer)
	header.add_child(dismiss)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.scroll_deadzone = 8
	column.add_child(scroll)
	var art := _art(index,str(state.status),false)
	scroll.add_child(art)
	var update_art := func():
		var width := maxf(1,scroll.size.x-2)
		var height := width*900.0/2340.0
		var factor := 2.25 if zoom.button_pressed else 1.0
		art.custom_minimum_size = Vector2(width,height)*factor
	zoom.toggle_mode = true
	zoom.toggled.connect(func(expanded: bool):
		zoom.text = "−" if expanded else "+"
		update_art.call()
		if expanded: scroll.set_deferred("scroll_horizontal",roundi(scroll.size.x*0.625)))
	scroll.resized.connect(update_art)
	var caption := _label("Fully restored" if state.unlocked else "All 6 sites + boss at 100%",10,UITheme.MUTED)
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(caption)
	var fit := func():
		panel.size = Vector2(minf(390,maxf(0,size.x-24)),minf(500,maxf(0,size.y-32)))
		panel.position = (size-panel.size)/2.0
	_viewer.resized.connect(fit)
	fit.call()
	update_art.call_deferred()
	_wire_focus(_viewer)
	dismiss.grab_focus()

func _close_viewer() -> void:
	if is_instance_valid(_viewer):
		_viewer.hide()
		_viewer.queue_free()
	_viewer = null
	if not _closing and is_inside_tree() and is_visible_in_tree():
		if _can_focus(_viewer_previous_focus):
			_viewer_previous_focus.grab_focus()
		else:
			_focus_first.call_deferred()
	_viewer_previous_focus = null

func close_popup() -> bool:
	if not is_instance_valid(_viewer): return false
	_close_viewer()
	return true

func _layout() -> void:
	if _panel == null: return
	if mode == "gallery":
		_panel.size = Vector2(minf(390,size.x),minf(844,size.y))
	else:
		_panel.size = Vector2(minf(358,maxf(0,size.x-32)),minf(390,maxf(0,size.y-24)))
	_panel.position = (size-_panel.size)/2.0

func _can_focus(control: Control) -> bool:
	return is_instance_valid(control) and not control.is_queued_for_deletion() and control.is_inside_tree() and control.is_visible_in_tree() and control.focus_mode != Control.FOCUS_NONE and (not control is BaseButton or not control.disabled)

func _focus_controls(root: Control) -> Array[Control]:
	var controls: Array[Control] = []
	for child in root.find_children("*","Control",true,false):
		if _can_focus(child):
			controls.append(child)
	return controls

func _wire_focus(root: Control) -> void:
	var controls := _focus_controls(root)
	for index in range(controls.size()):
		var control := controls[index]
		var previous := control.get_path_to(controls[posmod(index-1,controls.size())])
		var next := control.get_path_to(controls[(index+1)%controls.size()])
		control.focus_previous = previous
		control.focus_next = next
		control.focus_neighbor_left = previous
		control.focus_neighbor_top = previous
		control.focus_neighbor_right = next
		control.focus_neighbor_bottom = next

func _input(event: InputEvent) -> void:
	if _closing or not is_inside_tree() or not is_visible_in_tree() or not event is InputEventKey:
		return
	if event.is_action_pressed("ui_cancel"):
		get_viewport().set_input_as_handled()
		if not close_popup(): close()
		return
	var root: Control = _viewer if is_instance_valid(_viewer) else _panel
	var controls := _focus_controls(root)
	if controls.is_empty(): return
	var backward := event.is_action_pressed("ui_focus_prev") or event.is_action_pressed("ui_left") or event.is_action_pressed("ui_up")
	var forward := event.is_action_pressed("ui_focus_next") or event.is_action_pressed("ui_right") or event.is_action_pressed("ui_down")
	var index := controls.find(get_viewport().gui_get_focus_owner())
	if backward or forward:
		var direction := -1 if backward else 1
		if index < 0: index = 0 if backward else -1
		controls[posmod(index+direction,controls.size())].grab_focus()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_accept") and index < 0:
		controls[0].grab_focus()
		get_viewport().set_input_as_handled()

func _focus_first() -> void:
	if _closing or is_queued_for_deletion() or not is_inside_tree() or not is_visible_in_tree() or is_instance_valid(_viewer) or not is_instance_valid(_panel): return
	var controls := _focus_controls(_panel)
	if not controls.is_empty(): controls[0].grab_focus()

func close(call_action := true) -> void:
	if _closing: return
	_closing = true
	hide()
	if _can_focus(_previous_focus):
		_previous_focus.grab_focus()
	closed.emit()
	queue_free()
	if call_action and on_close.is_valid(): on_close.call()
