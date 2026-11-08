extends RefCounted

var _native = ClassDB.instantiate("PPEffectKernel")

# Frozen ThreeToolWorld.pull/strainSupported, BlackHoleLabWorld.pull and
# BlackHoleWearWorld.sampleWear/flushWear. Coordinates here are source cells.
const S := 4.0
const SOURCE_HZ := 60.0
const RUBBING_META := "blackhole_rubbing_time"
var world
var wear := {}
var worn_pixels := 0
var _wear_dirty := false
var _live_dirty := false
var _wear_ready := {}

func setup(owner_world) -> void:
	world = owner_world

func reset() -> void:
	wear.clear()
	worn_pixels = 0
	_wear_dirty = false
	_live_dirty = false
	_wear_ready.clear()

func on_piece_removed(_piece) -> void:
	# A rebuild reuses its material IDs; prune only after the children exist.
	_live_dirty = true

func on_well_activated(well: Dictionary) -> void:
	if not well.has("coreMix"):
		well.coreMix = float(world.stats.get("coreMix", 1.0))
	well.strainDelay = 0.2
	for piece in world.pieces:
		piece.set_meta(RUBBING_META, 0.0)
	strain_supported(well, 1.4)

func step(dt: float) -> void:
	if not is_finite(dt) or dt <= 0:
		return
	for well in world.wells:
		_pull(well, minf(dt, float(well.remaining)))
		well.strainDelay = float(well.get("strainDelay", 0.2)) - dt
		if well.strainDelay <= 0.00000001:
			strain_supported(well, 0.6)
			well.strainDelay += 0.2
		well.remaining = maxf(0.0, float(well.remaining) - dt)
	world.wells = world.wells.filter(func(well): return well.remaining > 0.00000001)
	_sample_wear(world.contact_samples, dt)
	_flush_wear()

func _impulse(piece, point: Vector2, source_impulse: Vector2) -> void:
	var impulse: Vector2 = source_impulse * S * SOURCE_HZ
	piece.linear_velocity += impulse / piece.mass
	piece.angular_velocity += (point * S - piece.position).cross(impulse) / piece.inertia
	piece.sleeping = false
	# The source caps point travel after every impulse, including core mixing.
	piece.limit_motion()

func _pull(well: Dictionary, dt: float) -> void:
	if dt <= 0:
		return
	var center: Vector2 = well.p
	var radius: float = well.radius
	var power: float = well.power
	if radius <= 0:
		return
	for piece in world.pieces:
		var pull: Dictionary = _native.pull_piece(world, piece, center, radius, power, dt)
		if not pull.is_empty():
			_impulse(piece, pull.point, pull.impulse)
	_native.pull_grains(world.grains, center, radius, power, dt)
	var mix: float = well.get("coreMix", world.stats.get("coreMix", 1.0))
	if mix == 0:
		return
	var cycle := sin((float(well.duration) - float(well.remaining)) * 8.0)
	for piece in world.pieces:
		var offset: Vector2 = piece.position / S - center
		var distance := offset.length()
		if distance < 0.25 or distance >= radius:
			continue
		var source_impulse: Vector2 = _native.core_impulse(piece.position, piece.linear_velocity, piece.mass, center, radius, power, mix, cycle, dt)
		_impulse(piece, piece.position / S, source_impulse)

func strain_supported(well: Dictionary, strength: float) -> void:
	for point: Vector2 in _native.strain_points(world.static_ids(), world._original_groups, world.width, well.p, well.radius):
		var direction: Vector2 = well.p - point
		if direction.length() < 0.01:
			direction.y = -1.0
		world.apply_source_impact(point, strength * float(well.power), {"piece": null, "direction": direction, "source": "gravity", "radius": 6.0})
	world.enforce_body_budget()

func wear_multiplier(piece) -> float:
	var maximum: float = world.stats.get("wearSpeed", 1.0)
	var start := minf(1.0, maximum)
	return start + (maximum - start) * minf(1.0, float(piece.get_meta(RUBBING_META, 0.0)))

