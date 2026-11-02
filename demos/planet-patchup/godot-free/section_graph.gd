extends RefCounted

var ids: Array = []
var index_of := {}
var rows := PackedInt32Array()
var points := PackedVector2Array()
var links: Array = []
var support_height := PackedInt32Array()
var visited := PackedInt32Array()
# Upper cuts are queried in ascending row order. Add each pixel/edge once;
# only selected sections need the original FIFO member list.
var row_nodes: Array = []
var parents := PackedInt32Array()
var counts := PackedInt32Array()
var firsts := PackedInt32Array()
var sums_x := PackedFloat64Array()
var sums_y := PackedFloat64Array()
var roots := {}
var upper_row := -1
var exact_half_points := true
var member_cache := {}
var stamp := 0

func setup(world: Node, source_ids: Array, supports) -> void:
	ids.clear()
	index_of.clear()
	rows.clear()
	points.clear()
	links.clear()
	stamp = 0
	member_cache.clear()
	exact_half_points = true
	var maximum_row := 0
	for value in source_ids:
		var id := int(value)
		if index_of.has(id):
			continue
		index_of[id] = ids.size()
		ids.append(id)
		var row := floori(float(id) / world.width)
		rows.append(row)
		var point: Vector2 = world.original_point(id)
		points.append(point)
		exact_half_points = exact_half_points and point.x >= 0.0 and point.y >= 0.0 and point.x * 2.0 == floor(point.x * 2.0) and point.y * 2.0 == floor(point.y * 2.0)
		maximum_row = maxi(maximum_row, row)
	var cell_count: int = world.width * world.height
	for id in ids:
		var neighbors := PackedInt32Array()
		for other in world.neighbors(id):
			if index_of.has(other) and world.bonds.get(mini(id, other) * cell_count + maxi(id, other), 0.0) < 1.0:
				neighbors.append(index_of[other])
		links.append(neighbors)
	visited.resize(ids.size())
	visited.fill(0)
	row_nodes.resize(maximum_row + 1)
	for row in range(row_nodes.size()):
		row_nodes[row] = PackedInt32Array()
	for index in range(ids.size()):
		row_nodes[rows[index]].append(index)
	_reset_upper()
	update_supports(supports)

func update_supports(supports) -> void:
	# Contacts change while a body moves; its original-grid links do not.
	# Keep those links and FIFO member caches, recomputing only below-cut reachability.
	support_height.resize(ids.size())
	support_height.fill(-1)
	if supports == null:
		return
	var maximum_row := row_nodes.size() - 1
	# A below-cut path exists iff its best minimum row is greater than the cut row.
	var buckets: Array = []
	buckets.resize(maximum_row + 1)
	for row in range(buckets.size()):
		buckets[row] = []
	for id in supports:
		var index: int = index_of.get(id, -1)
		if index >= 0 and support_height[index] < rows[index]:
			support_height[index] = rows[index]
			buckets[rows[index]].append(index)
	for row in range(maximum_row, -1, -1):
		var bucket: Array = buckets[row]
		while not bucket.is_empty():
			var index: int = bucket.pop_back()
			if support_height[index] != row:
				continue
			for next in links[index]:
				var reach := mini(row, rows[next])
				if reach > support_height[next]:
					support_height[next] = reach
					buckets[reach].append(next)

func supported(id: int, cut_row: int) -> bool:
	var index: int = index_of.get(id, -1)
	return index >= 0 and support_height[index] > cut_row

func _reset_upper() -> void:
	parents.resize(ids.size())
	parents.fill(-1)
	counts.resize(ids.size())
	firsts.resize(ids.size())
	sums_x.resize(ids.size())
	sums_y.resize(ids.size())
	roots.clear()
	upper_row = -1

func _root(index: int) -> int:
	while parents[index] != index:
		parents[index] = parents[parents[index]]
		index = parents[index]
	return index

func _join(a: int, b: int) -> void:
	a = _root(a)
	b = _root(b)
	if a == b:
		return
	if counts[a] < counts[b]:
		var swap := a
		a = b
		b = swap
	parents[b] = a
	counts[a] += counts[b]
	firsts[a] = mini(firsts[a], firsts[b])
	sums_x[a] += sums_x[b]
	sums_y[a] += sums_y[b]
	roots.erase(b)

func belongs(id: int, tag: int) -> bool:
	var index: int = index_of.get(id, -1)
	return index >= 0 and parents[index] >= 0 and firsts[_root(index)] == tag

func summaries(cut_row: int) -> Array:
	if cut_row < upper_row:
		_reset_upper()
	for row in range(maxi(0, upper_row + 1), mini(cut_row + 1, row_nodes.size())):
		for index in row_nodes[row]:
			parents[index] = index
			counts[index] = 1
			firsts[index] = index
			sums_x[index] = points[index].x
			sums_y[index] = points[index].y
			roots[index] = true
			for other in links[index]:
				if parents[other] >= 0:
					_join(index, other)
	upper_row = cut_row
	var groups: Array = []
	for root in roots:
		var center_sum := Vector2(sums_x[root], sums_y[root])
		# Half-cell coordinates sum exactly below 2^23 regardless of order.
		# Fall back to the original Vector2 FIFO sum outside that safe range.
		if not exact_half_points or sums_x[root] > 8388608.0 or sums_y[root] > 8388608.0:
			center_sum = _walk(firsts[root], cut_row).center_sum
		groups.append({"count": counts[root], "center_sum": center_sum, "tag": firsts[root]})
	# Recreate the old seed order before its (not stable) size sort.
	groups.sort_custom(func(a, b): return a.tag < b.tag)
	groups.sort_custom(func(a, b): return a.count > b.count)
	return groups

func _walk(seed: int, cut_row: int) -> Dictionary:
	var key := Vector2i(seed, cut_row)
	if member_cache.has(key):
		return member_cache[key]
	stamp += 1
	var queue := PackedInt32Array([seed])
	var group: Array = [ids[seed]]
	var center_sum := Vector2.ZERO
	visited[seed] = stamp
	var head := 0
	while head < queue.size():
		var index := queue[head]
		center_sum += points[index]
		for next in links[index]:
			if rows[next] <= cut_row and visited[next] != stamp:
				visited[next] = stamp
				queue.append(next)
				group.append(ids[next])
		head += 1
	var result := {"ids": group, "center_sum": center_sum, "tag": seed}
	member_cache[key] = result
	return result

func members(tag: int, cut_row: int) -> Array:
	return _walk(tag, cut_row).ids

func upper(cut_row: int) -> Array:
	var groups: Array = []
	for component in summaries(cut_row):
		groups.append(_walk(component.tag, cut_row))
	return groups
