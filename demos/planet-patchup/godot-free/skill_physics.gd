extends RefCounted

var _native = ClassDB.instantiate("PPEffectKernel")

# ArchWorld + IdeaWorld + ActiveIdeaWorld; paid Aftershock uses aftershock.js.
# All positions and projectile velocities are logical cells and cells/second.
const Catalog = preload("res://campaign/catalog.gd")
const PASSIVES := ["aftershock", "relay", "slam", "expand", "wave"]
const ACTIVES := ["orbital", "seismic", "gravity", "sonic", "recharge"]
const TRACKS := {
	"battery": [60.0, 5.0], "blastForce": [1.0, 0.05],
	"blastRadius": [3.0, 0.1], "blastReach": [18.0, 0.5],
	"wellPull": [1.0, 0.05], "wellReach": [30.0, 0.5],
	"wellDuration": [2.0, 0.1], "mix": [1.0, 0.25],
	"wear": [1.0, 0.25], "collectBatch": [20.0, 2.0],
	"collectInterval": [0.25, -0.01], "suction": [20.0, 8.0],
	"range": [12.0, 0.5],
}

var world: Node
var equipped := ""
var level := 0
var orbital_level := 0
var passive_ids: Array = []
var active_ids: Array = []
var levels: Dictionary = {}
var counts: Dictionary = {}
var triggers: Dictionary = {}
var uses: Dictionary = {}
var edition := "paid"
var clock := 0.0
var passive_count := 0
var passive_triggers := 0
var effective_attacks := 0
var pending: Array = []
var marks: Array = []
var fields: Array = []
var active: Dictionary = {}
var active_used := false
var history: Array = []

func setup(owner_world: Node) -> void:
	world = owner_world
	reset()

func reset() -> void:
	clock = 0.0
	passive_count = 0
	passive_triggers = 0
	effective_attacks = 0
	pending.clear()
	marks.clear()
	fields.clear()
	active.clear()
	active_used = false
	history.clear()
	counts.clear()
	triggers.clear()
	uses.clear()
	for id in passive_ids:
		counts[id] = 0
		triggers[id] = 0
	for id in active_ids:
		uses[id] = false

func configure_loadout(passives: Array, actives: Array, skill_levels: Dictionary, source_edition := "paid") -> void:
	edition = "free" if source_edition == "free" else "paid"
	passive_ids.clear()
	active_ids.clear()
	levels.clear()
	for id in PASSIVES + ACTIVES:
		var maximum := 10 if id == "aftershock" and edition == "paid" else 1 if id == "recharge" else 5
		levels[id] = maxi(0, int(skill_levels.get(id, 0))) if edition == "paid" else clampi(int(skill_levels.get(id, 0)), 0, maximum)
	for id in passives:
		if id in PASSIVES and levels[id] > 0 and not passive_ids.has(id) and passive_ids.size() < 2:
			passive_ids.append(id)
	for id in actives:
		if id in ACTIVES and levels[id] > 0 and not active_ids.has(id) and active_ids.size() < 2:
			active_ids.append(id)
	equipped = str(passive_ids[0]) if not passive_ids.is_empty() else ""
	level = int(levels.get(equipped, 0))
	orbital_level = int(levels.get("orbital", 0)) if active_ids.has("orbital") else 0
	reset()

func configure(skill: String, skill_level: int, source_edition: String = "paid") -> void:
	edition = "free" if source_edition == "free" else "paid"
	if skill == "orbital":
		configure_orbital(skill_level)
		return
	var next_levels := levels.duplicate()
	next_levels[skill] = skill_level
	configure_loadout([skill], active_ids.duplicate(), next_levels, source_edition)

func configure_orbital(skill_level: int) -> void:
	var next_levels := levels.duplicate()
	next_levels.orbital = skill_level
	configure_loadout(passive_ids.duplicate(), ["orbital"], next_levels, edition)