func _live(piece) -> bool:
	return piece != null and is_instance_valid(piece) and world.pieces.has(piece)

func _pair_key(sample: Dictionary, a, b) -> String:
	if sample.has("pair_key"):
		return str(sample.pair_key)
	var lo := mini(a.get_instance_id(), b.get_instance_id())
	var hi := maxi(a.get_instance_id(), b.get_instance_id())
	var points: Array = []
	for point in sample.get("points", [sample.point]):
		points.append("%d,%d" % [roundi(point.x * 1000.0), roundi(point.y * 1000.0)])
	points.sort()
	return "%d:%d:%s" % [lo, hi, ";".join(points)]

func _surface(piece) -> Array:
	return _native.surface(world, piece)

func _friction(sample: Dictionary, a, b) -> float:
	if sample.has("friction"):
		return float(sample.friction)
	var fa: float = a.physics_material_override.friction if a.physics_material_override != null else 1.0
	var fb: float = b.physics_material_override.friction if b.physics_material_override != null else 1.0
	return minf(fa, fb)

func _sample_wear(samples: Array, dt: float) -> void:
	var wells: Array = world.wells.filter(func(well): return well.remaining > 0 and well.power > 0)
	if float(world.stats.get("wearSpeed", 1.0)) == 0 or wells.is_empty():
		for piece in world.pieces:
			piece.set_meta(RUBBING_META, 0.0)
		return
	var additions := {}
	var pairs := {}
	for sample in samples:
		var a = sample.piece
		var b = sample.get("other")
		if not _live(a) or not _live(b) or a == b or sample.get("is_sensor", false):
			continue
		var key := _pair_key(sample, a, b)
		# Both Godot bodies report the same manifold; its impulse is not additive.
		if not pairs.has(key) or float(sample.normal_impulse) > float(pairs[key].normal_impulse):
			pairs[key] = sample
	var sampled: Dictionary = _native.wear_additions(world, pairs.values(), wells, dt)
	additions = sampled.additions
	var touching: Dictionary = sampled.touching
	if not additions.is_empty():
		_wear_dirty = true
	for piece in world.pieces:
		var rubbing: float = piece.get_meta(RUBBING_META, 0.0)
		if additions.has(piece):
			var pixels: Dictionary = additions[piece]
			if _native.apply_wear(wear, pixels, dt, wear_multiplier(piece)):
				_wear_ready[piece.get_instance_id()] = true
			piece.set_meta(RUBBING_META, minf(1.0, rubbing + minf(dt, 1.0 / 30.0)))
		elif not touching.has(piece):
			piece.set_meta(RUBBING_META, maxf(0.0, rubbing - dt))

func _flush_wear() -> void:
	if not _wear_dirty and not _live_dirty:
		return
	world.blast_trace.push("blackhole-wear")
	var removed := 0
	if _wear_dirty:
		_wear_dirty = false
		for piece in world.pieces.duplicate():
			if not _wear_ready.has(piece.get_instance_id()):
				continue
			var partition: Dictionary = _native.split_wear(piece.ids, wear)
			var remaining: Array = partition.remaining
			var eroded: Array = partition.eroded
			if eroded.is_empty():
				continue
			world.blast_trace.pixels("wear", eroded.size(), world.elapsed)
			for id in eroded:
				world.emit_grain(id, piece.pixel_position(id), piece.pixel_velocity(id))
			var partitions: Array = world.groups(remaining)
			partitions.sort_custom(func(a, b): return a.size() > b.size())
			world._rebuild(piece, partitions)
			removed += eroded.size()
		_wear_ready.clear()
	# Partial wear cannot change ownership. Prune only after bodies are removed/rebuilt.
	if _live_dirty and not wear.is_empty():
		_native.prune_wear(wear, world.pieces)
	_live_dirty = false
	if removed > 0:
		worn_pixels += removed
		world.enforce_body_budget()
		world.rasterize()
		world.events.append({"kind": "contact-wear", "time": world.elapsed, "count": removed, "total": worn_pixels})
	world.blast_trace.pop()
