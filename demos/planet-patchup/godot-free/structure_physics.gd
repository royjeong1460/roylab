extends RefCounted

const SectionGraph = preload("res://section_graph.gd")
const YieldJoint = preload("res://yield_joint.gd")
const S := 4.0
var _native = ClassDB.instantiate("PPStructureKernel")
var _section_cache := {}
var _section_bonds := {}
var _topology_cache := {}

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
var _body_rows := {}
var _body_bounds := {}

func setup(owner_world: Node) -> void:
	world = owner_world

func reset() -> void:
	_section_cache.clear()
	_section_bonds.clear()
	_topology_cache.clear()
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
	_body_rows.clear()
	_body_bounds.clear()
	# Authored row widths are calculated in the native bulk kernel.
	var baseline: Dictionary = _native.baseline(world.fixture.cells, world.roles, world.fixture.get("module_of", []), world.width)
	_body_rows = baseline.rows
	_body_bounds = baseline.bounds

func _damaged_body_support(bearings: Array, y: int) -> bool:
	return _native.damaged(bearings, y, world.roles, world.fixture.get("module_of", []), world.width, _body_rows, _body_bounds, column_failure)

func _owned(ids: Array) -> Dictionary:
	return _native.owned(ids)

func _row(id: int) -> int:
	return floori(float(id) / world.width)

func _live_static(id: int) -> bool:
	return id >= 0 and id < world.cells.size() and world.cells[id] != 0

func _strength(id: int) -> float:
	return maxf(0.0, 1.0 - float(world.bonds.get(world.bond_key(id, id + world.width), 0.0)))

func pillar_lengths(ids: Array) -> Dictionary:
	return _native.pillar_lengths(ids, world.roles, world.bonds, world.width, world.cells.size())

func column_load(bearings: Array, lengths: Dictionary, load_count: float, lever: float, angle: float) -> float:
	return _native.column_load(bearings, lengths, load_count, lever, angle, world.width, column_failure)

func _invalidate_section_cache() -> void:
	world.perf.begin(world.perf.CACHE)
	_invalidate_section_cache_unprofiled()
	world.perf.end()

func _invalidate_section_cache_unprofiled() -> void:
	_native.invalidate(world.bonds, _section_bonds, _section_cache, _topology_cache, world.width, world.cells.size())
	_section_bonds = world.bonds.duplicate()

func sections(ids: Array, angle := 0.0, cut_limit := INF, support_ids = null, selected_only := false) -> Array:
	world.perf.begin(world.perf.SECTION)
	var result: Array = sections_unprofiled(ids, angle, cut_limit, support_ids, selected_only)
	world.perf.end()
	return result

func sections_unprofiled(ids: Array, angle := 0.0, cut_limit := INF, support_ids = null, selected_only := false) -> Array:
	if ids.is_empty():
		return []
	_invalidate_section_cache()
	# Geometry depends on integer rows; angle, reserve and live load stay uncached.
	var cut_row: int = world.height if cut_limit >= world.height else floori(cut_limit)
	var key: int = ids[0]
	var cached: Dictionary = _section_cache.get(key, {})
	if cached.is_empty() or cached.ids != ids or cached.cut_row != cut_row or cached.supports != support_ids or cached.column_failure != column_failure:
		var geometry := _section_geometry(ids, cut_limit, support_ids)
		cached = {"ids": ids.duplicate(), "owned": geometry.owned, "cut_row": cut_row, "supports": null if support_ids == null else support_ids.duplicate(), "column_failure": column_failure, "geometry": geometry}
		if _section_cache.size() >= 64 and not _section_cache.has(key):
			_section_cache.erase(_section_cache.keys()[0])
		_section_cache[key] = cached
	return _native.candidates(cached.geometry, world._reserve, world._original_groups, angle, world.width, column_failure, selected_only)

