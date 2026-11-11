extends RefCounted

const S := 4.0
const SLOP := 0.25
var _world: Node
var _arena := Rect2()
var _hull := PackedVector2Array()
var _cached_angle := INF
var _cached_bounds := Rect2()
var _last_good := Transform2D.IDENTITY

func setup(body, world: Node, rectangles: Array, origin: Vector2, parent = null) -> void:
	_world = world
	_arena = Rect2(Vector2(0, -world.height * S), Vector2(world.width * S, (world.height + world.floor_y) * S))
	if parent != null:
		_hull = parent._hull
	else:
		var corners := PackedVector2Array()
		for value in rectangles:
			var rect: Rect2 = value
			for corner in [rect.position, Vector2(rect.end.x, rect.position.y), rect.end, Vector2(rect.position.x, rect.end.y)]:
				corners.append((corner - origin) * S)
		_hull = Geometry2D.convex_hull(corners)
	# Authored IDs are inside the map; this pose is also safe for a new split child.
	_last_good = Transform2D(0.0, origin * S)
	var bounds := _offset_bounds(body.rotation)
	if _inside(Rect2(body.position + bounds.position, bounds.size)):
		_last_good = body.transform

func _offset_bounds(angle: float) -> Rect2:
	if angle == _cached_angle:
		return _cached_bounds
	var low := Vector2(INF, INF)
	var high := Vector2(-INF, -INF)
	var turn := Transform2D(angle, Vector2.ZERO)
	for corner in _hull:
		var point := turn * corner
		low = low.min(point)
		high = high.max(point)
	_cached_angle = angle
	_cached_bounds = Rect2(low, high - low)
	return _cached_bounds

func _inside(bounds: Rect2) -> bool:
	return bounds.position.x >= _arena.position.x - SLOP and bounds.position.y >= _arena.position.y - SLOP and bounds.end.x <= _arena.end.x + SLOP and bounds.end.y <= _arena.end.y + SLOP

func constrain(state: PhysicsDirectBodyState2D, body) -> bool:
	var pose := state.transform
	var previous := pose.origin
	var reason := ""
	if not pose.origin.is_finite() or not pose.x.is_finite() or not pose.y.is_finite() or not state.linear_velocity.is_finite() or not is_finite(state.angular_velocity):
		pose = _last_good
		state.linear_velocity = Vector2.ZERO
		state.angular_velocity = 0.0
		reason = "invalid-state"
	var offsets := _offset_bounds(pose.get_rotation())
	if offsets.size.x > _arena.size.x + SLOP or offsets.size.y > _arena.size.y + SLOP:
		pose = Transform2D(_last_good.get_rotation(), pose.origin)
		offsets = _offset_bounds(pose.get_rotation())
		state.angular_velocity = 0.0
		reason = "rotation-fit"
	var bounds := Rect2(pose.origin + offsets.position, offsets.size)
	if not _inside(bounds):
		var corrected := Vector2(clampf(pose.origin.x, _arena.position.x - offsets.position.x, _arena.end.x - offsets.end.x), clampf(pose.origin.y, _arena.position.y - offsets.position.y, _arena.end.y - offsets.end.y))
		var delta := corrected - pose.origin
		var velocity := state.linear_velocity
		if delta.x * velocity.x < 0.0:
			velocity.x = 0.0
		if delta.y * velocity.y < 0.0:
			velocity.y = 0.0
		state.linear_velocity = velocity
		pose.origin = corrected
		reason = "boundary" if reason.is_empty() else reason
	_last_good = pose
	if reason.is_empty():
		return false
	state.transform = pose
	body.constraint_impulse = {"x": 0.0, "y": 0.0, "angle": 0.0}
	body.previous_contacts.clear()
	_world.note_boundary_correction(body.ids.size(), previous, pose.origin, reason)
	return true
