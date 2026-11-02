extends RefCounted

# ArchWorld + IdeaWorld + ActiveIdeaWorld; paid Aftershock uses aftershock.js.
# All positions and projectile velocities are logical cells and cells/second.
const Catalog = preload("res://campaign/catalog.gd")
const PASSIVES := ["aftershock", "relay"]
const ACTIVES := ["orbital"]
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
		var maximum := 10 if id == "aftershock" and edition == "paid" else 5
		levels[id] = maxi(0, int(skill_levels.get(id, 0))) if edition == "paid" else clampi(int(skill_levels.get(id, 0)), 0, maximum)
	for id in passives:
		if id in PASSIVES and levels[id] > 0 and not passive_ids.has(id) and passive_ids.size() < 1:
			passive_ids.append(id)
	for id in actives:
		if id in ACTIVES and levels[id] > 0 and not active_ids.has(id) and active_ids.size() < 1:
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
	elif id == "relay":
		var chosen = null
		for piece in world.pieces:
			if piece.ids.size() < 8 or (chosen != null and piece.ids.size() <= chosen.ids.size()):
				continue
			for pixel_id in piece.ids:
				if piece.pixel_position(pixel_id).distance_to(point) <= float(world.stats.get("blastReach", 18.0)):
					chosen = piece
					break
		if chosen != null:
			var ids := {}
			for pixel_id in chosen.ids:
				ids[pixel_id] = true
			marks.append({"kind": id, "ids": ids, "gain": gain, "tuning": tuning, "remaining": 12.0, "armed_at": clock + 0.18, "used": false})
			marks = marks.slice(maxi(0, marks.size() - 8))
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
	var available: Array = []
	for candidate in candidates:
		var spaced := true
		for previous in chosen:
			if candidate.distance_to(previous) < gap:
				spaced = false
				break
		if spaced:
			available.append(candidate)
	return available

func mark_has_piece(mark: Dictionary, piece) -> bool:
	# Pixel membership is immutable for a live piece; fractures create new instances.
	if not mark.has("_piece_owners"):
		mark._piece_owners = {}
	var owners: Dictionary = mark._piece_owners
	var instance_id: int = piece.get_instance_id()
	if not owners.has(instance_id):
		owners[instance_id] = false
		for id in piece.ids:
			if mark.ids.has(id):
				owners[instance_id] = true
				break
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
		if mark_has_piece(mark, piece):
			mark.used = true
			var point: Vector2 = hit.point
			point.y = minf(world.ground_y(point.x) - 1.0, point.y)
			_schedule("relay-hit", 0.0, point, 3.0, mark.tuning.power)

func _structure_material() -> Array:
	var material: Array = []
	for piece in [null] + world.pieces:
		for pixel in world.material(piece):
			material.append({"id": pixel.id, "q": pixel.q, "piece": piece})
	return material

func can_activate(id: String) -> bool:
	if world == null or world.paused or world.settled or world.charge <= 0.00000001 or not active_ids.has(id) or bool(uses.get(id, false)):
		return false
	return active.is_empty()

func activate(id := "") -> bool:
	if id.is_empty() and not active_ids.is_empty():
		id = str(active_ids[0])
	if not can_activate(id):
		return false
	var material := _structure_material()
	if material.is_empty():
		return false
	# Quantiles are captured once at deployment; later fracture does not retarget.
	var xs: Array = []
	for entry in material:
		xs.append(entry.q.x)
	xs.sort()
	var skill_level := int(levels.get(id, 0))
	var tuning := _effect(id)
	var count := int(tuning.payloads)
	var left := float(xs[0])
	var right := float(xs[-1])
	var top := INF
	for entry in material:
		top = minf(top, entry.q.y)
	var targets: Array = []
	for i in range(count):
		targets.append(float(xs[floori(float(i) * (xs.size() - 1) / (count - 1))]))
	active = {"id": id, "level": skill_level, "age": 0.0, "next": 0, "targets": targets, "projectiles": [], "force": tuning.gain, "tuning": tuning, "left": left, "right": right, "top": top, "duration": 5.0}
	uses[id] = true
	active_used = bool(uses.get("orbital", false))
	world.events.append({"kind": "sound-active-deploy", "id": id})
	history.clear()
	return true

func activate_orbital() -> bool:
	return activate("orbital")


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
	var skill_id: String = {"echo": "aftershock", "relay-hit": "relay", "orbital": "orbital"}.get(str(action.get("kind", "")), "")
	if edition == "paid" and not skill_id.is_empty():
		var maximum := 10 if skill_id == "aftershock" else 5
		var efficiency := 1.0 + 0.08 * sqrt(float(maxi(0, int(levels.get(skill_id, 0)) - maximum)))
		if skill_id == "aftershock":
			efficiency *= float(world.stats.get("blastFractureEfficiency", 1.0))
		bomb.fracture_efficiency = efficiency
	world.blast(bomb)
	_record({"kind": action.get("kind", "orbital"), "p": action.p})

func _orbital_columns() -> Dictionary:
	# Only position is needed for the vertical sweep. Snapshot current geometry,
	# including rebuilt bodies after each impact, and inspect nearby columns only.
	var columns := {}
	for piece in [null] + world.pieces:
		for id in (piece.ids if piece != null else world.static_ids()):
			var point: Vector2 = piece.pixel_position(id) if piece != null else world.original_point(id)
			var column := floori(point.x)
			if not columns.has(column):
				columns[column] = []
			columns[column].append(point)
	return columns

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
		var hit: float = world.ground_y(projectile.x)
		for column in range(floori(projectile.x - projectile.radius), floori(projectile.x + projectile.radius) + 1):
			for point: Vector2 in columns.get(column, []):
				if absf(point.x - projectile.x) <= projectile.radius and point.y >= previous - projectile.radius and point.y <= projectile.y + projectile.radius:
					hit = minf(hit, point.y)
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




func _active_step(dt: float) -> void:
	if active.is_empty():
		return
	active.age += dt
	_orbital_step(dt)

func _execute(action: Dictionary) -> void:
	if action.kind in ["echo", "relay-hit"]:
		_secondary_blast(action)

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