static func profile_stats(upgrades: Dictionary, _edition: String = "paid") -> Dictionary:
	# Both editions share the formula; paid only raises the purchase caps.
	var result := {}
	for id in TRACKS:
		result[id] = TRACKS[id][0] + TRACKS[id][1] * float(upgrades.get(id, 0))
	var auto_collect := int(upgrades.get("collectBatch", 0)) + int(upgrades.get("collectInterval", 0)) > 0
	result.merge({
		"capacity": result.battery, "bombRadius": result.blastRadius,
		"bombPower": result.blastForce, "bombCost": 12.0, "gravityCost": 24.0,
		"gravityPower": 0.2 * result.wellPull, "gravityRadius": result.wellReach,
		"gravityDuration": result.wellDuration, "coreMix": result.mix,
		"wearSpeed": result.wear, "autoCollect": auto_collect,
		"suctionRate": result.suction, "suctionRadius": result.range,
		"autoCollectRate": result.collectBatch / result.collectInterval / 44.0 if auto_collect else 0.0,
	})
	return result

func threshold(id := "") -> int:
	if id.is_empty():
		id = equipped
	var skill_level := int(levels.get(id, 0))
	if skill_level <= 0:
		return 0
	if id == "aftershock":
		return 3 if edition == "paid" or skill_level == 5 else 4
	return int(_effect(id).get("threshold", 0))

func idea_gain(id := "") -> float:
	if id.is_empty():
		id = equipped
	if id == "aftershock":
		return 1.0 + 0.1 * mini(3, maxi(0, int(levels.get(id, 0)) - 1))
	return float(_effect(id).get("gain", 1.0))

func _effect(id: String) -> Dictionary:
	return Catalog.effect_stats(id, int(levels.get(id, 0)))

func busy() -> bool:
	return not pending.is_empty() or not marks.is_empty() or not fields.is_empty() or not active.is_empty()

func clear_effects() -> void:
	pending.clear()
	marks.clear()
	fields.clear()
	active.clear()

func _point(bomb: Dictionary) -> Vector2:
	return bomb.p if bomb.has("p") else Vector2(float(bomb.get("x", 0.0)), float(bomb.get("y", 0.0)))

func _schedule(kind: String, delay: float, point: Vector2, radius: float, power: float, extra: Dictionary = {}) -> void:
	if pending.size() < 48:
		var action := {"kind": kind, "remaining": delay, "p": point, "radius": radius, "power": power}
		action.merge(extra)
		pending.append(action)

func on_primary_blast(bomb: Dictionary, effective: bool) -> void:
	# The caller measures actual direct breakage or body impulse, not grain motion.
	if not effective or bomb.get("secondary", false) or bomb.get("ideaSecondary", false):
		return
	effective_attacks += 1
	for id in passive_ids:
		var trigger := threshold(id)
		if trigger == 0:
			continue
		counts[id] += 1
		if counts[id] >= trigger:
			counts[id] = 0
			triggers[id] += 1
			_trigger_passive(id, bomb)
	passive_count = int(counts.get(equipped, 0))
	passive_triggers = int(triggers.get(equipped, 0))

func _trigger_passive(id: String, bomb: Dictionary) -> void:
	var point := _point(bomb)
	var gain := idea_gain(id)
	var tuning := _effect(id)
	if id == "aftershock":
		if edition == "paid":
			_paid_aftershock(bomb, point, int(levels[id]))
		else:
			for i in range(2):
				var x := clampf(point.x + (-8.0 if i == 0 else 8.0), 1.0, world.width - 1.0)
				_schedule("echo", 0.4 + i * 0.3, Vector2(x, maxf(1.0, point.y - 2.0)), 2.5, 0.55 * gain)
	elif id in ["relay", "wave"]:
		var chosen = null
		for piece in world.pieces:
			if piece.ids.size() < 8 or (chosen != null and piece.ids.size() <= chosen.ids.size()):
				continue
			if _native.near_piece(world, piece, point, float(world.stats.get("blastReach", 18.0))):
				chosen = piece
		if chosen != null:
			var ids: Dictionary = _native.owned(chosen.ids)
			marks.append({"kind": id, "ids": ids, "gain": gain, "tuning": tuning, "remaining": 12.0, "armed_at": clock + 0.18, "used": false})
			marks = marks.slice(maxi(0, marks.size() - 8))
	elif id == "slam":
		var radius := maxf(16.0, float(world.stats.get("blastReach", 18.0)))
		var ids := {}
		for piece in _near_pieces(point, radius):
			ids.merge(_native.owned(piece.ids), true)
		ids.merge(_native.grain_ids(world.grains, point, radius), true)
		_kick(point, radius, Vector2.UP, tuning.lift_power)
		_schedule("slam", tuning.delay, point, radius + 12.0, tuning.slam_power, {"ids": ids})
		_visual("slam-up", point, radius, tuning.delay)
	elif id == "expand" and fields.size() < 4:
		fields.append({"kind": "expand", "p": point, "age": 0.0, "duration": tuning.duration, "radius": tuning.start_radius, "max_radius": tuning.radius, "tick": 0.0, "gain": gain, "tuning": tuning})
	world.events.append({"kind": "skill-trigger", "id": id, "p": point})

