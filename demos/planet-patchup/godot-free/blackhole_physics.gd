extends RefCounted

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

func setup(owner_world) -> void:
	world = owner_world

func reset() -> void:
	wear.clear()
	worn_pixels = 0
	_wear_dirty = false
	_live_dirty = false

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
		var near := radius
		var point := Vector2.ZERO
		var found := false
		for id in piece.ids:
			var q: Vector2 = piece.pixel_position(id)
			var distance := q.distance_to(center)
			if distance < near:
				near = distance
				point = q
				found = true
		if not found:
			continue
		var direction: Vector2 = center - piece.position / S
		if direction.length() < 0.25:
			continue
		var acceleration: float = 0.18 * power * (1.0 - 0.5 * near / radius) / (0.5 + piece.mass)
		_impulse(piece, point, direction.normalized() * acceleration * dt * SOURCE_HZ * piece.mass)
	for grain in world.grains:
		if grain.rest:
			continue
		var direction: Vector2 = center - grain.p
		var distance := direction.length()
		if distance < 0.25 or distance > radius:
			continue
		var speed := 55.0 * power * (1.0 - 0.5 * distance / radius) * dt
		var velocity: Vector2 = grain.v + direction / distance * speed
		grain.v = Vector2(clampf(velocity.x, -240.0, 240.0), clampf(velocity.y, -240.0, 240.0))
		grain.rest = false
	var mix: float = well.get("coreMix", world.stats.get("coreMix", 1.0))
	if mix == 0:
		return
	var core_radius := radius * 0.4
	var cycle := sin((float(well.duration) - float(well.remaining)) * 8.0)
	for piece in world.pieces:
		var offset: Vector2 = piece.position / S - center
		var distance := offset.length()
		if distance < 0.25 or distance >= radius:
			continue
		var normal := offset / distance
		var edge := minf(1.0, (radius - distance) / maxf(1.0, radius - core_radius))
		var strength := power * mix
		var velocity: Vector2 = piece.linear_velocity / (S * SOURCE_HZ)
		var outward := maxf(0.0, velocity.dot(normal))
		var brake := outward * (1.0 - exp(-50.0 * strength * edge * dt))
		var acceleration: float = 0.18 * strength / (0.5 + piece.mass)
		var inward := acceleration * 5.0 * minf(1.0, distance / core_radius) * edge * dt * SOURCE_HZ + brake
		var stir := acceleration * 0.8 * maxf(0.0, 1.0 - distance / core_radius) * cycle * dt * SOURCE_HZ
		_impulse(piece, piece.position / S, (-normal * inward + Vector2(-normal.y, normal.x) * stir) * piece.mass)