func _section_topology(ids: Array, support_ids) -> Dictionary:
	world.perf.begin(world.perf.TOPOLOGY)
	var result: Dictionary = _section_topology_unprofiled(ids, support_ids)
	world.perf.end()
	return result

func _section_topology_unprofiled(ids: Array, support_ids) -> Dictionary:
	var key: int = ids[0]
	var cached: Dictionary = _topology_cache.get(key, {})
	if not cached.is_empty() and cached.ids == ids and cached.column_failure == column_failure:
		if world.perf.enabled:
			world.perf.topology_reuses += 1
		return cached
	cached = _native.topology(ids, world.roles, world.bonds, world.width, world.cells.size(), world._original_points)
	cached.merge({"ids": ids.duplicate(), "supports": null if support_ids == null else support_ids.duplicate(), "column_failure": column_failure, "cuts": {}, "graph": null})
	if _topology_cache.size() >= 64 and not _topology_cache.has(key):
		_topology_cache.erase(_topology_cache.keys()[0])
	_topology_cache[key] = cached
	return cached

func _section_geometry(ids: Array, cut_limit: float, support_ids) -> Dictionary:
	world.perf.begin(world.perf.GEOMETRY)
	var result: Dictionary = _section_geometry_unprofiled(ids, cut_limit, support_ids)
	world.perf.end()
	return result

func _section_geometry_unprofiled(ids: Array, cut_limit: float, support_ids) -> Dictionary:
	var topology := _section_topology(ids, support_ids)
	return _native.geometry(topology, world, ids, cut_limit, support_ids, column_failure, _body_rows, _body_bounds)

func live_hinge_section(piece) -> Dictionary:
	world.perf.begin(world.perf.HINGE)
	var result: Dictionary = live_hinge_section_unprofiled(piece)
	world.perf.end()
	return result

func live_hinge_section_unprofiled(piece) -> Dictionary:
	var previous: Dictionary = piece.get_meta("section", {})
	if previous.is_empty():
		return {}
	var bearings: Array = _native.live_bearings(previous.bearings, piece.ids, world.cells, world.bonds, world.width)
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
		var ids: Array = _native.hinge_ids(piece.ids, bearings, world.cells, world.roles, world.width)
		var lengths := pillar_lengths(ids)
		utilization = maxf(utilization, column_load(bearings, lengths, load_count, lever, piece.rotation) / reserve)
		axial_utilization = maxf(axial_utilization, column_load(bearings, lengths, load_count, 0.0, piece.rotation) / reserve)
	var result: Dictionary = previous.duplicate(true)
	result.merge({"bearings": bearings, "cuts": bearings, "width": width_left, "load": piece.ids.size(), "utilization": utilization, "axialUtilization": axial_utilization, "signedLever": signed_lever}, true)
	return result

func support_bodies() -> Dictionary:
	world.perf.begin(world.perf.GROUND)
	var result: Dictionary = support_bodies_unprofiled()
	world.perf.end()
	return result

func support_bodies_unprofiled() -> Dictionary:
	var initial := _support_initial()
	var piece_y := {}
	for piece in world.pieces:
		piece_y[piece] = piece.position.y / S
	return _native.support_bodies(_contact_records(), piece_y, initial, world.pieces.size() + 1)

func support_pixels(piece, supported: Dictionary) -> Array:
	world.perf.begin(world.perf.CONTACT)
	var result: Array = support_pixels_unprofiled(piece, supported)
	world.perf.end()
	return result

func support_pixels_unprofiled(piece, supported: Dictionary) -> Array:
	var initial: Array = []
	if is_instance_valid(piece.hinge) and _live_static(piece.support_id):
		initial.append(piece.anchor_id)
	return _native.nearest_pixels(piece.ids, world._original_points, piece.origin_center, piece.position, piece.rotation, _support_points(piece, supported), initial)

func support_cut_limit(piece, supported: Dictionary) -> float:
	if is_instance_valid(piece.hinge) and _live_static(piece.support_id):
		return _row(piece.anchor_id) + 1.0
	return _native.cut_limit(_support_points(piece, supported), piece.origin_center, piece.position, piece.rotation)