func _paid_aftershock(bomb: Dictionary, point: Vector2, skill_level: int) -> void:
	var radius := 2.5
	var primary_radius := float(bomb.get("radius", world.stats.get("bombRadius", 3.0)))
	var inner := primary_radius + 1.0
	var outer := primary_radius + 6.0
	var rotation: float = world.rng.randf() * TAU
	var candidates: Array = []
	for i in range(64):
		var angle := rotation + i * TAU / 64.0
		var distance := sqrt(inner * inner + world.rng.randf() * (outer * outer - inner * inner))
		var candidate := point + Vector2.from_angle(angle) * distance
		if candidate.x >= 1.0 and candidate.x <= world.width - 1.0 and candidate.y >= 1.0 and candidate.y <= world.ground_y(candidate.x) - 1.0:
			candidates.append(candidate)
	var chosen: Array = []
	var tuning := Catalog.effect_stats("aftershock", skill_level)
	var count := int(tuning.echoes)
	for i in range(count):
		var available := _spaced(candidates, chosen, radius * 2.0)
		if available.is_empty():
			available = _spaced(candidates, chosen, 1.0)
		if available.is_empty():
			break
		chosen.append(available[floori(world.rng.randf() * available.size())])
	var power := float(bomb.get("power", world.stats.get("bombPower", 1.0))) * float(tuning.power)
	for i in range(chosen.size()):
		_schedule("echo", 0.4 + i * 0.3, chosen[i], radius, power)

func _spaced(candidates: Array, chosen: Array, gap: float) -> Array:
	return _native.spaced(candidates, chosen, gap)

func mark_has_piece(mark: Dictionary, piece) -> bool:
	# Pixel membership is immutable for a live piece; fractures create new instances.
	if not mark.has("_piece_owners"):
		mark._piece_owners = {}
	var owners: Dictionary = mark._piece_owners
	var instance_id: int = piece.get_instance_id()
	if not owners.has(instance_id):
		owners[instance_id] = _native.intersects(piece.ids, mark.ids)
	return owners[instance_id]

func on_piece_removed(piece) -> void:
	var instance_id: int = piece.get_instance_id()
	for mark in marks:
		if mark.has("_piece_owners"):
			mark._piece_owners.erase(instance_id)

func on_contact(hit: Dictionary) -> void:
	# Call before fracturing/removing the contact body. Marks survive via original IDs.
	var piece = hit.get("piece")
	if piece == null or not is_instance_valid(piece) or float(hit.get("speed", 0.0)) < 12.0:
		return
	for mark in marks:
		if mark.used or clock < mark.armed_at or mark.remaining <= 0.0:
			continue
		if mark.kind == "wave" and (hit.get("collider") != world.boundary or hit.point.y < world.ground_y(hit.point.x) - 3.0 or hit.get("normal", Vector2.ZERO).y >= -0.35):
			continue
		if mark_has_piece(mark, piece):
			mark.used = true
			var point: Vector2 = hit.point
			point.y = minf(world.ground_y(point.x) - 1.0, point.y)
			if mark.kind == "relay":
				_schedule("relay-hit", 0.0, point, 3.0, mark.tuning.power)
			else:
				_schedule("wave-start", 0.0, point, 8.0, mark.gain, {"tuning": mark.tuning})

func _structure_material() -> Array:
	return _native.structure_material(world)

func can_activate(id: String) -> bool:
	if world == null or world.paused or world.settled or world.charge <= 0.00000001 or not active_ids.has(id) or bool(uses.get(id, false)):
		return false
	if id == "recharge":
		return world.charge < float(world.stats.capacity) - 0.00000001
	return active.is_empty()

