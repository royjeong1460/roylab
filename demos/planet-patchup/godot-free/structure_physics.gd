extends RefCounted

const YieldJoint = preload("res://yield_joint.gd")
const S := 4.0
var world: Node
var structure_clock := 0.0
var static_check_clock := 0.0
var last_load: Dictionary = {}
var yield_joints: Array = []
var joint_yields := 0
var joint_breaks := 0
var snap_count := 0
var collision_exceptions: Array = []
var previous_pose := {}
var pose_motion := {}
var finishing := false
var column_failure := true
var rest_contacts := {}

func setup(owner_world: Node) -> void:
	world = owner_world

func reset() -> void:
	for joint in yield_joints:
		joint.disconnect_joint()
	_clear_collision_exceptions()
	yield_joints.clear()
	previous_pose.clear()
	pose_motion.clear()
	rest_contacts.clear()
	structure_clock = 0.0
	static_check_clock = 0.0
	last_load.clear()
	joint_yields = 0
	joint_breaks = 0
	snap_count = 0

func _owned(ids: Array) -> Dictionary:
	var result := {}
	for id in ids:
		result[id] = true
	return result

func _row(id: int) -> int:
	return floori(float(id) / world.width)

func _live_static(id: int) -> bool:
	return id >= 0 and id < world.cells.size() and world.cells[id] != 0

func _strength(id: int) -> float:
	return maxf(0.0, 1.0 - float(world.bonds.get(world.bond_key(id, id + world.width), 0.0)))

func pillar_lengths(ids: Array) -> Dictionary:
	var owned := _owned(ids)
	var lengths := {}
	for id in ids:
		if world.roles[id] != 1 or lengths.has(id):
			continue
		var top: int = id
		while owned.has(top - world.width) and world.roles[top - world.width] == 1 and float(world.bonds.get(world.bond_key(top, top - world.width), 0.0)) < 1.0:
			top -= world.width
		var run: Array = [top]
		while owned.has(run[-1] + world.width) and world.roles[run[-1] + world.width] == 1 and float(world.bonds.get(world.bond_key(run[-1], run[-1] + world.width), 0.0)) < 1.0:
			run.append(run[-1] + world.width)
		for member in run:
			lengths[member] = run.size()
	return lengths

func column_load(bearings: Array, lengths: Dictionary, load_count: float, lever: float, angle: float) -> float:
	if not column_failure:
		return 0.0
	var posts: Array = []
	for bearing in bearings:
		if not bearing.pillar:
			return 0.0
		var length := maxi(int(lengths.get(bearing.id, 0)), int(lengths.get(bearing.id + world.width, 0)))
		if length == 0:
			return 0.0
		if posts.is_empty() or bearing.x - posts[-1].right > 1.0:
			posts.append({"width": 0.0, "length": 0, "right": bearing.x})
		posts[-1].width += bearing.strength
		posts[-1].length = maxi(posts[-1].length, length)
		posts[-1].right = bearing.x
	var axial := 0.0
	var bending := 0.0
	for post in posts:
		axial += pow(post.width, 3) / pow(post.length, 2)
		bending += pow(post.width, 2)
	if axial <= 0.0 or bending <= 0.0:
		return 0.0
	return load_count * (absf(cos(angle)) / (180000.0 * axial) + lever / (1200.0 * bending))

