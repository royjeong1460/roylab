extends RefCounted

var _native = ClassDB.instantiate("PPEffectKernel")

# Port of arch/chain-world.js. Extra work is restricted to causal cross-building hits.
var world
var power := 10.0
var sequence := 0
var chains := {}
var tags := {}
var summary := {}

func setup(owner_world) -> void:
	world = owner_world
	reset()

func reset() -> void:
	sequence = 0
	chains.clear()
	tags.clear()
	summary = {"stage": 0, "best": 0, "pixels": 0, "impacts": 0, "lastAt": -1.0}

func arm(point: Vector2, radius: float) -> void:
	var seeds := {}
	for piece in [null] + world.pieces:
		seeds.merge(_native.seed_groups(world.material(piece), world._original_groups, point, radius), true)
	seeds.erase(-1)
	if seeds.is_empty():
		return
	sequence += 1
	var chain := {"id": sequence, "expires": world.elapsed + 12, "started": world.elapsed, "edges": {}, "used": {}, "reached": seeds}
	chains[sequence] = chain
	for group in seeds:
		tags[group] = {"id": sequence, "stage": 0}
	while chains.size() > 16:
		chains.erase(chains.keys()[0])

func group_at(piece, point: Vector2, collider = null) -> int:
	if piece != null and is_instance_valid(piece) and not piece.ids.is_empty():
		return world._original_groups.get(piece.ids[0], -1)
	if collider != world.static_body:
		return 0 if point.y >= world.ground_y(point.x) - 1 else -1
	return _native.nearest_group(world.static_ids(), world._original_groups, world.width, point)

func prepare(hit: Dictionary) -> Dictionary:
	if power <= 0 or hit.speed < 12 or hit.energy < 1.2:
		return {}
	var piece = hit.get("source_piece", hit.piece)
	var other = hit.get("other")
	if piece == null or not is_instance_valid(piece):
		return {}
	var ga := group_at(piece, hit.point)
	var gb := group_at(other, hit.point, hit.get("collider"))
	if ga <= 0 or gb <= 0 or ga == gb:
		return {}
	var edge := "%d:%d" % [mini(ga, gb), maxi(ga, gb)]
	var candidates: Array = []
	# The contact normal points from the other body toward the sampled body.
	for row in [[piece, ga, gb, -1.0], [other, gb, ga, 1.0]]:
		var body = row[0]
		if body == null or not is_instance_valid(body) or body.ids.size() < 64:
			continue
		var tag: Dictionary = tags.get(row[1], {})
		var chain: Dictionary = chains.get(tag.get("id", -1), {})
		if chain.is_empty() or chain.expires < world.elapsed:
			continue
		var velocity: Vector2 = hit.get("source_velocity", Vector2.ZERO) if row[3] < 0 else hit.get("other_velocity", Vector2.ZERO)
		var normal: Vector2 = hit.get("source_normal", hit.normal)
		var approach: float = row[3] * velocity.dot(normal)
		if approach < 4:
			continue
		var previous: Dictionary = chain.edges.get(edge, {})
		if not previous.is_empty() and previous.sourceGroup != row[1]:
			continue
		if previous.is_empty() and chain.reached.has(row[2]):
			continue
		candidates.append({"chain": chain, "edge": edge, "sourceGroup": row[1], "targetGroup": row[2], "sourcePixels": body.ids.size(), "sourceApproach": approach, "stage": previous.get("stage", mini(8, tag.stage + 1))})
	if candidates.is_empty():
		return {}
	candidates.sort_custom(func(a, b): return a.chain.id > b.chain.id if a.chain.id != b.chain.id else a.stage > b.stage)
	var candidate: Dictionary = candidates[0]
	var recipient := ga if hit.piece != null else gb
	var used_key := "%s:%d" % [edge, recipient]
	if candidate.chain.used.has(used_key):
		return {}
	candidate.recipient = recipient
	candidate.used_key = used_key
	candidate.original_energy = hit.energy
	candidate.boost = power * (1 + 0.25 * (candidate.stage - 1))
	return candidate

func activate(context: Dictionary, hit: Dictionary) -> Dictionary:
	if context.is_empty() or context.chain.used.has(context.used_key) or context.chain.expires < world.elapsed:
		return {}
	context.before_loose = world.grains.size() + world.collected.size()
	hit.energy = context.original_energy * context.boost
	hit.speed_start = 8.0
	hit.chain = true
	return context

func finish(context: Dictionary, hit: Dictionary, changed: bool) -> void:
	if context.is_empty() or not changed:
		return
	var chain: Dictionary = context.chain
	chain.used[context.used_key] = true
	chain.edges[context.edge] = {"stage": context.stage, "sourceGroup": context.sourceGroup, "targetGroup": context.targetGroup}
	chain.expires = minf(chain.started + 24, world.elapsed + 7)
	chain.reached[context.targetGroup] = true
	tags[context.targetGroup] = {"id": chain.id, "stage": context.stage}
	var count := maxi(0, world.grains.size() + world.collected.size() - context.before_loose)
	summary.stage = context.stage
	summary.best = maxi(summary.best, context.stage)
	summary.pixels += count
	summary.impacts += 1
	summary.lastAt = world.elapsed
	world.events.append({"kind": "chain-impact", "time": world.elapsed, "chainId": chain.id, "edge": context.edge, "recipient": context.recipient, "sourceGroup": context.sourceGroup, "targetGroup": context.targetGroup, "sourcePixels": context.sourcePixels, "sourceApproach": context.sourceApproach, "stage": context.stage, "x": hit.point.x, "y": hit.point.y, "count": count, "speed": hit.speed, "energy": context.original_energy, "boost": context.boost})