func release_unsupported() -> Array:
	var groups: Array = world.groups(world.static_ids())
	var changed := false
	for group in groups:
		if not group.any(func(id): return world.grounded_id(id)):
			world.release(group)
			changed = true
	return [] if changed else groups

func check_static(unchanged_groups: Array = []) -> bool:
	world.perf.begin(world.perf.STATIC)
	var result: bool = check_static_unprofiled(unchanged_groups)
	world.perf.end()
	return result

func check_static_unprofiled(unchanged_groups: Array = []) -> bool:
	var changed := false
	var groups: Array = unchanged_groups if not unchanged_groups.is_empty() else world.groups(world.static_ids())
	for group in groups:
		var support_ids: Array = group.filter(func(id): return world.grounded_id(id))
		if support_ids.is_empty():
			continue
		var readings := sections(group, 0.0, INF, support_ids, true)
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
	return _native.column_breaks(piece.ids, section.bearings, world.roles, world.fixture.cells, world.bonds, world.width, world.cells.size(), world._original_points)

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
		var readings := sections(piece.ids, piece.rotation, support_cut_limit(piece, supported), support_pixels(piece, supported), true)
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

func _split_piece(piece, partitions: Array, keep_bodies := false) -> Array:
	# Keep the removed body alive through child construction for pixel pose/momentum.
	var anchored := is_instance_valid(piece.hinge)
	var pivot: Vector2 = piece.hinge.position / S if anchored else Vector2.ZERO
	var anchor: int = piece.anchor_id
	var support: int = piece.support_id
	var age: float = piece.hinge_age
	world.remove_piece(piece)
	var children: Array = []
	for group in partitions:
		var keep_hinge: bool = anchored and group.has(anchor) and _live_static(support)
		var child = world.add_piece(group, piece, keep_bodies or keep_hinge)
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
	var children := _split_piece(piece, partitions, true)
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
	var snapshots: Array = []
	for piece in pieces:
		snapshots.append({"piece": piece, "ids": piece.ids})
	return _native.owners(snapshots)

func _seams(cuts: Array, owners: Dictionary) -> Dictionary:
	return _native.seams(cuts, owners, world.width)

func fragment_is_linked(ids: Array, parent) -> bool:
	if parent == null:
		return false
	for joint in yield_joints:
		if joint.phase != "yielding":
			continue
		if joint.pending:
			# Multiple rebuilds can precede reconciliation; old owners are then stale.
			for cut in joint.cuts:
				if ids.has(cut.id) or ids.has(cut.id + world.width):
					return true
			continue
		if joint.upper != parent and joint.lower != parent:
			continue
		for cut in joint.cuts:
			var endpoint: int = cut.id if joint.upper == parent else cut.id + world.width
			if ids.has(endpoint):
				return true
	return false

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
	world.perf.begin(world.perf.JOINT)
	reconcile_joints_unprofiled()
	world.perf.end()

func reconcile_joints_unprofiled() -> void:
	if not yield_joints.any(func(joint): return joint.phase == "yielding" and joint.pending):
		return
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
	world.perf.begin(world.perf.JOINT)
	_refresh_joint_filters_unprofiled()
	world.perf.end()

func _refresh_joint_filters_unprofiled() -> void:
	_clear_collision_exceptions()
	var links := {}
	for joint in yield_joints:
		if joint.phase != "yielding" or joint.pending:
			continue
		for pair in [[joint.upper, joint.lower], [joint.lower, joint.upper]]:
			if not links.has(pair[0]):
				links[pair[0]] = []
			links[pair[0]].append(pair[1])
	# Native BFS preserves connected articulation and pair insertion order.
	for pair in _native.collision_pairs(links):
		pair[0].add_collision_exception_with(pair[1])
		pair[1].add_collision_exception_with(pair[0])
		collision_exceptions.append(pair)

