extends Node2D

const CACHE_KEY := "local_outline_segments_v3"
const OUTER := [Color("ffe3a1"), Color("fae8b3")]
const INNER := [Color("082b32"), Color("10343b")]
const OUTER_WIDTH := [5.6, 4.6]
const INNER_WIDTH := [3.0, 2.4]
var _segments := [PackedVector2Array(), PackedVector2Array()]

func configure(source: Mesh, groups: Array, center: Vector2, pixel_scale: float) -> void:
	if source.has_meta(CACHE_KEY):
		_segments = source.get_meta(CACHE_KEY)
	else:
		for group in groups:
			if group.count > 144:
				continue
			var tier := 0 if group.count <= 36 else 1
			var horizontal := {}
			var vertical := {}
			for value in group.rectangles:
				var rect: Rect2 = value
				var end := rect.end
				_edge(horizontal, rect.position.y, rect.position.x, end.x)
				_edge(horizontal, end.y, rect.position.x, end.x)
				_edge(vertical, rect.position.x, rect.position.y, end.y)
				_edge(vertical, end.x, rect.position.y, end.y)
			_append_edges(horizontal, false, center, pixel_scale, tier)
			_append_edges(vertical, true, center, pixel_scale, tier)
		source.set_meta(CACHE_KEY, _segments)
	queue_redraw()

func _edge(lines: Dictionary, at: float, start: float, end: float) -> void:
	if not lines.has(at):
		lines[at] = {}
	var changes: Dictionary = lines[at]
	changes[start] = int(changes.get(start, 0)) + 1
	changes[end] = int(changes.get(end, 0)) - 1

func _append_edges(lines: Dictionary, vertical: bool, center: Vector2, pixel_scale: float, tier: int) -> void:
	var segments: PackedVector2Array = _segments[tier]
	for at in lines:
		var changes: Dictionary = lines[at]
		var positions: Array = changes.keys()
		positions.sort()
		var coverage := 0
		var previous := 0.0
		for value in positions:
			var coordinate := float(value)
			# Shared edges occur twice; only the actual silhouette has odd coverage.
			if coverage % 2 == 1 and coordinate > previous:
				var start := Vector2(float(at), previous) if vertical else Vector2(previous, float(at))
				var end := Vector2(float(at), coordinate) if vertical else Vector2(coordinate, float(at))
				segments.append((start - center) * pixel_scale)
				segments.append((end - center) * pixel_scale)
			coverage += int(changes[value])
			previous = coordinate
	_segments[tier] = segments

func _draw() -> void:
	for tier in range(_segments.size()):
		if not _segments[tier].is_empty():
			draw_multiline(_segments[tier], OUTER[tier], OUTER_WIDTH[tier])
			draw_multiline(_segments[tier], INNER[tier], INNER_WIDTH[tier])
