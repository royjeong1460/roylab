extends RefCounted

const Tutorial = preload("res://campaign/tutorial.gd")
const FinalCollection = preload("res://campaign/final_collection.gd")
const FINISH_LIMIT := 9.0
const COLLECTION_DELAY := 1.0
var world
var site: Dictionary = {}
var profile: Dictionary = {}
var mode := "stage"
var id := ""
var work_ms := 0.0
var wall_active_ms := 0.0
var finishing_elapsed_ms := 0.0
var first_70_ms: Variant = null
var phase := "working"
var state := "active"
var paused := false
var settling := false
var finish_ready := false
var finish_reason := ""
var finish_remaining := FINISH_LIMIT
var quiet_elapsed := 0.0
var collection_center := Vector2.ZERO
var collection_tier := 0
var collection := FinalCollection.new()
var _last_pixelized := 0
var _last_fractures := 0
var _last_tier_at := -INF
var skill_uses := {"orbital": 0}
var used_tools: Array = []
var attacks := {"bomb": 0, "blackhole": 0}
var secured_at_end := 0
var guide
var journal
var _sample_elapsed := 0.0

func setup(authored_site: Dictionary, snapshot_profile: Dictionary, run_mode: String) -> void:
	# Authored map arrays are immutable and shared; only the profile is a run snapshot.
	site = authored_site
	profile = snapshot_profile.duplicate(true)
	mode = run_mode
	id = "%d-%d" % [Time.get_ticks_usec(), randi()]
	if mode == "tutorial":
		guide = Tutorial.new()
		var preview: Array = site.get("preview", [])
		if not preview.is_empty():
			var point = preview[0]
			guide.target = Vector2(float(point.get("x", 0)), float(point.get("y", 0))) if point is Dictionary else Vector2.ZERO

func attach_world(value) -> void:
	world = value
	world.auto_advance = false
	world.paused = paused
	world.final_collection = true
	collection.setup(world)
	collection_center = Vector2(float(world.width), float(world.height)) * 0.5

func total() -> int:
	if world == null:
		return int(site.get("initial", 0))
	return int(world.initial)

func recovered() -> int:
	return int(world.ledger().get("collected", 0)) if world != null else 0

func ratio() -> float:
	return float(recovered()) / maxi(1, total())

func qualified() -> bool:
	return total() > 0 and recovered() >= ceili(total() * 0.7)

func loose_count() -> int:
	return world.grains.size() if world != null else 0

func pixelized() -> int:
	return recovered() + loose_count()

func collection_started() -> bool:
	return collection.active

func _target_duration() -> float:
	var possible := float(pixelized()) / maxi(1, total())
	return 7.0 if possible >= 0.9 else 6.0 if possible >= 0.8 else 5.0 if possible >= 0.7 else 3.0

func _update_tier() -> void:
	var next := 100 if recovered() >= total() and total() > 0 else 90 if ratio() >= 0.9 else 80 if ratio() >= 0.8 else 70 if qualified() else 0
	if next > collection_tier:
		collection_tier = next
		_last_tier_at = finishing_elapsed_ms / 1000.0
		var event := {"kind": "collection-tier", "tier": next, "time": world.elapsed, "x": collection_center.x, "y": collection_center.y}
		for i in range(world.events.size() - 1, -1, -1):
			if world.events[i].get("kind", "") == "collection-tier" and world.events[i].get("time") == world.elapsed:
				world.events[i] = event
				return
		world.events.append(event)

func _debris_drained() -> bool:
	if world == null or not world.bombs.is_empty() or not world.wells.is_empty() or not world.pending_impacts.is_empty():
		return false
	var skill = world.skill_physics
	# Dormant landing marks do not prolong a settled scene; live motion below does.
	if not skill.pending.is_empty() or not skill.fields.is_empty() or not skill.active.is_empty():
		return false
	# A completed field can leave lifted or falling bodies that still produce pixels.
	for piece in world.pieces:
		if piece.linear_velocity.length() + absf(piece.angular_velocity) * piece.motion_radius > 2.0:
			return false
		# An unsupported body at its apex is not settled merely because speed is low.
		if not piece.sleeping and not world.finishing_supports.has(piece):
			return false
	return true

func _exhaust() -> void:
	if world != null and world.charge <= 0.00000001:
		request_finish()

func request_finish() -> void:
	if world != null and phase == "working":
		phase = "finishing"
		world.finishing_requested = true

