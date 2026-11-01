extends RefCounted

# Direct port of frozen physics-fracture/graph.js. Regions carry damage, not bodies.
static func bond_key(a: int, b: int, count: int) -> int:
	return mini(a, b) * count + maxi(a, b)

static func noise(x: int, y: int) -> float:
	var v: int = (((x + 137) * 374761393) & 0xffffffff) ^ (((y + 251) * 668265263) & 0xffffffff)
	v = ((v ^ (v >> 13)) * 1274126177) & 0xffffffff
	return float((v ^ (v >> 16)) & 0xffffffff) / 4294967295.0

static func neighbors(id: int, width: int, count: int) -> Array:
	var result: Array = []
	if id % width > 0:
		result.append(id - 1)
	if id % width < width - 1:
		result.append(id + 1)
	if id >= width:
		result.append(id - width)
	if id + width < count:
		result.append(id + width)
	return result

func build(material: Array, width: int, bonds: Dictionary, count := 18055) -> Dictionary:
	var size := maxi(8, ceili(sqrt(material.size() / 160.0)))
	var labels := {}
	var by_id := {}
	for pixel in material:
		by_id[pixel.id] = pixel
		var x: float = int(pixel.id) % width + 0.5
		var y: float = floori(float(pixel.id) / width) + 0.5
		var gx := floori(x / size)
		var gy := floori(y / size)
		var best := INF
		var label := Vector2i.ZERO
		for a in range(gx - 1, gx + 2):
			for b in range(gy - 1, gy + 2):
				var dx := x - (a + 0.2 + 0.6 * noise(a, b)) * size
				var dy := y - (b + 0.2 + 0.6 * noise(b, a + 79)) * size
				var distance := dx * dx + dy * dy
				if distance < best:
					best = distance
					label = Vector2i(a, b)
		labels[pixel.id] = label
	var owner := {}
	var nodes: Array = []
	for pixel in material:
		if owner.has(pixel.id):
			continue
		var node := {"id": nodes.size(), "ids": [pixel.id], "center": Vector2.ZERO, "edges": []}
		nodes.append(node)
		owner[pixel.id] = node.id
		var at := 0
		while at < node.ids.size():
			for id in neighbors(node.ids[at], width, count):
				if owner.has(id) or not by_id.has(id) or labels[id] != labels[pixel.id] or bonds.get(bond_key(id, node.ids[at], count), 0.0) >= 1:
					continue
				owner[id] = node.id
				node.ids.append(id)
			at += 1
		for id in node.ids:
			node.center += by_id[id].q / node.ids.size()
	var edges_by_pair := {}
	var edges: Array = []
	for pixel in material:
		for id in neighbors(pixel.id, width, count):
			if id <= pixel.id or not owner.has(id):
				continue
			var a: int = owner[pixel.id]
			var b: int = owner[id]
			var key := bond_key(pixel.id, id, count)
			var old: float = bonds.get(key, 0.0)
			if a == b or old >= 1:
				continue
			var pair := Vector2i(mini(a, b), maxi(a, b))
			if not edges_by_pair.has(pair):
				var edge := {"a": a, "b": b, "bonds": [], "cost": 0.0}
				edges_by_pair[pair] = edge
				edges.append(edge)
				nodes[a].edges.append(edge)
				nodes[b].edges.append(edge)
			var edge: Dictionary = edges_by_pair[pair]
			edge.bonds.append({"key": key, "old": old, "id": pixel.id, "other": id})
			edge.cost += (1 - old) * (0.65 + 0.7 * noise(pixel.id, id))
	return {"nodes": nodes, "edges": edges, "owner": owner}

func distances(graph: Dictionary, contact_ids: Array) -> Array:
	var distance: Array = []
	distance.resize(graph.nodes.size())
	distance.fill(INF)
	var done := {}
	for id in contact_ids:
		if graph.owner.has(id):
			distance[graph.owner[id]] = 0.0
	for k in range(graph.nodes.size()):
		var at := -1
		var best := INF
		for i in range(distance.size()):
			if not done.has(i) and distance[i] < best:
				best = distance[i]
				at = i
		if at < 0:
			break
		done[at] = true
		var node: Dictionary = graph.nodes[at]
		for edge in node.edges:
			var to: int = edge.b if edge.a == at else edge.a
			distance[to] = minf(distance[to], best + node.center.distance_to(graph.nodes[to].center))
	return distance