func activate(id := "") -> bool:
	if id.is_empty() and not active_ids.is_empty():
		id = str(active_ids[0])
	if not can_activate(id):
		return false
	if id == "recharge":
		var before: float = world.charge
		world.charge = minf(float(world.stats.capacity), world.charge + float(world.stats.capacity) * float(_effect(id).recharge_fraction))
		uses[id] = true
		active_used = bool(uses.get("orbital", false))
		world.events.append({"kind": "skill-recharge", "id": id, "amount": world.charge - before, "p": Vector2(world.width / 2.0, 8.0)})
		_visual("recharge", Vector2(world.width / 2.0, 8.0), 5.0, 0.7)
		return true
	var material := _structure_material()
	if material.is_empty():
		return false
	# Quantiles are captured once at deployment; later fracture does not retarget.
	var geometry: Dictionary = _native.bounds(material)
	var xs: Array = geometry.xs
	var skill_level := int(levels.get(id, 0))
	var tuning := _effect(id)
	var count := int(tuning.payloads) if id == "orbital" else int(tuning.get("targets", tuning.get("steps", 12)))
	var left := float(xs[0])
	var right := float(xs[-1])
	var top: float = geometry.top
	var targets: Array = []
	for i in range(count):
		targets.append(float(xs[floori(float(i) * (xs.size() - 1) / (count - 1))]) if id == "orbital" else lerpf(left, right, float(i) / (count - 1)))
	active = {"id": id, "level": skill_level, "age": 0.0, "next": 0, "targets": targets, "projectiles": [], "force": tuning.gain, "tuning": tuning, "left": left, "right": right, "top": top, "duration": float(tuning.duration) if id == "gravity" else float(tuning.duration) + 1.15 if id == "sonic" else 5.0, "sweep_duration": tuning.get("duration", 1.65), "pressure": 0.0, "next_press": 0.6, "hit_groups": {}}
	uses[id] = true
	active_used = bool(uses.get("orbital", false))
	world.events.append({"kind": "sound-active-deploy", "id": id})
	history.clear()
	return true

func activate_orbital() -> bool:
	return activate("orbital")

func _near_pieces(point: Vector2, radius: float) -> Array:
	return _native.near_pieces(world, point, radius)

func _impulse(piece, point: Vector2, source_impulse: Vector2) -> void:
	if not is_instance_valid(piece) or not world.pieces.has(piece):
		return
	var impulse: Vector2 = source_impulse * world.S * 60.0
	piece.linear_velocity += impulse / piece.mass
	piece.angular_velocity += (point * world.S - piece.position).cross(impulse) / piece.inertia
	piece.sleeping = false
	piece.limit_motion()

func _kick(point: Vector2, radius: float, direction: Vector2, strength: float, ids: Variant = null) -> void:
	var pieces: Array = _near_pieces(point, radius) if ids == null else world.pieces.filter(func(piece): return _native.intersects(piece.ids, ids))
	for piece in pieces:
		var away: Vector2 = (piece.position / world.S - point).normalized() if direction == Vector2.ZERO else direction
		_impulse(piece, piece.position / world.S, away * strength * piece.mass / (0.6 + piece.mass))
	_native.kick_grains(world.grains, point, radius, direction, strength, ids)

func _pressure(point: Vector2, radius: float, strength: float, detail := false) -> void:
	var stamp: int = Time.get_ticks_usec() if detail else 0
	var candidates: Array = [null] + _near_pieces(point, radius)
	if detail:
		world.perf.note_detail("pressure_candidates", Time.get_ticks_usec() - stamp)
	for piece in candidates:
		if piece != null and (not is_instance_valid(piece) or not world.pieces.has(piece)):
			continue
		if detail:
			stamp = Time.get_ticks_usec()
		var material: Array = world.material(piece)
		var found: Dictionary = _native.nearest(material, point, radius, false)
		if detail:
			world.perf.note_detail("pressure_nearest", Time.get_ticks_usec() - stamp)
		if not found.is_empty():
			var closest: Vector2 = found.q
			var direction := closest - point
			if absf(direction.y) < 0.00000001:
				direction.y = -0.1
			if detail:
				stamp = Time.get_ticks_usec()
			# Nearest is read-only; apply consumes this material before any rebuild.
			world.impact_physics.apply(closest, strength, {"piece": piece, "direction": direction, "source": "pressure", "radius": 4.0, "_material": material, "scope_center": point, "scope_radius": radius})
			if detail:
				world.perf.note_detail("pressure_apply", Time.get_ticks_usec() - stamp)