func sections(ids: Array, angle := 0.0, cut_limit := INF, support_ids = null) -> Array:
	var owned := _owned(ids)
	var rows := {}
	var candidates: Array = []
	var lengths := pillar_lengths(ids)
	for id in ids:
		var next: int = id + world.width
		var y := _row(id)
		if y + 1 > cut_limit or not owned.has(next):
			continue
		var strength := _strength(id)
		if strength <= 0.0:
			continue
		if not rows.has(y):
			rows[y] = []
		rows[y].append({"id": id, "x": world.original_point(id).x, "strength": strength, "pillar": world.roles[id] == 1 or world.roles[next] == 1})
	var cuts: Array = []
	var previous: Dictionary = {}
	var ys: Array = rows.keys()
	ys.sort()
	for y in ys:
		var bearings: Array = rows[y]
		if not bearings.any(func(b): return b.pillar):
			previous = {}
			continue
		bearings.sort_custom(func(a, b): return a.x < b.x)
		var signatures: PackedStringArray = []
		for bearing in bearings:
			signatures.append("%s:%.4f" % [bearing.x, bearing.strength])
		var cut := {"y": y, "bearings": bearings, "signature": ",".join(signatures)}
		if not previous.is_empty() and previous.y == y - 1 and previous.signature == cut.signature:
			cuts[-1] = cut
		else:
			cuts.append(cut)
		previous = cut
	for cut in cuts:
		var supported_below := {}
		if support_ids != null:
			var queue: Array = []
			for id in support_ids:
				if owned.has(id) and _row(id) > cut.y:
					supported_below[id] = true
					queue.append(id)
			var n := 0
			while n < queue.size():
				for next in world.neighbors(queue[n]):
					if not owned.has(next) or supported_below.has(next) or _row(next) <= cut.y or float(world.bonds.get(world.bond_key(queue[n], next), 0.0)) >= 1.0:
						continue
					supported_below[next] = true
					queue.append(next)
				n += 1
		var upper: Array = ids.filter(func(id): return _row(id) <= cut.y)
		for above in world.groups(upper):
			if above.size() < 40:
				continue
			var upper_set := _owned(above)
			var bearings: Array = cut.bearings.filter(func(b): return upper_set.has(b.id) and (support_ids == null or supported_below.has(b.id + world.width)))
			if bearings.is_empty():
				continue
			if world.has_terrain and ((support_ids != null and support_ids.any(func(id): return upper_set.has(id))) or not bearings.any(func(b): return b.pillar)):
				continue
			var width_left := 0.0
			var center := Vector2.ZERO
			for bearing in bearings:
				width_left += bearing.strength
			for id in above:
				center += world.original_point(id)
			center /= above.size()
			var pivot := clampf(center.x, bearings[0].x - 0.5, bearings[-1].x + 0.5)
			var signed_lever: float = (center.x - pivot) * cos(angle) + (cut.y + 1 - center.y) * sin(angle)
			var reserve := float(world._reserve.get(world._original_groups.get(bearings[0].id, 0), 1.0))
			var load_count: float = above.size()
			var lever := absf(signed_lever)
			var utilization := maxf(load_count / (1800.0 * width_left) + load_count * lever / (7000.0 * width_left * width_left), column_load(bearings, lengths, load_count, lever, angle)) / reserve
			var axial_utilization := maxf(load_count / (1800.0 * width_left), column_load(bearings, lengths, load_count, 0.0, angle)) / reserve
			candidates.append({"y": cut.y, "bearings": bearings, "cuts": bearings.map(func(b): return b.id), "width": width_left, "above": above, "center": center.x, "pivot": pivot, "load": above.size(), "utilization": utilization, "axialUtilization": axial_utilization, "signedLever": signed_lever, "lever": lever, "reserve": reserve})
	candidates.sort_custom(func(a, b): return a.utilization > b.utilization)
	return candidates

func live_hinge_section(piece) -> Dictionary:
	var previous: Dictionary = piece.get_meta("section", {})
	if previous.is_empty():
		return {}
	var owned := _owned(piece.ids)
	var bearings: Array = []
	for bearing in previous.bearings:
		if not owned.has(bearing.id) or not _live_static(bearing.id + world.width):
			continue
		var copy: Dictionary = bearing.duplicate()
		copy.strength = _strength(bearing.id)
		if copy.strength > 0:
			bearings.append(copy)
	var width_left := 0.0
	for bearing in bearings:
		width_left += bearing.strength
	var signed_lever: float = piece.position.x / S - piece.hinge.position.x / S if is_instance_valid(piece.hinge) else previous.center - previous.pivot
	var lever := absf(signed_lever)
	var load_count: float = piece.ids.size()
	var reserve: float = previous.get("reserve", 1.0)
	var utilization := INF
	var axial_utilization := INF
	if width_left > 0:
		axial_utilization = load_count / (1800.0 * width_left) / reserve
		utilization = (load_count / (1800.0 * width_left) + load_count * lever / (7000.0 * width_left * width_left)) / reserve
		var ids: Array = piece.ids.duplicate()
		for bearing in bearings:
			var id: int = bearing.id + world.width
			while _live_static(id) and world.roles[id] == 1:
				ids.append(id)
				id += world.width
		var lengths := pillar_lengths(ids)
		utilization = maxf(utilization, column_load(bearings, lengths, load_count, lever, piece.rotation) / reserve)
		axial_utilization = maxf(axial_utilization, column_load(bearings, lengths, load_count, 0.0, piece.rotation) / reserve)
	var result: Dictionary = previous.duplicate(true)
	result.merge({"bearings": bearings, "cuts": bearings, "width": width_left, "load": piece.ids.size(), "utilization": utilization, "axialUtilization": axial_utilization, "signedLever": signed_lever}, true)
	return result

