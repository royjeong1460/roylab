extends Camera2D

const CELL_SCALE := 4.0
const CLOSE_PIXELS_PER_CELL := 6.0
const MAX_PIXELS_PER_CELL := 8.0
var world
var area := Rect2()
var fitted := true
var _origin := Vector2.ZERO
var _map_size := Vector2.ONE
var _minimum_zoom := 1.0
var _maximum_zoom := 2.0
var _collection_mode := false

func setup(source_world, play_area: Rect2) -> void:
	world = source_world
	anchor_mode = Camera2D.ANCHOR_MODE_FIXED_TOP_LEFT
	position_smoothing_enabled = false
	rotation_smoothing_enabled = false
	ignore_rotation = true
	enabled = true
	area = play_area
	_map_size = Vector2(float(world.width), float(world.height)) * CELL_SCALE
	_limits()
	fit()
	make_current()

func _limits() -> void:
	if area.size.x <= 0 or area.size.y <= 0:
		return
	_minimum_zoom = minf(area.size.x / _map_size.x, area.size.y / _map_size.y)
	_maximum_zoom = maxf(MAX_PIXELS_PER_CELL / CELL_SCALE, _minimum_zoom)

func set_area(play_area: Rect2) -> void:
	if not play_area.position.is_finite() or not play_area.size.is_finite() or play_area.size.x <= 0 or play_area.size.y <= 0:
		return
	var center := _origin + area.size / zoom / 2.0
	area = play_area
	_limits()
	if _collection_mode:
		_sync_transform()
		return
	if fitted:
		fit()
	else:
		zoom = Vector2.ONE * clampf(zoom.x, _minimum_zoom, _maximum_zoom)
		_origin = center - area.size / zoom / 2.0
		_clamp_and_sync()

func fit() -> void:
	_limits()
	zoom = Vector2.ONE * _minimum_zoom
	_origin = Vector2.ZERO
	fitted = true
	_clamp_and_sync()

func begin_collection() -> void:
	if _collection_mode: return
	_collection_mode = true

func toggle_fit() -> void:
	if _collection_mode: return
	if not fitted:
		fit()
		return
	zoom = Vector2.ONE * clampf(CLOSE_PIXELS_PER_CELL / CELL_SCALE, _minimum_zoom, _maximum_zoom)
	var focus := _map_size.x / 2.0
	if world != null:
		var preview: Array = world.fixture.get("preview", [])
		if not preview.is_empty() and preview[0] is Dictionary:
			focus = float(preview[0].get("x", float(world.width) / 2.0)) * CELL_SCALE
	_origin = Vector2(focus - area.size.x / zoom.x / 2.0, _map_size.y - area.size.y / zoom.y)
	_clamp_and_sync()

func to_map(screen: Vector2) -> Vector2:
	return (_origin + (screen - area.position) / zoom) / CELL_SCALE

func map_to_screen(point: Vector2) -> Vector2:
	return area.position + (point * CELL_SCALE - _origin) * zoom

func visible_map_rect() -> Rect2:
	return Rect2(_origin / CELL_SCALE, area.size / zoom / CELL_SCALE).intersection(Rect2(Vector2.ZERO, _map_size / CELL_SCALE))

func pan(screen_delta: Vector2) -> void:
	if _collection_mode or not screen_delta.is_finite():
		return
	_origin -= screen_delta / zoom
	_clamp_and_sync()

func zoom_at(factor: float, screen: Vector2) -> void:
	if _collection_mode or not is_finite(factor) or factor <= 0 or not screen.is_finite():
		return
	var anchor := _origin + (screen - area.position) / zoom
	zoom = Vector2.ONE * clampf(zoom.x * factor, _minimum_zoom, _maximum_zoom)
	_origin = anchor - (screen - area.position) / zoom
	_clamp_and_sync()

func _clamp_and_sync() -> void:
	var visible := area.size / zoom
	for axis in range(2):
		_origin[axis] = (_map_size[axis] - visible[axis]) / 2.0 if visible[axis] >= _map_size[axis] else clampf(_origin[axis], 0.0, _map_size[axis] - visible[axis])
	# Spare portrait height belongs above the map, not in an empty ground band below it.
	if visible.y >= _map_size.y:
		_origin.y = _map_size.y - visible.y
	fitted = absf(zoom.x - _minimum_zoom) < 0.0001
	_sync_transform()

func _sync_transform() -> void:
	# Only Camera2D moves: map bodies and their physical ancestors retain identity transforms.
	global_position = _origin - area.position / zoom
	offset = Vector2.ZERO
	force_update_scroll()