func _visual(kind: String, point: Vector2, radius: float, life := 0.6) -> void:
	world.events.append({"kind": "skill-vfx", "effect": kind, "p": point, "radius": radius, "life": life})

func _record(action: Dictionary) -> void:
	var entry := action.duplicate()
	entry.time = clock
	history.append(entry)
	if history.size() > 128:
		history.pop_front()

func _secondary_blast(action: Dictionary) -> void:
	var bomb := action.duplicate()
	bomb.secondary = true
	bomb.ideaSecondary = true
	var skill_id: String = {"echo": "aftershock", "relay-hit": "relay", "orbital": "orbital", "expand": "expand"}.get(str(action.get("kind", "")), "")
	if edition == "paid" and not skill_id.is_empty():
		var maximum := 10 if skill_id == "aftershock" else 5
		var efficiency := 1.0 + 0.08 * sqrt(float(maxi(0, int(levels.get(skill_id, 0)) - maximum)))
		if skill_id == "aftershock":
			efficiency *= float(world.stats.get("blastFractureEfficiency", 1.0))
		bomb.fracture_efficiency = efficiency
	world.blast(bomb)
	_record({"kind": action.get("kind", "orbital"), "p": action.p})

func _orbital_columns() -> Dictionary:
	return _native.columns(world)

func _orbital_step(dt: float) -> void:
	if active.is_empty():
		return
	while active.next < active.targets.size() and active.age >= 0.45 + active.next * 0.42:
		var heavy: bool = active.next == active.targets.size() - 1
		active.projectiles.append({"x": active.targets[active.next], "y": -8.0, "vy": 15.0, "radius": 5.0 if heavy else 3.0, "power": (2.0 if heavy else 1.0) * active.force, "heavy": heavy})
		active.next += 1
		world.events.append({"kind": "sound-orbital-fall", "heavy": heavy})
	if active.projectiles.is_empty():
		return
	var columns := _orbital_columns()
	var survivors: Array = []
	for index in range(active.projectiles.size()):
		var projectile: Dictionary = active.projectiles[index]
		var previous: float = projectile.y
		projectile.vy = minf(230.0, projectile.vy + 130.0 * dt)
		projectile.y += projectile.vy * dt
		var hit: float = _native.orbital_hit(columns, projectile.x, projectile.radius, previous, projectile.y, world.ground_y(projectile.x))
		if hit <= projectile.y + projectile.radius:
			_secondary_blast({"kind": "orbital", "vfx": "orbital", "p": Vector2(projectile.x, minf(world.ground_y(projectile.x) - 1.0, hit)), "radius": projectile.radius, "power": projectile.power, "heavy": projectile.heavy})
			# Later projectiles need the new geometry; the next tick rebuilds its own index.
			if index + 1 < active.projectiles.size():
				columns = _orbital_columns()
		else:
			survivors.append(projectile)
	active.projectiles = survivors
	if active.next == active.targets.size() and survivors.is_empty():
		active.clear()

func _seismic_step() -> void:
	var total: int = active.targets.size() * (2 if active.tuning.followup_power > 0 else 1)
	while active.next < total and active.age >= 0.4 + active.next * 0.15:
		var followup: bool = active.next >= active.targets.size()
		var force: float = active.force * (active.tuning.followup_power if active.next >= active.targets.size() else 1.0)
		var x: float = active.targets[active.next % active.targets.size()]
		active.next += 1
		var span := maxf(5.0, (active.right - active.left) / active.targets.size()) * float(active.tuning.coverage)
		var contacts: Dictionary = _native.seismic(_structure_material(), x, span, world)
		for contact in contacts.values():
			world.impact_physics.apply(contact.q, 4.0 * force, {"piece": contact.piece, "direction": Vector2.UP, "source": "seismic", "radius": 9.0})
			for piece in _near_pieces(contact.q, 12.0):
				_impulse(piece, contact.q, Vector2.UP * piece.mass * 0.4 * force)
		var point := Vector2(x, world.ground_y(x) - 1.0)
		_record({"kind": "seismic", "p": point, "contacts": contacts.size(), "force": force})
		world.events.append({"kind": "sound-seismic-strike", "followup": followup})
		_visual("seismic", point, span * 2.0)
	if active.next == total and active.age > 0.4 + (total - 1) * 0.15 + 0.6:
		active.clear()

