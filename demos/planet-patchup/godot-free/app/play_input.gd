extends Node

const INVALID := Vector2(-999.0, -999.0)
const TAP_DISTANCE := 12.0
var view
var aim := INVALID
var previous := INVALID
var collecting := false
var _touches: Dictionary = {}
var _all_touches: Dictionary = {}
var _touch_blocked := false
var _gesture: Dictionary = {}
var _mouse_pan := false
var _mouse_pan_button := MOUSE_BUTTON_RIGHT
var _last_mouse := Vector2.ZERO

func setup(play_view) -> void:
	view = play_view
	set_process_input(true)
	set_process_unhandled_input(true)

func _process(_dt: float) -> void:
	if not _available():
		collecting = false
	elif _touches.is_empty() and not _mouse_pan:
		if not _inside(get_viewport().get_mouse_position()) or _over_button():
			collecting = false

func _over_button() -> bool:
	var control := get_viewport().gui_get_hovered_control()
	while control != null:
		if control is BaseButton:
			return true
		control = control.get_parent_control()
	return false

func _available() -> bool:
	return view != null and view.run != null and view.world != null and not view.run.paused and not view.run.finish_ready and view.run.state == "active" and view.run.phase == "working"

func _inside(screen: Vector2) -> bool:
	return screen.is_finite() and view.play_area.has_point(screen)

func _locate(screen: Vector2, attack := false) -> Vector2:
	if not _inside(screen):
		return INVALID
	var point: Vector2 = view.camera.to_map(screen)
	if not point.is_finite() or point.x < 0 or point.x >= view.world.width or point.y < 0 or point.y >= view.world.height:
		return INVALID
	var ground: float = view.world.ground_y(point.x)
	if attack and point.y >= ground:
		return INVALID
	return Vector2(clampf(point.x, 0.5, float(view.world.width) - 0.5), clampf(point.y, 0.5, ground - 0.5))

func _aim_at(screen: Vector2) -> void:
	var point := _locate(screen)
	if point == INVALID:
		collecting = false
		return
	if previous == INVALID:
		previous = point
	aim = point
	# Dragging still cancels a contact attack; recovery belongs to the final phase.
	collecting = false

func cancel() -> void:
	_touches.clear()
	_all_touches.clear()
	_touch_blocked = false
	_gesture.clear()
	_mouse_pan = false
	collecting = false
	aim = INVALID
	previous = INVALID
	if view != null and view.run != null:
		view.run.release()

func _gesture_state() -> Dictionary:
	var points: Array = _touches.values()
	if points.size() < 2:
		return {}
	var a: Vector2 = points[0].screen
	var b: Vector2 = points[1].screen
	return {"center": (a + b) / 2.0, "distance": a.distance_to(b)}

func _block_touch_attack() -> void:
	_touch_blocked = true
	collecting = false
	for key in _touches:
		_touches[key].can_tap = false
	_gesture = _gesture_state()
	view.run.release()

func _track_touch(event: InputEventScreenTouch) -> void:
	var point := _locate(event.position, true)
	_touches[event.index] = {"screen": event.position, "down": event.position, "point": point, "can_tap": point != INVALID}
	_mouse_pan = false
	if _all_touches.size() >= 2:
		_block_touch_attack()
	elif not _touch_blocked:
		_aim_at(event.position)

func _release_touch(event: InputEventScreenTouch) -> void:
	var touch: Dictionary = _touches[event.index]
	var accepted_tap: bool = not event.canceled and touch.can_tap and not _touch_blocked and event.position.distance_to(touch.down) <= TAP_DISTANCE
	var end := _locate(event.position, true)
	_touches.erase(event.index)
	collecting = false
	if accepted_tap and end != INVALID and _available():
		# Paid contact taps attack the original contact; drags and extra fingers cancel it.
		view.attack(touch.point)
	_gesture = _gesture_state()
	if _touches.is_empty() and _all_touches.is_empty():
		_touch_blocked = false
		previous = INVALID