func support_bodies() -> Dictionary:
	var supported := {}
	if is_instance_valid(world.static_body):
		supported[world.static_body] = true
	if is_instance_valid(world.boundary):
		supported[world.boundary] = true
	for pass_index in range(world.pieces.size() + 1):
		var changed := false
		for sample in world.contact_samples:
			var piece = sample.piece
			if not is_instance_valid(piece) or not world.pieces.has(piece) or supported.has(piece):
				continue
			var base = sample.other if sample.other != null else sample.collider
			if not is_instance_valid(base) or not supported.has(base) or sample.normal.y > -0.7:
				continue
			if not sample.points.any(func(q): return q.y >= piece.position.y / S - 0.5):
				continue
			supported[piece] = true
			changed = true
		if not changed:
			break
	return supported

func support_pixels(piece, supported: Dictionary) -> Array:
	var ids := {}
	if is_instance_valid(piece.hinge) and _live_static(piece.support_id):
		ids[piece.anchor_id] = true
	for sample in world.contact_samples:
		if sample.piece != piece:
			continue
		var base = sample.other if sample.other != null else sample.collider
		if not is_instance_valid(base) or not supported.has(base) or sample.normal.y > -0.7:
			continue
		for point in sample.points:
			if point.y < piece.position.y / S - 0.5:
				continue
			var nearest := -1
			var distance := INF
			for id in piece.ids:
				var d: float = piece.pixel_position(id).distance_squared_to(point)
				if d < distance:
					distance = d
					nearest = id
			if nearest >= 0:
				ids[nearest] = true
	return ids.keys()

func support_cut_limit(piece, supported: Dictionary) -> float:
	if is_instance_valid(piece.hinge) and _live_static(piece.support_id):
		return _row(piece.anchor_id) + 1.0
	var limit := INF
	for sample in world.contact_samples:
		if sample.piece != piece:
			continue
		var base = sample.other if sample.other != null else sample.collider
		if not is_instance_valid(base) or not supported.has(base) or sample.normal.y > -0.7:
			continue
		for point in sample.points:
			if point.y >= piece.position.y / S - 0.5:
				var relative: Vector2 = (point - piece.position / S).rotated(-piece.rotation)
				limit = minf(limit, piece.origin_center.y + relative.y + 0.5)
	return limit

func release_unsupported() -> void:
	for group in world.groups(world.static_ids()):
		if not group.any(func(id): return world.grounded_id(id)):
			world.release(group)

func check_static() -> bool:
	var changed := false
	for group in world.groups(world.static_ids()):
		var support_ids: Array = group.filter(func(id): return world.grounded_id(id))
		if support_ids.is_empty():
			continue
		var readings := sections(group, 0.0, INF, support_ids)
		var section: Dictionary = {}
		for reading in readings:
			if reading.utilization > 1.0 or absf(reading.center - reading.pivot) > 0.1:
				section = reading
				break
		if not readings.is_empty():
			last_load = readings[0]
		if section.is_empty():
			continue
		last_load = section
		var piece = world.release(section.above)
		if piece == null:
			continue
		var anchor: Dictionary = section.bearings[0]
		for bearing in section.bearings:
			if absf(bearing.x - section.pivot) < absf(anchor.x - section.pivot):
				anchor = bearing
		world.attach_hinge(piece, Vector2(section.pivot, section.y + 1), anchor.id, anchor.id + world.width)
		piece.set_meta("section", section.duplicate(true))
		piece.set_meta("structural_hinge", {"section": section.duplicate(true), "age": 0.0})
		piece.hinge_age = 0.0
		changed = true
		_note({"kind": "pillar-strain", "x": section.pivot, "y": section.y + 1, "width": section.width, "utilization": section.utilization})
	return changed