func _sonic_step() -> void:
	var center: float = (active.left + active.right) / 2.0
	var half: float = (active.right - active.left) / 2.0
	var steps := int(active.tuning.steps)
	var span := maxf(3.0, half / steps)
	while active.next < steps and active.age >= 0.4 + active.next * active.sweep_duration / (steps - 1):
		var progress: float = float(active.next) / (steps - 1)
		active.next += 1
		for side in [-1.0, 1.0]:
			var x: float = center + side * half * (1.0 - progress)
			var contacts: Dictionary = _native.sonic(_structure_material(), x, span, side, center, world._original_groups, active.hit_groups)
			for key in contacts:
				var contact: Dictionary = contacts[key]
				active.hit_groups[key] = true
				var direction := Vector2(-side, 0.0)
				world.impact_physics.apply(contact.q, active.tuning.pressure, {"piece": contact.piece, "direction": direction, "source": "sonic", "radius": 5.0})
				# Original assembly IDs bound each inward strike across later fragments.
				for piece in world.pieces:
					if side * (piece.position.x / world.S - center) >= 0.0 and _native.group_member(piece.ids, world._original_groups, contact.group):
						_impulse(piece, piece.position / world.S, direction * piece.mass * active.tuning.inward_power)
			_record({"kind": "sonic", "p": Vector2(x, active.top), "direction": -side, "contacts": contacts.size()})
	if active.age > active.duration:
		active.clear()

func _gravity_step(dt: float) -> void:
	active.pressure = clampf(active.age - 0.6, 0.0, 1.0) * clampf((active.duration - active.age) / 0.5, 0.0, 1.0)
	var added: float = active.tuning.down_acceleration * active.pressure * dt
	for piece in world.pieces:
		piece.sleeping = false
		piece.linear_velocity.y += added * world.S
		piece.limit_motion()
	_native.gravity_grains(world.grains, added)
	if active.age >= active.next_press and active.pressure > 0.0 and not world.contact_samples.is_empty():
		var supported: Dictionary = world.structure_physics.support_bodies()
		var contacts: Dictionary = _native.gravity_contacts(world.contact_samples, world.pieces, supported, world.static_body)
		if not contacts.is_empty():
			active.next_press = active.age + 0.25
		for piece in contacts:
			if not is_instance_valid(piece) or not world.pieces.has(piece):
				continue
			var contact: Dictionary = contacts[piece]
			var strength: float = active.tuning.contact_fatigue * active.pressure * minf(2.0, sqrt(piece.ids.size() / 200.0))
			world.impact_physics.apply(contact.p, strength, {"piece": piece, "direction": Vector2.UP, "source": "gravity", "radius": 2.5})
			if contact.base != null and is_instance_valid(contact.base) and world.pieces.has(contact.base):
				world.impact_physics.apply(contact.p, strength, {"piece": contact.base, "direction": Vector2.DOWN, "source": "gravity", "radius": 2.5})
			elif contact.static:
				world.impact_physics.apply(contact.p, strength, {"direction": Vector2.DOWN, "source": "gravity", "radius": 2.5})
			_record({"kind": "compression", "p": contact.p, "strength": strength})
			_visual("compression", contact.p, 5.0)
	if active.age >= active.duration:
		_record({"kind": "gravity"})
		active.clear()

func _active_step(dt: float) -> void:
	if active.is_empty():
		return
	active.age += dt
	match active.id:
		"orbital": _orbital_step(dt)
		"seismic": _seismic_step()
		"sonic": _sonic_step()
		"gravity": _gravity_step(dt)