func _drag_touch(event: InputEventScreenDrag) -> void:
	var touch: Dictionary = _touches[event.index]
	touch.screen = event.position
	if event.position.distance_to(touch.down) > TAP_DISTANCE:
		touch.can_tap = false
	_touches[event.index] = touch
	if _touches.size() >= 2:
		var next := _gesture_state()
		if not _gesture.is_empty() and not next.is_empty():
			view.camera.pan(next.center - _gesture.center)
			if float(_gesture.distance) > 0 and float(next.distance) > 0:
				view.camera.zoom_at(float(next.distance) / float(_gesture.distance), next.center)
		_gesture = next
		collecting = false
	elif not _touch_blocked:
		_aim_at(event.position)

func _input(event: InputEvent) -> void:
	# A gesture begins only in unhandled input, after GUI controls have had their turn.
	# Once tracked, releases are consumed before GUI so an ending play touch cannot click a button.
	if event is InputEventScreenTouch:
		if event.pressed:
			_all_touches[event.index] = event.position
		else:
			_all_touches.erase(event.index)
			if _all_touches.is_empty() and _touches.is_empty():
				_touch_blocked = false
		if not event.pressed and _touches.has(event.index):
			_release_touch(event)
			get_viewport().set_input_as_handled()
		elif event.pressed and not _touches.is_empty() and not _touches.has(event.index) and _available():
			_track_touch(event)
			_block_touch_attack()
			get_viewport().set_input_as_handled()
	elif event is InputEventScreenDrag and _touches.has(event.index):
		if _available():
			_drag_touch(event)
		else:
			cancel()
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseButton and event.device != -1 and not event.pressed and event.button_index == _mouse_pan_button and _mouse_pan:
		_mouse_pan = false
		collecting = false
		get_viewport().set_input_as_handled()
	elif event is InputEventMouseMotion and event.device != -1 and _mouse_pan:
		if _available():
			_pan_mouse(event)
		else:
			cancel()
		get_viewport().set_input_as_handled()

func _pan_mouse(event: InputEventMouseMotion) -> void:
	var mask := MOUSE_BUTTON_MASK_RIGHT if _mouse_pan_button == MOUSE_BUTTON_RIGHT else MOUSE_BUTTON_MASK_LEFT
	if (event.button_mask & mask) == 0:
		_mouse_pan = false
		collecting = false
		return
	view.camera.pan(event.position - _last_mouse)
	_last_mouse = event.position
	collecting = false

func _unhandled_input(event: InputEvent) -> void:
	if view == null:
		return
	if event is InputEventKey and event.pressed and not event.echo and event.physical_keycode == KEY_SPACE:
		cancel()
		view.app.pause_run()
		get_viewport().set_input_as_handled()
		return
	if not _available():
		collecting = false
		return
	if event is InputEventScreenTouch:
		if event.pressed and not _touches.has(event.index) and _inside(event.position):
			_track_touch(event)
			get_viewport().set_input_as_handled()
		return
	if event is InputEventMouse and event.device == -1:
		return
	if not _touches.is_empty():
		return
	if event is InputEventMouseMotion:
		if _mouse_pan:
			_pan_mouse(event)
			get_viewport().set_input_as_handled()
		elif event.button_mask == 0:
			_aim_at(event.position)
	elif event is InputEventMouseButton and event.pressed and _inside(event.position):
		if event.button_index == MOUSE_BUTTON_RIGHT or (event.button_index == MOUSE_BUTTON_LEFT and event.shift_pressed):
			_mouse_pan = true
			_mouse_pan_button = event.button_index
			_last_mouse = event.position
			collecting = false
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_LEFT:
			var point := _locate(event.position, true)
			if point != INVALID:
				_aim_at(event.position)
				view.attack(point)
			get_viewport().set_input_as_handled()
		elif event.button_index in [MOUSE_BUTTON_WHEEL_UP, MOUSE_BUTTON_WHEEL_DOWN]:
			collecting = false
			var direction := 1.0 if event.button_index == MOUSE_BUTTON_WHEEL_UP else -1.0
			view.camera.zoom_at(exp(direction * 0.2 * maxf(0.1, event.factor)), event.position)
			previous = INVALID
			get_viewport().set_input_as_handled()
