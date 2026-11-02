extends RefCounted

var world: Node
var dirty := false
var weights := PackedInt32Array()
var links: Array = []
var adjacency: Array = []
var visited := PackedInt32Array()
var visit_stamp := 0

func setup(source: Node, remaining: Array, _initial_groups: Array, candidates: Array) -> void:
	source.perf.begin(source.perf.CUT_GRAPH)
	setup_unprofiled(source, remaining, _initial_groups, candidates)
	source.perf.end()

func setup_unprofiled(source: Node, remaining: Array, _initial_groups: Array, candidates: Array) -> void:
	world = source
	weights.clear()
	links.clear()
	adjacency.clear()
	visit_stamp = 0
	dirty = false
	# Only candidate bonds can change in this fracture. Contract every other live bond.
	var mutable := {}
	for edge in candidates:
		for bond in edge.bonds:
			mutable[bond.key] = true
	var unassigned := {}
	for id in remaining:
		unassigned[id] = true
	var owner := {}
	for seed in remaining:
		if not unassigned.has(seed):
			continue
		var node := weights.size()
		var queue: Array = [seed]
		unassigned.erase(seed)
		owner[seed] = node
		var head := 0
		while head < queue.size():
			var id: int = queue[head]
			for next in world.neighbors(id):
				if not unassigned.has(next):
					continue
				var key: int = world.bond_key(id, next)
				if mutable.has(key) or world.bonds.get(key, 0.0) >= 1.0:
					continue
				unassigned.erase(next)
				owner[next] = node
				queue.append(next)
			head += 1
		weights.append(queue.size())
		adjacency.append([])
	var pairs := {}
	for edge in candidates:
		for bond in edge.bonds:
			if not owner.has(bond.id) or not owner.has(bond.other) or world.bonds.get(bond.key, 0.0) >= 1.0:
				continue
			var a: int = owner[bond.id]
			var b: int = owner[bond.other]
			if a == b:
				continue
			var pair := Vector2i(mini(a, b), maxi(a, b))
			if not pairs.has(pair):
				var index := links.size()
				pairs[pair] = index
				links.append({"a": pair.x, "b": pair.y, "keys": []})
				adjacency[pair.x].append(index)
				adjacency[pair.y].append(index)
			links[pairs[pair]].keys.append(bond.key)
	visited.resize(weights.size())
	visited.fill(0)

func prepare() -> void:
	# Partial cuts (including rounding to 1.0) are read from live bonds on every query.
	dirty = false

func allows_cut(_cut_bonds: Array, limit: int) -> bool:
	world.perf.begin(world.perf.CUT_CHECK)
	var result: bool = allows_cut_unprofiled(_cut_bonds, limit)
	world.perf.end()
	return result

func allows_cut_unprofiled(_cut_bonds: Array, limit: int) -> bool:
	visit_stamp += 1
	var open := PackedByteArray()
	open.resize(links.size())
	for index in range(links.size()):
		for key in links[index].keys:
			if world.bonds.get(key, 0.0) < 1.0:
				open[index] = 1
				break
	var count := 0
	for seed in range(weights.size()):
		if visited[seed] == visit_stamp:
			continue
		var queue: Array = [seed]
		visited[seed] = visit_stamp
		var size := 0
		var head := 0
		while head < queue.size():
			var node: int = queue[head]
			size += weights[node]
			for index in adjacency[node]:
				if not open[index]:
					continue
				var link: Dictionary = links[index]
				var next: int = link.b if link.a == node else link.a
				if visited[next] != visit_stamp:
					visited[next] = visit_stamp
					queue.append(next)
			head += 1
		if size >= 4:
			count += 1
			if count > limit:
				return false
	# No topology is committed here, so rejected cuts need only the caller's bond rollback.
	return true