func finish_structure_change() -> void:
	if finishing:
		return
	finishing = true
	_update_hinges()
	world.sync_static()
	world.rasterize()
	world.enforce_body_budget()
	reconcile_joints()
	finishing = false

func column_breaks(piece, section: Dictionary) -> Array:
	var owned := _owned(piece.ids)
	var visited := {}
	var cuts: Array = []
	for bearing in section.bearings:
		var seed: int = bearing.id if world.roles[bearing.id] == 1 else bearing.id + world.width
		if visited.has(seed):
			continue
		if not owned.has(seed) or world.roles[seed] != 1:
			cuts.append(bearing)
			continue
		var shaft: Array = [seed]
		visited[seed] = true
		var n := 0
		while n < shaft.size():
			for id in world.neighbors(shaft[n]):
				if not owned.has(id) or visited.has(id) or world.roles[id] != 1 or float(world.bonds.get(world.bond_key(shaft[n], id), 0.0)) >= 1.0:
					continue
				visited[id] = true
				shaft.append(id)
			n += 1
		var rows := {}
		var left: int = world.width
		var right := 0
		for id in shaft:
			left = mini(left, int(id) % world.width)
			right = maxi(right, int(id) % world.width)
			for upper in [id - world.width, id]:
				if not owned.has(upper) or not owned.has(upper + world.width):
					continue
				var y := _row(upper)
				if not rows.has(y):
					rows[y] = {}
				rows[y][upper] = {"id": upper, "x": world.original_point(upper).x, "strength": _strength(upper), "pillar": true}
		var options: Array = []
		for y in rows:
			var bearings: Array = rows[y].values().filter(func(b): return b.strength > 0.0)
			if bearings.is_empty():
				continue
			var width_left := 0.0
			for b in bearings:
				width_left += b.strength
			var original := 0
			for x in range(left, right + 1):
				if world.fixture.cells[y * world.width + x] and world.fixture.cells[(y + 1) * world.width + x]:
					original += 1
			options.append({"bearings": bearings, "y": y, "ratio": width_left / maxi(1, original), "joint": bearings.any(func(b): return world.roles[b.id] != 1 and world.roles[b.id + world.width] == 1)})
		var weak: Array = options.filter(func(s): return s.ratio < 0.999)
		weak.sort_custom(func(a, b): return a.ratio < b.ratio if not is_equal_approx(a.ratio, b.ratio) else a.y < b.y)
		var joints: Array = options.filter(func(s): return s.joint)
		joints.sort_custom(func(a, b): return a.y < b.y)
		cuts.append_array(weak[0].bearings if not weak.is_empty() else (joints[0].bearings if not joints.is_empty() else [bearing]))
	return cuts

func load_strain(state: Dictionary, piece, section: Dictionary, dt: float) -> float:
	var xs: PackedStringArray = []
	for bearing in section.bearings:
		xs.append(str(bearing.x))
	var location := "%s:%s" % [section.y, ",".join(xs)]
	var direction := signf(section.signedLever)
	if state.get("location", "") != location or (state.get("direction", 0.0) != 0.0 and direction != 0.0 and state.direction != direction):
		state.age = 0.0
	state.location = location
	state.direction = direction
	var speed: float = piece.get_meta("load_angular_speed", piece.angular_velocity)
	var demand: float = section.axialUtilization if section.signedLever * speed < -0.002 else section.utilization
	state.age = maxf(0.0, float(state.get("age", 0.0)) + dt * (minf(4.0, demand - 1.0) if demand > 1.0 else -2.0))
	return state.age

func _snap_hinge(piece, section: Dictionary) -> void:
	# The world removes the failed static row and preserves its pixel ledger.
	world._snap_hinge(piece, section)
	if piece.has_meta("structural_hinge"):
		piece.remove_meta("structural_hinge")
	piece.set_meta("tilt_stopped", true)
	_record_snap(section, false)