func strain_supported(well: Dictionary, strength: float) -> void:
	var structures := {}
	for id in world.static_ids():
		var group: int = world._original_groups.get(id, 0)
		var y := floori(float(id) / world.width)
		if not structures.has(group):
			structures[group] = {}
		if not structures[group].has(y):
			structures[group][y] = []
		structures[group][y].append(int(id) % world.width)
	for rows in structures.values():
		var support := {}
		for y in rows:
			var xs: Array = rows[y]
			var points: Array = []
			var n := 0
			while n < xs.size():
				var first: int = xs[n]
				var last := first
				n += 1
				while n < xs.size() and xs[n] == last + 1:
					last = xs[n]
					n += 1
				var point := Vector2((first + last + 1) / 2.0, float(y) + 0.5)
				if point.distance_to(well.p) < float(well.radius):
					points.append(point)
			if points.is_empty():
				continue
			var distance := INF
			for point in points:
				distance = minf(distance, point.distance_to(well.p))
			if support.is_empty() or xs.size() < int(support.width) or (xs.size() == int(support.width) and distance < float(support.distance)):
				support = {"width": xs.size(), "distance": distance, "points": points}
		if support.is_empty():
			continue
		for point in support.points:
			var direction: Vector2 = well.p - point
			if direction.length() < 0.01:
				direction.y = -1.0
			# The source strains bonds; its support solver decides what releases.
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
	var owned := {}
	for id in piece.ids:
		owned[id] = true
	var surface: Array = []
	for id in piece.ids:
		for neighbor in world.neighbors(id):
			if not owned.has(neighbor):
				surface.append({"id": id, "q": piece.pixel_position(id)})
				break
	return surface

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
	var surfaces := {}
	var touching := {}
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
	for sample in pairs.values():
		var a = sample.piece
		var b = sample.other
		var friction := _friction(sample, a, b)
		if friction <= 0:
			continue
		var reduced_mass: float = 1.0 / (1.0 / a.mass + 1.0 / b.mass)
		var pressure := minf(2.0, maxf(0.0, float(sample.normal_impulse)) / (reduced_mass * 0.08))
		var normal: Vector2 = sample.normal
		var tangent := Vector2(-normal.y, normal.x)
		for point in sample.get("points", [sample.point]):
			var well := {}
			for active in wells:
				if point.distance_to(active.p) < float(active.radius) * 0.4:
					well = active
					break
			if well.is_empty():
				continue
			touching[a] = true
			touching[b] = true
			if pressure <= 0:
				continue
			var relative: Vector2 = sample.relative_velocity
			var offset: Vector2 = point - sample.point
			relative += Vector2(-offset.y, offset.x) * (a.angular_velocity - b.angular_velocity)
			var slip := absf(relative.dot(tangent))
			if slip <= 3.0:
				continue
			var amount := minf(48.0, (slip - 3.0) * pressure * 8.0 * minf(1.0, friction / 0.7)) * minf(dt, 1.0 / 30.0)
			for piece in [a, b]:
				if not surfaces.has(piece):
					surfaces[piece] = _surface(piece)
				var closest := -1
				var distance := 2.25
				for cell in surfaces[piece]:
					var d: float = cell.q.distance_to(point)
					if d < distance and cell.q.distance_to(well.p) < float(well.radius) * 0.4:
						distance = d
						closest = cell.id
				if closest < 0:
					continue
				if not additions.has(piece):
					additions[piece] = {}
				additions[piece][closest] = maxf(float(additions[piece].get(closest, 0.0)), amount)
	if not additions.is_empty():
		_wear_dirty = true
	for piece in world.pieces:
		var rubbing: float = piece.get_meta(RUBBING_META, 0.0)
		if additions.has(piece):
			var pixels: Dictionary = additions[piece]
			var total := 0.0
			for amount in pixels.values():
				total += float(amount)
			var scale := minf(1.0, 48.0 * dt / total) * wear_multiplier(piece)
			for id in pixels:
				wear[id] = minf(1.5, float(wear.get(id, 0.0)) + float(pixels[id]) * scale)
			piece.set_meta(RUBBING_META, minf(1.0, rubbing + minf(dt, 1.0 / 30.0)))
		elif not touching.has(piece):
			piece.set_meta(RUBBING_META, maxf(0.0, rubbing - dt))

func _flush_wear() -> void:
	if not _wear_dirty and not _live_dirty:
		return
	var removed := 0
	if _wear_dirty:
		_wear_dirty = false
		for piece in world.pieces.duplicate():
			var remaining: Array = []
			var eroded: Array = []
			for id in piece.ids:
				if float(wear.get(id, 0.0)) >= 1.0:
					eroded.append(id)
				else:
					remaining.append(id)
			if eroded.is_empty():
				continue
			for id in eroded:
				world.emit_grain(id, piece.pixel_position(id), piece.pixel_velocity(id))
			var partitions: Array = world.groups(remaining)
			partitions.sort_custom(func(a, b): return a.size() > b.size())
			world._rebuild(piece, partitions)
			removed += eroded.size()
	var live := {}
	for piece in world.pieces:
		for id in piece.ids:
			live[id] = true
	for id in wear.keys():
		if not live.has(id):
			wear.erase(id)
	_live_dirty = false
	if removed > 0:
		worn_pixels += removed
		world.enforce_body_budget()
		world.rasterize()
		world.events.append({"kind": "contact-wear", "time": world.elapsed, "count": removed, "total": worn_pixels})