func _execute(action: Dictionary) -> void:
	match action.kind:
		"echo", "relay-hit":
			_secondary_blast(action)
		"slam":
			_kick(action.p - Vector2(0.0, 10.0), action.radius + 15.0, Vector2.DOWN, action.power, action.ids)
			_visual("slam-down", action.p - Vector2(0.0, 10.0), action.radius, 0.8)
			_record({"kind": "slam", "p": action.p})
		"wave-start":
			for i in range(1, int(action.tuning.pulses_per_side) + 1):
				for side in [-1.0, 1.0]:
					var x := clampf(action.p.x + side * i * action.tuning.spacing, 1.0, world.width - 1.0)
					_schedule("wave-pulse", i * action.tuning.pulse_interval, Vector2(x, world.ground_y(x) - 1.0), 8.0, action.power, {"tuning": action.tuning})
			_visual("wave", action.p, 7.0)
		"wave-pulse":
			_pressure(action.p, action.radius, action.tuning.pressure)
			_kick(action.p, action.radius, Vector2.UP, action.tuning.upward_power)
			_visual("wave", action.p, 7.0, 0.5)
			_record({"kind": "wave", "p": action.p})

func _fields_step(dt: float) -> void:
	world.perf.begin(world.perf.EXPAND)
	_fields_step_unprofiled(dt)
	world.perf.end()

func _fields_step_unprofiled(dt: float) -> void:
	for field in fields:
		field.age += dt
		field.radius = lerpf(field.tuning.start_radius, field.max_radius, minf(1.0, field.age / field.duration))
		field.tick -= dt
		if field.tick <= 0.0:
			field.tick += field.tuning.pulse_interval
			if world.perf.enabled:
				world.perf.pulses += 1
			var detail: bool = world.perf.enabled
			_pressure(field.p, field.radius, field.tuning.pressure, detail)
			var stamp: int = Time.get_ticks_usec() if detail else 0
			_kick(field.p, field.radius, Vector2.ZERO, field.tuning.outward_power)
			if detail:
				world.perf.note_detail("pressure_kick", Time.get_ticks_usec() - stamp)
		if field.age >= field.duration:
			_secondary_blast({"kind": "expand", "vfx": "expand", "audio": false, "p": field.p, "radius": field.tuning.final_radius, "power": field.tuning.final_power, "scope_center": field.p, "scope_radius": field.radius})
			_visual("expand", field.p, field.radius, 0.7)
	fields = fields.filter(func(field): return field.age < field.duration)

func step(dt: float) -> void:
	if world == null:
		return
	world.perf.begin(world.perf.SKILL)
	step_unprofiled(dt)
	world.perf.end()

func step_unprofiled(dt: float) -> void:
	if world == null or world.paused or not is_finite(dt) or dt <= 0.0:
		return
	var left := minf(0.1, dt)
	while left > 0.00000001:
		var h := minf(1.0 / 60.0, left)
		left -= h
		clock += h
		# ActiveIdeaWorld advances equipment before IdeaWorld executes queued echoes.
		_active_step(h)
		# Snapshot pending so actions created during an explosion wait for next step.
		var scheduled := pending
		pending = []
		for action in scheduled:
			action.remaining -= h
			if action.remaining <= 0.00000001:
				_execute(action)
			else:
				pending.append(action)
		_fields_step(h)
		for mark in marks:
			mark.remaining -= h
		marks = marks.filter(func(mark): return not mark.used and mark.remaining > 0.0)

func info(include_effects := true) -> Dictionary:
	var passive_info: Array = []
	for id in passive_ids:
		var trigger := threshold(id)
		passive_info.append({"id": id, "level": levels[id], "count": counts.get(id, 0), "threshold": trigger, "triggers": triggers.get(id, 0), "progress": float(counts.get(id, 0)) / trigger if trigger > 0 else 0.0})
	var active_info: Array = []
	for id in active_ids:
		active_info.append({"id": id, "level": levels[id], "used": uses.get(id, false), "ready": can_activate(id)})
	var result := {
		"passives": passive_info, "actives": active_info, "passive_ids": passive_ids.duplicate(), "active_ids": active_ids.duplicate(),
		"equipped": equipped, "level": level, "orbital_level": orbital_level, "edition": edition,
		"count": passive_count, "threshold": threshold(), "triggers": passive_triggers,
		"progress": float(passive_count) / threshold() if threshold() > 0 else 0.0,
		"effective_attacks": effective_attacks, "used": active_used,
		"ready": can_activate("orbital"),
	}
	if include_effects:
		result.merge({"current": active.duplicate(true), "pending": pending.duplicate(true), "marks": marks.duplicate(true), "fields": fields.duplicate(true)})
	return result