func check_structure(dt: float) -> void:
	reconcile_joints()
	var supported := support_bodies()
	for piece in world.pieces.duplicate():
		if not is_instance_valid(piece) or not world.pieces.has(piece):
			continue
		var last: float = piece.get_meta("last_structure_angle", piece.rotation - piece.angular_velocity * dt)
		piece.set_meta("load_angular_speed", (piece.rotation - last) / dt)
		piece.set_meta("last_structure_angle", piece.rotation)
		if piece.has_meta("structural_hinge"):
			var state: Dictionary = piece.get_meta("structural_hinge")
			var live := live_hinge_section(piece)
			if not live.is_empty():
				last_load = live
				piece.hinge_age = load_strain(state, piece, live, dt)
				piece.set_meta("structural_hinge", state)
				if not is_instance_valid(piece.hinge) or state.age >= 0.65:
					_snap_hinge(piece, live)
					return
		if not is_instance_valid(piece.hinge) and not supported.has(piece):
			piece.set_meta("column_strain", {})
			continue
		var readings := sections(piece.ids, piece.rotation, support_cut_limit(piece, supported), support_pixels(piece, supported))
		if readings.is_empty() or readings[0].utilization <= 1.0:
			piece.set_meta("column_strain", {})
			continue
		var section: Dictionary = readings[0]
		last_load = section
		var state: Dictionary = piece.get_meta("column_strain", {})
		var age := load_strain(state, piece, section, dt)
		piece.set_meta("column_strain", state)
		if age < 0.35:
			continue
		var cuts := column_breaks(piece, section)
		if not cuts.is_empty() and cuts.all(func(b): return world.roles[b.id] != 1 and world.roles[b.id + world.width] == 1):
			begin_yield(piece, section, cuts)
			break
		for bearing in cuts:
			world.bonds[world.bond_key(bearing.id, bearing.id + world.width)] = 1.0
		var partitions: Array = world.groups(piece.ids)
		if partitions.size() > 1:
			_split_piece(piece, partitions)
			var snapped: Dictionary = section.duplicate(true)
			if not cuts.is_empty():
				snapped.y = _row(cuts[0].id)
				snapped.width = cuts.size()
				snapped.pivot = 0.0
				for bearing in cuts:
					snapped.pivot += bearing.x / cuts.size()
			_record_snap(snapped)
			finish_structure_change()
		else:
			piece.set_meta("column_strain", {})
		break
	reconcile_joints()

func _split_piece(piece, partitions: Array) -> Array:
	# Keep the removed body alive through child construction for pixel pose/momentum.
	var anchored := is_instance_valid(piece.hinge)
	var pivot: Vector2 = piece.hinge.position / S if anchored else Vector2.ZERO
	var anchor: int = piece.anchor_id
	var support: int = piece.support_id
	var age: float = piece.hinge_age
	world.remove_piece(piece)
	var children: Array = []
	for group in partitions:
		var child = world.add_piece(group, piece)
		if child != null:
			if anchored and group.has(anchor) and _live_static(support):
				world.attach_hinge(child, pivot, anchor, support)
				child.hinge_age = age
				if piece.has_meta("structural_hinge"):
					child.set_meta("structural_hinge", piece.get_meta("structural_hinge").duplicate(true))
					child.set_meta("section", piece.get_meta("section").duplicate(true))
			children.append(child)
	return children