func update(dt: float, _aim: Vector2, _from: Vector2, _collect: bool) -> void:
	if world == null or paused or finish_ready or state != "active" or not is_finite(dt) or dt <= 0:
		return
	_exhaust()
	var before: float = world.elapsed
	var step := minf(dt, 0.1)
	if phase == "finishing":
		step = minf(step, maxf(0.0, FINISH_LIMIT - finishing_elapsed_ms / 1000.0))
	wall_active_ms += step * 1000.0
	# Called once by the app's native physics tick; World never self-advances this session.
	world.advance(step)
	var simulated: float = maxf(0.0, world.elapsed - before)
	work_ms += simulated * 1000.0
	_exhaust()
	if phase == "finishing":
		finishing_elapsed_ms = minf(FINISH_LIMIT * 1000.0, finishing_elapsed_ms + simulated * 1000.0)
		var age := finishing_elapsed_ms / 1000.0
		finish_remaining = maxf(0.0, FINISH_LIMIT - age)
		var changed: bool = pixelized() != _last_pixelized or world.fractures != _last_fractures
		var impact: bool = world.events.any(func(event): return event.get("kind", "") == "sound-impact" and float(event.get("speed", 0)) >= 8)
		quiet_elapsed = quiet_elapsed + simulated if not changed and not impact and _debris_drained() else 0.0
		_last_pixelized = pixelized()
		_last_fractures = world.fractures
		if age + 0.00000001 >= COLLECTION_DELAY:
			if not collection.active:
				collection.begin()
				world.final_collection_active = true
				world.events.append({"kind": "collection-start", "x": collection_center.x, "y": collection_center.y, "time": world.elapsed})
			collection.step(collection_center, simulated, finish_remaining, maxf(0.0, _target_duration() - age))
			_update_tier()
		var all_done := total() > 0 and recovered() >= total()
		var settled_now := quiet_elapsed >= 0.6 or all_done
		var celebration_done := age - _last_tier_at >= 0.3
		if finish_remaining <= 0.00000001 or (settled_now and age >= _target_duration() and celebration_done):
			# Physics has produced this frame's grains; drain before fixing result/tier.
			secure_loose()
			_update_tier()
			finish_reason = "timeout" if finish_remaining <= 0.00000001 else "collected" if recovered() >= total() else "drained"
			finish_ready = true
	if first_70_ms == null and qualified():
		first_70_ms = work_ms
	if finish_ready:
		world.paused = true
	if guide != null:
		guide.update(simulated, recovered(), loose_count() > 0 or not world.pieces.is_empty())
	if journal != null:
		_sample_elapsed += simulated
		if _sample_elapsed >= 5.0:
			_sample_elapsed = 0.0
			journal.sample(self)

func press(point: Vector2, tool := "blast") -> bool:
	if world == null or paused or finish_ready or state != "active" or phase != "working" or settling or not point.is_finite():
		return false
	_exhaust()
	if phase != "working":
		return false
	var owned_id := "bomb" if tool in ["blast", "bomb"] else tool
	if owned_id not in profile.owned or owned_id not in ["bomb", "blackhole"]:
		return false
	var accepted: bool = world.attack(point, "blast" if owned_id == "bomb" else "blackhole")
	if accepted:
		attacks[owned_id] += 1
		if owned_id not in used_tools:
			used_tools.append(owned_id)
	_exhaust()
	if guide != null:
		guide.attack(point, accepted)
	return accepted

func release() -> void:
	# Contact attacks are discrete; the app owns/cancels the pending touch gesture.
	pass

func pause(value: bool) -> void:
	paused = settling or value
	if world != null:
		world.paused = paused or finish_ready
	if journal != null:
		journal.checkpoint(self, {"paused": paused})

func activate_skill(skill_id: String = "") -> bool:
	if world == null or paused or settling or finish_ready or state != "active" or phase != "working" or world.charge <= 0.00000001:
		return false
	var equipped: Array = profile.equipped.active
	if skill_id.is_empty() and not equipped.is_empty():
		skill_id = str(equipped[0])
	if skill_id not in equipped or not skill_uses.has(skill_id) or int(profile.skills.get(skill_id, 0)) <= 0 or int(skill_uses[skill_id]) > 0:
		return false
	var accepted: bool = world.skill_physics.activate(skill_id)
	if accepted:
		skill_uses[skill_id] += 1
	return accepted

func secure_loose() -> int:
	if world == null:
		return 0
	var before := recovered()
	world.secure_loose()
	var secured := recovered() - before
	secured_at_end += secured
	if first_70_ms == null and qualified():
		first_70_ms = work_ms
	return secured

func seal() -> void:
	state = "finished"
	paused = true
	finish_ready = true
	if world == null:
		return
	world.paused = true
	world.bombs.clear()
	world.wells.clear()
	world.skill_physics.clear_effects()

func skill_state() -> Dictionary:
	var info: Dictionary = world.skill_physics.info(false) if world != null else {}
	var passives: Array = info.get("passives", []).duplicate(true)
	var actives: Array = info.get("actives", []).duplicate(true)
	var can_activate: bool = world != null and not paused and not settling and not finish_ready and state == "active" and phase == "working" and world.charge > 0.00000001
	for active in actives:
		active.used = int(skill_uses.get(active.id, 0))
		active.available = can_activate and active.used == 0 and bool(active.get("ready", false))
	return {"passives": passives, "actives": actives,
		"passive": passives[0] if not passives.is_empty() else {},
		"active": actives[0] if not actives.is_empty() else {}}

func snapshot() -> Dictionary:
	return {"recovered": recovered(), "total": total(), "pixelized": recovered() + loose_count(),
		"loose": loose_count(), "energyRemaining": world.charge if world != null else 0,
		"energyUsed": world.energy_used if world != null else 0,
		"energyRestored": maxf(0.0, world.charge + world.energy_used - float(world.stats.get("capacity", 60))) if world != null else 0,
		"capacity": world.stats.get("capacity", 60) if world != null else 60, "attacks": attacks.duplicate(),
		"skillUses": skill_uses.duplicate(), "skillState": skill_state(), "simulationMs": work_ms, "activeMs": wall_active_ms,
		"first70Ms": first_70_ms, "cleanupDurationMs": finishing_elapsed_ms, "phase": phase,
		"finishReason": finish_reason, "collectionTier": collection_tier, "ledger": world.ledger() if world != null else {}}
