extends RefCounted

var _native = ClassDB.instantiate("PPEffectKernel")

var world

func setup(owner_world) -> void:
	world = owner_world

func apply(point: Vector2, strength: float, context: Dictionary) -> int:
	world.perf.begin(world.perf.DAMAGE)
	world.blast_trace.push(str(context.get("source", "pressure")))
	var result: int = apply_unprofiled(point, strength, context)
	world.blast_trace.pop()
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
	var material: Array = context._material if context.has("_material") else world.material(piece)
	var changed: int = _native.pressure_bonds(material, world.bonds, world.width, world.cells.size(), point, strength, direction, radius, piece != null and strength >= 1.25, piece.position if piece != null else Vector2.ZERO, context.get("scope_center", point), float(context.get("scope_radius", -1.0)))
	if changed == 0:
		return 0
	if piece != null:
		piece.last_impact = world.elapsed
		piece.damage = minf(1, piece.damage + strength * 0.1)
		# Section release can create a disconnected body; keep the legacy scan even
		# when this hit did not cross a bond threshold.
		var groups: Array = world.groups(piece.ids)
		if groups.size() > 1:
			world._rebuild(piece, groups)
	else:
		world.check_supports()
	world.events.append({"kind": "impact", "source": context.get("source", "pressure"), "time": world.elapsed, "x": point.x, "y": point.y, "damage": strength, "count": changed})
	return changed

func blast_halo(point: Vector2, radius: float, power: float, efficiency := 1.0, scope_center := Vector2.ZERO, scope_radius := -1.0) -> int:
	world.perf.begin(world.perf.DAMAGE)
	world.blast_trace.push("blast-halo")
	var result: int = blast_halo_unprofiled(point, radius, power, efficiency, scope_center, scope_radius)
	world.blast_trace.pop()
	world.perf.end()
	return result

func blast_halo_unprofiled(point: Vector2, radius: float, power: float, efficiency := 1.0, scope_center := Vector2.ZERO, scope_radius := -1.0) -> int:
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
		var local: int = _native.halo_bonds(material, world.bonds, world.width, world.cells.size(), point, reach, strength, scope_center, scope_radius)
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
	world.blast_trace.halo(reach, strength, changed)
	if changed:
		world.enforce_body_budget()
		world.rasterize()
		world.events.append({"kind": "impact", "source": "blast-halo", "time": world.elapsed, "x": point.x, "y": point.y, "damage": strength, "reach": reach, "count": changed})
	return changed