func begin_yield(piece, section: Dictionary, cuts: Array) -> void:
	var previous: Array = []
	for bearing in cuts:
		var key: int = world.bond_key(bearing.id, bearing.id + world.width)
		previous.append(world.bonds.get(key, null))
		world.bonds[key] = 1.0
	var partitions: Array = world.groups(piece.ids)
	if partitions.size() < 2:
		for n in range(cuts.size()):
			var key: int = world.bond_key(cuts[n].id, cuts[n].id + world.width)
			if previous[n] == null:
				world.bonds.erase(key)
			else:
				world.bonds[key] = previous[n]
		return
	var old_center: Vector2 = piece.position
	var motion: Dictionary = pose_motion.get(piece.get_instance_id(), {"velocity": piece.linear_velocity, "angular": piece.angular_velocity})
	var children := _split_piece(piece, partitions)
	for child in children:
		var r: Vector2 = child.position - old_center
		child.linear_velocity = motion.velocity + Vector2(-r.y, r.x) * motion.angular
		child.angular_velocity = motion.angular
	var seams := _seams(cuts, _owners(children))
	for seam in seams.values():
		joint_yields += 1
		var joint = YieldJoint.new()
		joint.configure(world, seam, section, joint_yields)
		yield_joints.append(joint)
		_note(joint.event("joint-yield"))
	_refresh_joint_filters()
	finish_structure_change()
	reconcile_joints()

func _owners(pieces: Array) -> Dictionary:
	var result := {}
	for piece in pieces:
		for id in piece.ids:
			result[id] = piece
	return result

func _seams(cuts: Array, owners: Dictionary) -> Dictionary:
	var seams := {}
	for cut in cuts:
		var upper = owners.get(cut.id)
		var lower = owners.get(cut.id + world.width)
		if upper == null or lower == null or upper == lower:
			continue
		var key := "%d:%d" % [upper.get_instance_id(), lower.get_instance_id()]
		if not seams.has(key):
			seams[key] = {"upper": upper, "lower": lower, "cuts": []}
		seams[key].cuts.append(cut)
	return seams

func on_piece_removed(piece) -> void:
	for joint in yield_joints:
		if joint.phase == "yielding" and (joint.upper == piece or joint.lower == piece):
			joint.disconnect_joint()
			joint.pending = true
	previous_pose.erase(piece.get_instance_id())
	# pose_motion remains available while the caller constructs replacement children.

func on_piece_added(piece, parent = null) -> void:
	piece.set_meta("tilt_stopped", parent != null)
	piece.set_meta("tilt_seconds", 0.0)
	if parent != null and is_instance_valid(piece.hinge) and parent.has_meta("structural_hinge"):
		piece.set_meta("structural_hinge", parent.get_meta("structural_hinge").duplicate(true))
		piece.set_meta("section", parent.get_meta("section").duplicate(true))
		piece.hinge_age = parent.hinge_age
	previous_pose[piece.get_instance_id()] = {"position": piece.position, "angle": piece.rotation}

func reconcile_joints() -> void:
	var owners := _owners(world.pieces)
	var changed := false
	for joint in yield_joints:
		if joint.phase != "yielding" or not joint.pending:
			continue
		var seams: Array = _seams(joint.cuts, owners).values()
		seams.sort_custom(func(a, b): return a.cuts.size() > b.cuts.size())
		if seams.is_empty():
			_release_joint(joint, "material-destroyed")
		else:
			joint.upper = seams[0].upper
			joint.lower = seams[0].lower
			joint.cuts = seams[0].cuts
			if not joint.connect_joint():
				_release_joint(joint, "material-destroyed")
		changed = true
	if changed:
		_refresh_joint_filters()

func _clear_collision_exceptions() -> void:
	for pair in collision_exceptions:
		if is_instance_valid(pair[0]) and is_instance_valid(pair[1]):
			pair[0].remove_collision_exception_with(pair[1])
			pair[1].remove_collision_exception_with(pair[0])
	collision_exceptions.clear()

func _refresh_joint_filters() -> void:
	_clear_collision_exceptions()
	var links := {}
	for joint in yield_joints:
		if joint.phase != "yielding" or joint.pending:
			continue
		for pair in [[joint.upper, joint.lower], [joint.lower, joint.upper]]:
			if not links.has(pair[0]):
				links[pair[0]] = []
			links[pair[0]].append(pair[1])
	var seen := {}
	for first in links:
		if seen.has(first):
			continue
		var queue: Array = [first]
		seen[first] = true
		var n := 0
		while n < queue.size():
			for other in links[queue[n]]:
				if not seen.has(other):
					seen[other] = true
					queue.append(other)
			n += 1
		# Matter's negative group suppresses every pair in a connected articulation.
		for i in range(queue.size()):
			for j in range(i + 1, queue.size()):
				queue[i].add_collision_exception_with(queue[j])
				queue[j].add_collision_exception_with(queue[i])
				collision_exceptions.append([queue[i], queue[j]])