func grounded_joints() -> Dictionary:
	world.perf.begin(world.perf.SUPPORT)
	var result: Dictionary = grounded_joints_unprofiled()
	world.perf.end()
	return result

func grounded_joints_unprofiled() -> Dictionary:
	var supported := support_bodies()
	for piece in world.pieces:
		if is_instance_valid(piece.hinge) and _live_static(piece.support_id):
			supported[piece] = true
	var edges: Array = []
	for joint in yield_joints:
		if joint.phase == "yielding" and not joint.pending:
			edges.append([joint.upper, joint.lower])
	return _native.propagate(supported, edges, yield_joints.size())

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
	return _native.release_angle(joint.lower, world.cells, joint.original)

func register_hinge(piece) -> void:
	world.perf.begin(world.perf.HINGE)
	register_hinge_unprofiled(piece)
	world.perf.end()

func register_hinge_unprofiled(piece) -> void:
	var row := _row(piece.support_id) - 1
	var group: int = world._original_groups.get(piece.anchor_id, 0)
	piece.set_meta("support_joint", _native.register_hinge(world._original_groups, group, row, world.fixture.cells, piece.ids, world.width))

func _update_hinges() -> void:
	world.perf.begin(world.perf.HINGE)
	_update_hinges_unprofiled()
	world.perf.end()

func _update_hinges_unprofiled() -> void:
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
	world.perf.begin(world.perf.HINGE)
	_assist_tilt_unprofiled(dt)
	world.perf.end()

func _assist_tilt_unprofiled(dt: float) -> void:
	for piece in world.pieces:
		if not is_instance_valid(piece.hinge) or not _live_static(piece.support_id):
			if float(piece.get_meta("tilt_seconds", 0.0)) > 0.0:
				piece.set_meta("tilt_stopped", true)
			continue
		if bool(piece.get_meta("tilt_stopped", false)) or piece.sleeping:
			continue
		var pivot: Vector2 = piece.hinge.position / S
		if not _native.pivot_only(world.contact_samples, piece, world.static_body, pivot):
			piece.set_meta("tilt_stopped", true)
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
	world.perf.begin(world.perf.REST)
	_update_resting_unprofiled(dt)
	world.perf.end()

func _update_resting_unprofiled(dt: float) -> void:
	var bodies := {}
	for piece in world.pieces:
		bodies[piece] = {"id": piece.get_instance_id(), "position": piece.position / S, "rotation": piece.rotation, "radius": piece.motion_radius / S, "sleeping": piece.sleeping, "quiet": _quiet(piece)}
	var initial := _support_initial()
	for base in initial:
		bodies[base] = {"position": base.position / S, "rotation": base.rotation, "radius": 1.0}
	var result: Dictionary = _native.resting(world.pieces, bodies, _contact_records(), rest_contacts, initial)
	var supported: Dictionary = result.supported
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
	rest_contacts = result.contacts

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

# Engine object validity and contact ownership remain at the GDScript boundary.
func _support_points(piece, supported: Dictionary) -> Array:
	var points: Array = []
	for sample in world.contact_samples:
		if sample.piece != piece:
			continue
		var base = sample.other if sample.other != null else sample.collider
		if not is_instance_valid(base) or not supported.has(base) or sample.normal.y > -0.7:
			continue
		points.append_array(sample.points)
	return points

func _support_initial() -> Dictionary:
	var supported := {}
	if is_instance_valid(world.static_body):
		supported[world.static_body] = true
	if is_instance_valid(world.boundary):
		supported[world.boundary] = true
	return supported

func _contact_records() -> Array:
	var records: Array = []
	for sample in world.contact_samples:
		var base = sample.other if sample.other != null else sample.collider
		if is_instance_valid(sample.piece) and world.pieces.has(sample.piece) and is_instance_valid(base):
			records.append({"piece": sample.piece, "base": base, "normal": sample.normal, "points": sample.points})
	return records
