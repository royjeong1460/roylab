extends RefCounted

var world

func setup(owner_world) -> void:
	world = owner_world

func apply(point: Vector2, strength: float, context: Dictionary) -> int:
	world.perf.begin(world.perf.DAMAGE)
	var result: int = apply_unprofiled(point, strength, context)
	world.perf.end()
	return result

func apply_unprofiled(point: Vector2, strength: float, context: Dictionary) -> int:
	var piece = context.get("piece")
	if piece != null and (not is_instance_valid(piece) or not world.pieces.has(piece)):
		return 0
	var direction: Vector2 = context.get("direction", Vector2.UP)
	direction = direction.normalized()
	var radius: float = context.get("radius", 5.0)
	if radius <= 0 or strength <= 0:
		return 0
	var material: Array = world.material(piece)
	var by_id := {}
	for pixel in material:
		by_id[pixel.id] = pixel.q
	var propagates: bool = piece != null and strength >= 1.25
	var axis := Vector2.ZERO
	var reach := 1.0
	if propagates:
		axis = piece.position / world.S - point
		if axis.length() < 1:
			axis = direction
		axis = axis.normalized()
		for pixel in material:
			reach = maxf(reach, (pixel.q - point).dot(axis))
	var changed := 0
	for pixel in material:
		for id in world.neighbors(pixel.id):
			if id < pixel.id or not by_id.has(id):
				continue
			var key: int = world.bond_key(pixel.id, id)
			var old: float = world.bonds.get(key, 0.0)
			if old >= 1:
				continue
			var other: Vector2 = by_id[id]
			var delta: Vector2 = (pixel.q + other) / 2 - point
			var along: float = delta.dot(direction)
			var across: float = direction.cross(delta)
			var distance := Vector2(along * 0.8, across * 1.25).length()
			var depth := delta.dot(axis)
			var first: Vector2 = pixel.q - point
			var second: Vector2 = other - point
			var side_a := axis.cross(first) - sin(first.dot(axis) * 0.45) * 0.3
			var side_b := axis.cross(second) - sin(second.dot(axis) * 0.45) * 0.3
			var on_crack := propagates and depth >= -0.75 and side_a * side_b <= 0
			if distance >= radius and not on_crack:
				continue
			var alignment: float = absf((other - pixel.q).dot(direction))
			var toughness: float = 0.85 + ((((int(pixel.id) + 1) * 31) ^ int(id)) & 15) / 50.0
			var local := strength * 0.58 * maxf(0, 1 - distance / radius) * (0.55 + 0.45 * alignment)
			var propagated := strength * 1.1 * (1 - 0.3 * clampf(depth / reach, 0, 1)) if on_crack else 0.0
			world.bonds[key] = minf(1, old + maxf(local, propagated) / toughness)
			changed += 1
	if changed == 0:
		return 0
	if piece != null:
		piece.last_impact = world.elapsed
		piece.damage = minf(1, piece.damage + strength * 0.1)
		var groups: Array = world.groups(piece.ids)
		if groups.size() > 1:
			world._rebuild(piece, groups)
	else:
		world.check_supports()
	world.events.append({"kind": "impact", "source": context.get("source", "pressure"), "time": world.elapsed, "x": point.x, "y": point.y, "damage": strength, "count": changed})
	return changed

func blast_halo(point: Vector2, radius: float, power: float, efficiency := 1.0) -> int:
	world.perf.begin(world.perf.DAMAGE)
	var result: int = blast_halo_unprofiled(point, radius, power, efficiency)
	world.perf.end()
	return result

func blast_halo_unprofiled(point: Vector2, radius: float, power: float, efficiency := 1.0) -> int:
	# CrumbleWorld.blast: the removed core and the surrounding bond damage are distinct.
	var force := clampf((power / efficiency - 1) * 4, 0, 5)
	var reach := radius + 2 + force * 1.6
	var strength := (0.65 + force * 0.28) * efficiency
	var changed := 0
	var static_changed := false
	for piece in [null] + world.pieces.duplicate():
		if piece != null and not world.pieces.has(piece):
			continue
		var material: Array = world.static_material_in_square(point, reach + 1.0) if piece == null else world.material(piece)
		var by_id := {}
		for pixel in material:
			by_id[pixel.id] = pixel.q
		var local := 0
		for pixel in material:
			for id in world.neighbors(pixel.id):
				if id < pixel.id or not by_id.has(id):
					continue
				var distance: float = ((pixel.q + by_id[id]) / 2).distance_to(point)
				if distance >= reach:
					continue
				var key: int = world.bond_key(pixel.id, id)
				var old: float = world.bonds.get(key, 0.0)
				var toughness: float = 0.85 + ((((int(pixel.id) + 1) * 31) ^ int(id)) & 15) / 50.0
				var added := minf(1 - old, strength * (1 - distance / reach) / toughness)
				if added <= 0:
					continue
				world.bonds[key] = old + added
				local += 1
		if local == 0:
			continue
		changed += local
		if piece != null:
			piece.sleeping = false
			var groups: Array = world.groups(piece.ids)
			if groups.size() > 1:
				world._rebuild(piece, groups)
		else:
			static_changed = true
	if static_changed:
		world.check_supports()
	if changed:
		world.enforce_body_budget()
		world.rasterize()
		world.events.append({"kind": "impact", "source": "blast-halo", "time": world.elapsed, "x": point.x, "y": point.y, "damage": strength, "reach": reach, "count": changed})
	return changed