func grounded_joints() -> Dictionary:
	var supported := support_bodies()
	for piece in world.pieces:
		if is_instance_valid(piece.hinge) and _live_static(piece.support_id):
			supported[piece] = true
	for pass_index in range(yield_joints.size()):
		var changed := false
		for joint in yield_joints:
			if joint.phase == "yielding" and not joint.pending and supported.has(joint.lower) and not supported.has(joint.upper):
				supported[joint.upper] = true
				changed = true
		if not changed:
			break
	return supported

func _release_joint(joint, reason: String) -> void:
	if joint.phase != "yielding":
		return
	_note(joint.release(reason))
	joint_breaks += 1
	_refresh_joint_filters()

func _capture_motion(dt: float) -> void:
	var current := {}
	var motions := {}
	for piece in world.pieces:
		var id: int = piece.get_instance_id()
		var before: Dictionary = previous_pose.get(id, {})
		if not before.is_empty():
			motions[id] = {"velocity": (piece.position - before.position) / dt, "angular": (piece.rotation - before.angle) / dt}
		current[id] = {"position": piece.position, "angle": piece.rotation}
	previous_pose = current
	pose_motion = motions

func _release_angle(piece) -> float:
	var joint: Dictionary = piece.get_meta("support_joint", {})
	if joint.is_empty() or joint.original == 0:
		return 0.5
	var remaining := 0
	for id in joint.lower:
		remaining += int(_live_static(id))
	var fraction: float = float(remaining) / joint.original
	return 0.5 * (0.24 + 0.76 * fraction * fraction)

func register_hinge(piece) -> void:
	var row := _row(piece.support_id) - 1
	var group: int = world._original_groups.get(piece.anchor_id, 0)
	var bearings: Array = []
	for id in world._original_groups:
		if world._original_groups[id] == group and _row(id) == row and world.fixture.cells[id + world.width]:
			bearings.append(id)
	var lower: Array = []
	for id in bearings:
		if piece.ids.has(id):
			lower.append(id + world.width)
	piece.set_meta("support_joint", {"original": bearings.size(), "lower": lower})

func _update_hinges() -> void:
	for piece in world.pieces:
		if not is_instance_valid(piece.hinge):
			continue
		if not _live_static(piece.support_id) or absf(piece.rotation) > _release_angle(piece):
			piece.hinge.queue_free()
			piece.hinge = null
			piece.bearing_constraint.clear()
			piece.set_meta("tilt_stopped", true)
			_note({"kind": "tear", "x": piece.position.x / S, "y": piece.position.y / S, "count": piece.ids.size()})

func _assist_tilt(dt: float) -> void:
	for piece in world.pieces:
		if not is_instance_valid(piece.hinge) or not _live_static(piece.support_id):
			if float(piece.get_meta("tilt_seconds", 0.0)) > 0.0:
				piece.set_meta("tilt_stopped", true)
			continue
		if bool(piece.get_meta("tilt_stopped", false)) or piece.sleeping:
			continue
		var pivot: Vector2 = piece.hinge.position / S
		for sample in world.contact_samples:
			if sample.piece != piece:
				continue
			var pivot_only: bool = sample.collider == world.static_body and not sample.points.is_empty()
			for point in sample.points:
				if point.distance_to(pivot) > 2.0:
					pivot_only = false
			if not pivot_only:
				piece.set_meta("tilt_stopped", true)
				break
		if bool(piece.get_meta("tilt_stopped", false)):
			continue
		# Source .00007 gravity in ms² is 70 cells/s²; native torque uses px².
		var torque: float = piece.mass * 70.0 * S * (piece.position.x - piece.hinge.position.x)
		if absf(piece.angular_velocity / 60.0) < 0.00001 or piece.angular_velocity * torque <= 0.0:
			continue
		var seconds := minf(10.0, float(piece.get_meta("tilt_seconds", 0.0)) + dt)
		piece.set_meta("tilt_seconds", seconds)
		piece.angular_velocity += 9.0 * seconds / 10.0 * torque / piece.inertia * dt

func _quiet(piece) -> bool:
	return not is_instance_valid(piece.hinge) and (piece.linear_velocity.length() + absf(piece.angular_velocity) * piece.motion_radius) / S / 60.0 < 0.025

func _update_resting(dt: float) -> void:
	var live := _owned(world.pieces)
	if is_instance_valid(world.static_body):
		live[world.static_body] = true
	if is_instance_valid(world.boundary):
		live[world.boundary] = true
	var contacts := {}
	for piece in world.pieces:
		var id: int = piece.get_instance_id()
		if not piece.sleeping or not rest_contacts.has(id):
			continue
		var retained: Array = []
		for contact in rest_contacts[id]:
			var base = contact.base
			if not is_instance_valid(base) or not live.has(base):
				continue
			var radius: float = base.motion_radius / S if base is RigidBody2D else 1.0
			if (base.position / S).distance_to(contact.position) + absf(base.rotation - contact.angle) * radius < 0.01:
				retained.append(contact)
		contacts[id] = retained
	for sample in world.contact_samples:
		var piece = sample.piece
		var base = sample.other if sample.other != null else sample.collider
		if not is_instance_valid(piece) or not live.has(piece) or piece.sleeping or not is_instance_valid(base) or not live.has(base) or sample.normal.y > -0.7:
			continue
		var points: Array = sample.points.filter(func(q): return q.y > piece.position.y / S)
		if points.is_empty():
			continue
		var left := INF
		var right := -INF
		for point in points:
			left = minf(left, point.x)
			right = maxf(right, point.x)
		var id: int = piece.get_instance_id()
		if not contacts.has(id):
			contacts[id] = []
		contacts[id].append({"base": base, "position": base.position / S, "angle": base.rotation, "left": left, "right": right})
	var supported := {}
	if is_instance_valid(world.static_body):
		supported[world.static_body] = true
	if is_instance_valid(world.boundary):
		supported[world.boundary] = true
	for pass_index in range(world.pieces.size()):
		var changed := false
		for piece in world.pieces:
			if supported.has(piece) or not _quiet(piece):
				continue
			var bases: Array = contacts.get(piece.get_instance_id(), []).filter(func(c): return supported.has(c.base))
			if bases.is_empty():
				continue
			var left := INF
			var right := -INF
			for contact in bases:
				left = minf(left, contact.left)
				right = maxf(right, contact.right)
			if piece.position.x / S < left + 0.1 or piece.position.x / S > right - 0.1:
				continue
			supported[piece] = true
			changed = true
		if not changed:
			break
	for piece in world.pieces:
		piece.can_sleep = false
		if not supported.has(piece):
			piece.set_meta("rest_frames", 0.0)
			piece.sleeping = false
		else:
			var frames := float(piece.get_meta("rest_frames", 0.0)) + dt * 60.0
			piece.set_meta("rest_frames", frames)
			if frames >= 45.0:
				piece.sleeping = true
	rest_contacts = contacts

func step(dt: float) -> void:
	if dt <= 0.0:
		return
	_capture_motion(dt)
	reconcile_joints()
	_update_resting(dt)
	var supported := grounded_joints()
	for joint in yield_joints.duplicate():
		var reason: String = joint.advance(dt, supported)
		if not reason.is_empty():
			_release_joint(joint, reason)
	yield_joints = yield_joints.filter(func(j): return j.phase == "yielding")
	_assist_tilt(dt)
	_update_hinges()
	structure_clock += dt
	if structure_clock < 0.1 - 0.0000001:
		return
	var h := structure_clock
	structure_clock = 0.0
	check_structure(h)
	static_check_clock += h
	if static_check_clock >= 0.5:
		static_check_clock = 0.0
		if check_static():
			finish_structure_change()

func _record_snap(section: Dictionary, record_event := true) -> void:
	snap_count += 1
	if record_event:
		_note({"kind": "pillar-snap", "x": section.pivot, "y": section.y + 1, "width": section.width, "utilization": section.utilization})

func _note(event: Dictionary) -> void:
	event.time = world.elapsed
	world.events.append(event)
