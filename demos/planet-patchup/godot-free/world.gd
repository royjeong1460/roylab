extends Node2D

const PerformanceProbe = preload("res://performance_probe.gd")
var perf := PerformanceProbe.new()
var native_pixels = ClassDB.instantiate("PPPixelKernel")
var native_world = ClassDB.instantiate("PPWorldKernel")

const GameSkin = preload("res://app/skin.gd")
const PixelSurface = preload("res://presentation/pixel_surface.gd")

const FractureGraph = preload("res://fracture_graph.gd")
const FractureConnectivity = preload("res://fracture_connectivity.gd")
const Piece = preload("res://piece.gd")
const StructurePhysics = preload("res://structure_physics.gd")
const BlackHolePhysics = preload("res://blackhole_physics.gd")
const SkillPhysics = preload("res://skill_physics.gd")
const ChainPhysics = preload("res://chain_physics.gd")
const ImpactPhysics = preload("res://impact_physics.gd")
const GrainPhysics = preload("res://grain_physics.gd")
const GrainSurface = preload("res://presentation/grain_surface.gd")
var _grain_surface = GrainSurface.new()
var structure_physics := StructurePhysics.new()
var blackhole_physics := BlackHolePhysics.new()
var skill_physics := SkillPhysics.new()
var chain_physics := ChainPhysics.new()
var impact_physics := ImpactPhysics.new()
var grain_physics := GrainPhysics.new()
var pending_contacts: Array = []
var contact_samples: Array = []
var profile_upgrades := {}
var edition := "paid"
var auto_collect_clock := 0.0
var final_collection := false
var final_collection_active := false
var finishing_requested := false
var finishing_supports: Dictionary = {}
const S := 4.0
const COLLECTIBLE_FILL := Color("a8dfc4")
const COLLECTIBLE_RIM := Color("518c76")
const BODY_LIMIT := 18
const SAND_FRAGMENT_MAX := 16
var sand_fragment_count := 0
var bonds := {}
var fracture_graph := FractureGraph.new()
var fixture: Dictionary = {}
var terrain: Array = []
var ground_surface := PackedInt32Array()
var has_terrain := false
var starting_stats := {}
var starting_equipped := {}
var allowed_tools: Array = ["bomb"]
var used_tools: Array = []
var energy_used := 0.0
var settled := false
var simulated_ms := 0.0
var _static_cache: Array = []
var _static_dirty := true
var _static_revision := 0
var _raster_static_revision := -1
var _raster_dimensions := Vector2i.ZERO
var _raster_order: Array = []
var _raster_bodies := {}
var _raster_dynamic := PackedByteArray()
var _raster_valid := false
var occupancy_revision := 0
var _neighbor_cache: Array = []
var _original_points := PackedVector2Array()
var _grounded_cells := PackedByteArray()
var _material_pixels: Array = []
var _material_ids: Array = []
var _static_material: Array = []
var _blast_depth := 0
var _static_surface_rects: Array = []
var _static_geometry_valid := false
var _static_geometry_ids: Array = []
var _static_geometry_rects: Array = []
var _static_geometry_shapes: Array = []
var width := 115
var height := 157
var floor_y := 145
var initial := 2000
var cells := PackedByteArray()
var roles := PackedByteArray()
var colors: Array = []
var pieces: Array = []
var grains: Array = []
# External additions/removals notify GrainPhysics and a separate render journal.
# Internal landing/displacement updates those rosters synchronously.
var grain_roster_revision := 0
var grain_render_added: Dictionary = {}
var grain_render_removed: Dictionary = {}
var grain_render_reset := 0
var grain_render_revision := 0
var collected := {}
var bombs: Array = []
var wells: Array = []
var pending_impacts: Array = []
var connections: Array = []
var elapsed := 0.0
var structure_clock := 0.0
var max_angle := 0.0
var fractures := 0
var blasts := 0
var released := 0
var suction_budget := 0.0
var charge := 60.0
var paused := false
var auto_advance := false
var stats: Dictionary
var events: Array = []
var impact_samples: Array = []
var static_body: StaticBody2D
var static_sprite: MeshInstance2D
var _pixel_atlas: ImageTexture
var occupancy := PackedByteArray()
var grain_occupancy := {}
var boundary: StaticBody2D
var rng = preload("res://source_random.gd").new()
var last_cpu_us := 0
var _original_groups := {}
var _reserve := {}

func configure_site(site: Dictionary, profile_stats: Dictionary, equipped: Dictionary) -> void:
	fixture = site # Authored map data is immutable; only cells/roles become mutable packed arrays.
	starting_stats = profile_stats.duplicate(true)
	starting_equipped = equipped.duplicate(true)
	allowed_tools = equipped.get("owned", ["bomb"]).duplicate()

func ground_y(x: float) -> float:
	return float(ground_surface[clampi(floori(x), 0, width - 1)]) if not ground_surface.is_empty() else float(floor_y)

func grounded_id(id: int) -> bool:
	return id >= 0 and id < _grounded_cells.size() and _grounded_cells[id] != 0

func is_terrain_cell(id: int) -> bool:
	return id >= 0 and id < width * height and floori(float(id) / width) >= ground_y(float(id % width))

func _ready() -> void:
	if fixture.is_empty():
		fixture = JSON.parse_string(FileAccess.get_file_as_string("res://data/maps/arch-1-arch-quarter-v2.json"))
	assert(fixture is Dictionary, "Arch Lane fixture must exist")
	width = int(fixture.width)
	height = int(fixture.height)
	floor_y = int(fixture.floor_y)
	# Map coordinates never change when a body moves or breaks. Preserve the
	# original expression once, including its float division and half-cell offset.
	_original_points.resize(width * height)
	for id in range(_original_points.size()):
		_original_points[id] = Vector2(id % width + 0.5, floori(float(id) / width) + 0.5)
	colors = fixture.colors
	roles = PackedByteArray(fixture.roles)
	stats = starting_stats.duplicate(true) if not starting_stats.is_empty() else SkillPhysics.profile_stats(profile_upgrades, edition)
	structure_physics.setup(self)
	blackhole_physics.setup(self)
	skill_physics.setup(self)
	chain_physics.setup(self)
	impact_physics.setup(self)
	grain_physics.setup(self)
	add_child(_grain_surface)
	terrain = fixture.get("terrain", []) if fixture.get("terrain") is Array else []
	has_terrain = not terrain.is_empty()
	if terrain.is_empty():
		terrain = [{"x": 0, "w": width, "y": floor_y}]
	ground_surface.resize(width)
	ground_surface.fill(floor_y)
	boundary = StaticBody2D.new()
	var ground_material := PhysicsMaterial.new()
	ground_material.friction = 0.8
	ground_material.bounce = 0.05
	boundary.physics_material_override = ground_material
	add_child(boundary)
	for span in terrain:
		for x in range(int(span.x), int(span.x + span.w)):
			ground_surface[x] = int(span.y)
		_add_collider(boundary, Rect2(span.x, span.y, span.w, floor_y + 10 - span.y))
	for rect in [Rect2(-10, -height, 10, height * 3), Rect2(width, -height, 10, height * 3)]:
		_add_collider(boundary, rect)
	var skills: Dictionary = starting_equipped.get("skills", {})
	skill_physics.configure_loadout(starting_equipped.get("passive", []), starting_equipped.get("active", []), skills, "paid")
	reset()

func reset() -> void:
	sand_fragment_count = 0
	structure_physics.reset()
	blackhole_physics.reset()
	skill_physics.reset()
	chain_physics.reset()
	grain_physics.reset()
	pending_contacts.clear()
	contact_samples.clear()
	auto_collect_clock = 0.0
	final_collection_active = false
	finishing_requested = false
	finishing_supports.clear()
	for piece in pieces.duplicate():
		remove_piece(piece)
	for connection in connections:
		if is_instance_valid(connection.joint):
			connection.joint.queue_free()
	connections.clear()
	grains.clear()
	grain_roster_revision += 1
	grain_render_revision = grain_roster_revision
	grain_render_reset += 1
	grain_render_added.clear()
	grain_render_removed.clear()
	collected.clear()
	bombs.clear()
	wells.clear()
	pending_impacts.clear()
	events.clear()
	impact_samples.clear()
	bonds.clear()
	elapsed = 0
	structure_clock = 0
	used_tools.clear()
	energy_used = 0
	settled = false
	simulated_ms = 0
	max_angle = 0
	fractures = 0
	blasts = 0
	released = 0
	suction_budget = 0
	charge = float(stats.capacity)
	cells = PackedByteArray(fixture.cells)
	_grounded_cells.resize(cells.size())
	_grounded_cells.fill(0)
	for x in range(width):
		var id := (int(ground_y(float(x))) - 1) * width + x
		if id >= 0 and id < cells.size():
			_grounded_cells[id] = 1
	_material_pixels.resize(cells.size())
	_material_pixels.fill(null)
	_material_ids = []
	_static_material = []
	if _neighbor_cache.size() != cells.size():
		_neighbor_cache.resize(cells.size())
		_neighbor_cache.fill(null)
	_blast_depth = 0
	_static_surface_rects.clear()
	_static_geometry_valid = false
	_static_dirty = true
	_raster_valid = false
	_raster_bodies.clear()
	_raster_order.clear()
	_raster_dynamic.clear()
	initial = 0
	for c in cells:
		initial += int(c > 0)
	rng.seed = 301
	_original_groups.clear()
	_reserve.clear()
	var index := 0
	structure_physics.column_failure = false
	for group in groups(static_ids()):
		index += 1
		for id in group:
			_original_groups[id] = index
		_reserve[index] = maxf(1.0, best_section(group, false).get("utilization", 0.0) / 0.65)
	structure_physics.column_failure = true
	if fixture.get("layout_key") != null and not str(fixture.get("layout_key", "")).is_empty():
		for group in groups(static_ids()):
			var supports: Array = group.filter(func(id): return grounded_id(id))
			var readings: Array = structure_physics.sections(group, 0.0, INF, supports, true)
			var original_group: int = _original_groups.get(group[0], 0)
			var reserve: float = _reserve.get(original_group, 1.0)
			var peak: float = readings[0].utilization if not readings.is_empty() else 0.0
			_reserve[original_group] = reserve * maxf(1.0, peak / 0.65)
	_prepare_pixel_atlas()
	material()
	sync_static()
	queue_redraw()

func original_point(id: int) -> Vector2:
	return _original_points[id]

func pixel_color(id: int) -> Color:
	return GameSkin.art(Color.hex((int(colors[id]) << 8) | 255))

func collectible_color() -> Color:
	return Color("78e3ae") if GameSkin.bright() else COLLECTIBLE_FILL

func draw_collectible(point: Vector2, visibility := 1.0) -> void:
	# Source drawCollectible: a 4x4 mint face, with 1px right and bottom edges.
	var side := maxf(1.0, roundf(S * visibility))
	var top_left := point * S - Vector2.ONE * side * 0.5
	var edge := S / 4.0
	var rim := Color("398a65") if GameSkin.bright() else COLLECTIBLE_RIM
	var face := collectible_color()
	face.a = visibility
	rim.a = visibility
	draw_rect(Rect2(top_left, Vector2.ONE * side), face)
	draw_rect(Rect2(top_left + Vector2(side - edge, 0), Vector2(edge, side)), rim)
	draw_rect(Rect2(top_left + Vector2(0, side - edge), Vector2(side - edge, edge)), rim)

func static_ids() -> Array:
	if _static_dirty:
		_static_revision += 1
		_static_cache = native_pixels.static_ids(cells)
		_static_dirty = false
	return _static_cache

func neighbors(id: int) -> Array:
	# Callers only iterate these immutable original-grid neighbors.
	if _neighbor_cache[id] != null:
		return _neighbor_cache[id]
	var out: Array = []
	if id % width > 0:
		out.append(id - 1)
	if id % width < width - 1:
		out.append(id + 1)
	if id >= width:
		out.append(id - width)
	if id + width < cells.size():
		out.append(id + width)
	_neighbor_cache[id] = out
	return out

func bond_key(a: int, b: int) -> int:
	return FractureGraph.bond_key(a, b, cells.size())

func groups(ids: Array) -> Array:
	perf.begin(perf.CONNECT)
	var result: Array = groups_unprofiled(ids)
	perf.end()
	return result

func groups_unprofiled(ids: Array) -> Array:
	return native_pixels.groups(ids, width, cells.size(), bonds)

func rectangles(ids: Array) -> Array:
	return native_pixels.rectangles(ids, width)

func _prepare_pixel_atlas() -> void:
	# Upload the original map once at entry; fragments share it after every cut.
	var image := Image.create(width,height,false,Image.FORMAT_RGBA8)
	for id in static_ids():
		image.set_pixel(int(id)%width,floori(float(id)/width),pixel_color(id))
	_pixel_atlas = ImageTexture.create_from_image(image)

func pixel_sprite(ids: Array, center: Vector2, pixel_rects: Array, shared_mesh: Mesh = null) -> MeshInstance2D:
	var surface := PixelSurface.new()
	if shared_mesh != null:
		surface.texture = _pixel_atlas
		surface.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		surface.mesh = shared_mesh
	else:
		surface.configure(_pixel_atlas,pixel_rects,center,S)
	return surface

func _add_collider(body: StaticBody2D, rect: Rect2, shared_shape: RectangleShape2D = null) -> void:
	var collider := CollisionShape2D.new()
	var shape := shared_shape
	if shape == null:
		shape = RectangleShape2D.new()
		shape.size = rect.size * S
	collider.shape = shape
	collider.position = rect.get_center() * S
	body.add_child(collider)
	if perf.enabled:
		perf.shapes += 1

func sync_static() -> void:
	perf.begin(perf.BODY)
	sync_static_unprofiled()
	perf.end()

func sync_static_unprofiled() -> void:
	var ids := static_ids()
	var same_geometry := _static_geometry_valid and ids == _static_geometry_ids
	if same_geometry and is_instance_valid(static_body) and not _static_has_contacts():
		for piece in pieces:
			piece.sleeping = false
		return
	if not same_geometry:
		_static_geometry_ids = ids.duplicate()
		_static_geometry_rects = rectangles(ids)
		_static_geometry_shapes = []
		for rect in _static_geometry_rects:
			var shape := RectangleShape2D.new()
			shape.size = rect.size * S
			_static_geometry_shapes.append(shape)
		_static_geometry_valid = true
	if is_instance_valid(static_body):
		remove_child(static_body)
		static_body.queue_free()
	if is_instance_valid(static_sprite):
		static_sprite.queue_free()
		static_sprite = null
	static_body = StaticBody2D.new()
	var static_material := PhysicsMaterial.new()
	static_material.friction = 0.8
	static_body.physics_material_override = static_material
	add_child(static_body)
	for index in range(_static_geometry_rects.size()):
		_add_collider(static_body, _static_geometry_rects[index], _static_geometry_shapes[index])
	_static_surface_rects = _static_geometry_rects
	if _blast_depth == 0:
		_flush_static_surface()
	for piece in pieces:
		piece.sleeping = false

func _static_has_contacts() -> bool:
	# Keep collider replacement semantics while an existing contact can re-trigger.
	var prefix := str(static_body.get_instance_id()) + ":"
	for piece in pieces:
		for key in piece.previous_contacts:
			if str(key).begins_with(prefix):
				return true
	for sample in pending_contacts + contact_samples + pending_impacts:
		if sample.get("collider") == static_body:
			return true
	return false

func _flush_static_surface() -> void:
	if _static_surface_rects.is_empty():
		return
	static_sprite = pixel_sprite([], Vector2.ZERO, _static_surface_rects)
	add_child(static_sprite)
	_static_surface_rects = []

func add_piece(ids: Array, parent_piece = null, keep_body := false):
	perf.begin(perf.BODY)
	var result = add_piece_unprofiled(ids, parent_piece, keep_body)
	if perf.enabled and result != null:
		perf.created += 1
		perf.shapes += result.pixel_rects.size()
	perf.end()
	return result

func add_piece_unprofiled(ids: Array, parent_piece = null, keep_body := false):
	if ids.is_empty():
		return null
	# Detached chips are collectible sand, not another rigid body and collider set.
	if ids.size() < 4 or (ids.size() <= SAND_FRAGMENT_MAX and not keep_body and not structure_physics.fragment_is_linked(ids, parent_piece)):
		sand_fragment_count += 1
		for id in ids:
			emit_grain(id, parent_piece.pixel_position(id) if parent_piece else original_point(id), parent_piece.pixel_velocity(id) if parent_piece else Vector2.ZERO)
		return null
	var piece = Piece.new()
	piece.configure(self, ids, parent_piece)
	add_child(piece)
	pieces.append(piece)
	if parent_piece != null and is_instance_valid(parent_piece.hinge) and ids.has(parent_piece.anchor_id) and cells[parent_piece.support_id]:
		attach_hinge(piece, parent_piece.hinge.position / S, parent_piece.anchor_id, parent_piece.support_id)
	structure_physics.on_piece_added(piece, parent_piece)
	return piece

func enforce_body_budget() -> void:
	# Wait for replacement children to inherit live joints before discarding chips.
	var pending_links: bool = structure_physics.yield_joints.any(func(j): return j.phase == "yielding" and j.pending)
	if not pending_links:
		for piece in pieces.duplicate():
			if piece.ids.size() <= SAND_FRAGMENT_MAX and not is_instance_valid(piece.hinge) and not structure_physics.fragment_is_linked(piece.ids, piece):
				for id in piece.ids:
					emit_grain(id, piece.pixel_position(id), piece.pixel_velocity(id))
				sand_fragment_count += 1
				remove_piece(piece)
	if pieces.size() <= BODY_LIMIT:
		return
	var largest_first := pieces.duplicate()
	largest_first.sort_custom(func(a, b): return a.ids.size() > b.ids.size())
	for piece in largest_first.slice(BODY_LIMIT):
		for id in piece.ids:
			emit_grain(id, piece.pixel_position(id), piece.pixel_velocity(id))
		remove_piece(piece)

func remove_piece(piece) -> void:
	structure_physics.on_piece_removed(piece)
	blackhole_physics.on_piece_removed(piece)
	skill_physics.on_piece_removed(piece)
	if is_instance_valid(piece.hinge):
		piece.hinge.queue_free()
	piece.hinge = null
	pieces.erase(piece)
	remove_child(piece)
	piece.queue_free()

func emit_grain(id: int, point: Vector2, velocity: Vector2) -> void:
	var grain := {"id": id, "p": point, "v": velocity, "rest": false}
	grains.append(grain)
	grain_roster_changed([grain], [])

func release(ids: Array):
	cells = native_world.clear_ids(cells, ids)
	_static_dirty = true
	released += ids.size()
	return add_piece(ids)

func attach_hinge(piece, point: Vector2, anchor: int, support: int) -> void:
	var joint := Node2D.new()
	joint.position = point * S
	add_child(joint)
	var relative: Vector2 = point - piece.position / S
	piece.bearing_constraint = {"pointA": {"x": point.x, "y": point.y}, "pointB": {"x": relative.x, "y": relative.y}, "angleB": piece.rotation, "length": 0.0, "stiffness": 0.35, "damping": 0.02}
	piece.hinge = joint
	piece.anchor_id = anchor
	piece.support_id = support
	piece.hinge_age = 0
	structure_physics.register_hinge(piece)

func best_section(ids: Array, damaged_only := true) -> Dictionary:
	var sections: Array = structure_physics.sections(ids,0.0,INF,null,true)
	if damaged_only:
		sections = sections.filter(func(section): return section.utilization > 1 or absf(section.center - section.pivot) > 0.1)
	return sections[0] if not sections.is_empty() else {}

func check_supports() -> void:
	perf.begin(perf.SUPPORT)
	check_supports_unprofiled()
	perf.end()

func check_supports_unprofiled() -> void:
	var unchanged_groups: Array = structure_physics.release_unsupported()
	structure_physics.check_static(unchanged_groups)
	structure_physics.finish_structure_change()

func configure_profile(upgrades: Dictionary, source_edition := "paid") -> void:
	edition = source_edition
	profile_upgrades = upgrades.duplicate()
	stats = SkillPhysics.profile_stats(profile_upgrades, edition)
	reset()

func apply_source_impact(point: Vector2, strength: float, context: Dictionary) -> int:
	return impact_physics.apply(point, strength, context)

func attack(point: Vector2, tool := "blast") -> bool:
	if settled or not point.is_finite() or point.x < 0 or point.x >= width or point.y < 0 or point.y >= ground_y(point.x):
		return false
	var source_tool := "bomb" if tool == "blast" else tool
	if not allowed_tools.has(source_tool):
		return false
	var cost := float(stats.bombCost) if tool == "blast" else float(stats.gravityCost)
	if charge <= 0.00000001:
		return false
	if tool == "blast":
		# Tap recognition already waits for release; accepted taps need no extra fuse delay.
		bombs.append({"p": point, "delay": 0.0, "radius": stats.bombRadius, "power": stats.bombPower, "secondary": false})
	elif tool == "blackhole" and wells.is_empty():
		var well := {"p": point, "remaining": float(stats.gravityDuration), "duration": float(stats.gravityDuration), "radius": float(stats.gravityRadius), "power": float(stats.gravityPower)}
		wells.append(well)
		blackhole_physics.on_well_activated(well)
		chain_physics.arm(point, stats.gravityRadius)
	else:
		return false
	# Paid LabWorld permits a last full tool use on residual energy.
	var spent := minf(charge, cost)
	charge = maxf(0.0, charge - cost)
	energy_used += spent
	if not used_tools.has(source_tool):
		used_tools.append(source_tool)
	events.append({"kind": "tool-blast" if tool == "blast" else "tool-gravity", "phase": "fuse" if tool == "blast" else "start", "delay": 0.0, "x": point.x, "y": point.y, "time": elapsed})
	enforce_body_budget()
	return true

func cut_at(point: Vector2, radius: float) -> int:
	var materials: Array = [{"piece": null, "pixels": static_material_in_square(point, radius)}]
	for piece in pieces:
		materials.append({"piece": piece, "ids": piece.ids, "pixels": material(piece), "original": _original_points, "origin": piece.origin_center, "rotation": piece.rotation, "velocity": piece.linear_velocity, "angular": piece.angular_velocity})
	var result: Dictionary = native_world.cut(materials, point, radius, cells)
	for pixel in result.candidates:
		emit_grain(pixel.id, pixel.q, pixel.velocity)
	cells = result.cells
	if result.static_cut:
		_static_dirty = true
	for command in result.rebuild:
		_rebuild(command.piece, groups(command.remaining))
	if result.static_cut:
		check_supports()
	return result.candidates.size()

func blast(input) -> void:
	perf.begin(perf.DAMAGE)
	blast_unprofiled(input)
	perf.end()

func blast_unprofiled(input) -> void:
	_blast_depth += 1
	var bomb: Dictionary = input if input is Dictionary else {"p": input, "radius": stats.bombRadius, "power": stats.bombPower, "secondary": false}
	var point: Vector2 = bomb.p
	var radius: float = bomb.get("radius", stats.bombRadius)
	var power: float = bomb.get("power", stats.bombPower)
	var secondary: bool = bomb.get("secondary", false) or bomb.get("ideaSecondary", false)
	if not secondary:
		chain_physics.arm(point, radius + 1)
	var count := cut_at(point, radius)
	var snapshots: Array = []
	for piece in pieces:
		snapshots.append({"piece": piece, "pixels": material(piece), "position": piece.position, "velocity": piece.linear_velocity, "angular": piece.angular_velocity, "mass": piece.mass, "inertia": piece.inertia})
	var commands: Array = native_world.blast(snapshots, grains, point, stats.blastReach, power)
	var impulses: int = commands.size() if power > 0 else 0
	for command in commands:
		var piece = command.piece
		piece.linear_velocity = command.velocity
		piece.angular_velocity = command.angular
		piece.sleeping = false
		piece.limit_motion()
	enforce_body_budget()
	var efficiency := float(bomb.get("fracture_efficiency", 1.0)) if secondary else float(stats.get("blastFractureEfficiency", 1.0))
	impact_physics.blast_halo(point, radius, power, efficiency)
	blasts += 1
	events.append({"kind": "blast", "time": elapsed, "count": count, "x": point.x, "y": point.y, "radius": radius, "power": power, "secondary": secondary, "vfx": bomb.get("vfx", "aftershock" if bomb.get("kind") == "echo" else "relay" if bomb.get("kind") == "relay-hit" else ""), "heavy": bomb.get("heavy", false), "audio": bomb.get("audio", not bomb.get("kind", "") in ["echo", "relay-hit"])})
	skill_physics.on_primary_blast(bomb, count > 0 or impulses > 0)
	_blast_depth -= 1
	if _blast_depth == 0:
		_flush_static_surface()

func _rebuild(piece, partitions: Array) -> void:
	perf.begin(perf.BODY)
	_rebuild_unprofiled(piece, partitions)
	perf.end()

func _rebuild_unprofiled(piece, partitions: Array) -> void:
	var anchor: int = piece.anchor_id
	var support: int = piece.support_id
	var pivot := Vector2.ZERO
	var had_hinge := is_instance_valid(piece.hinge)
	if had_hinge:
		pivot = piece.hinge.position / S
		piece.hinge.queue_free()
		piece.hinge = null
	for group in partitions:
		var keep_hinge: bool = had_hinge and group.has(anchor) and support >= 0 and cells[support]
		var child = add_piece(group, piece, keep_hinge)
		if child != null and had_hinge and group.has(anchor) and support >= 0 and cells[support]:
			attach_hinge(child, pivot, anchor, support)
			child.hinge_age = piece.hinge_age
			if piece.has_meta("section"):
				child.set_meta("section", piece.get_meta("section"))
				child.set_meta("load_angle", piece.get_meta("load_angle", piece.rotation))
				child.set_meta("load_direction", piece.get_meta("load_direction", 0.0))
				if piece.has_meta("structural_hinge"):
					child.set_meta("structural_hinge", piece.get_meta("structural_hinge").duplicate(true))
	remove_piece(piece)

func strain(well: Dictionary, strength: float) -> void:
	blackhole_physics.strain_supported(well, strength)

func _advance_wells(dt: float) -> void:
	perf.begin(perf.SKILL)
	_advance_wells_unprofiled(dt)
	perf.end()

func _advance_wells_unprofiled(dt: float) -> void:
	blackhole_physics.step(dt)

func material(piece = null) -> Array:
	perf.begin(perf.COORDS)
	var result: Array = material_unprofiled(piece)
	perf.end()
	return result

func material_unprofiled(piece = null) -> Array:
	if piece == null:
		var ids := static_ids()
		if ids != _material_ids:
			_material_ids = ids.duplicate()
			_static_material = native_world.static_material(ids, _material_pixels, _original_points)
		return _static_material
	return native_pixels.material(piece.ids, _original_points, piece.origin_center, piece.position, piece.rotation)

func static_material_in_square(point: Vector2, radius: float) -> Array:
	return native_world.static_square(point, radius, width, height, cells, _material_pixels, _original_points)

func _release_compression(children: Array, point: Vector2, budget: float) -> float:
	var snapshots: Array = []
	for child in children:
		snapshots.append({"body": child, "mass": child.mass, "position": child.position, "velocity": child.linear_velocity})
	var result: Dictionary = native_world.compression(snapshots, point, budget)
	for command in result.commands:
		command.body.linear_velocity = command.velocity
		command.body.limit_motion()
	return result.spent

func fracture(piece, point: Vector2, speed: float, downward := true, context: Dictionary = {}) -> void:
	perf.begin(perf.FRACTURE)
	fracture_unprofiled(piece, point, speed, downward, context)
	perf.end()

func fracture_unprofiled(piece, point: Vector2, speed: float, downward := true, context: Dictionary = {}) -> void:
	if piece != null and (not pieces.has(piece) or elapsed - piece.last_impact < 0.15):
		return
	if (piece.ids if piece != null else static_ids()).is_empty():
		return
	if piece != null:
		# Weak hits still consume the original cooldown, even without material allocation.
		piece.last_impact = elapsed
	var normal: Vector2 = context.get("normal", Vector2.UP)
	var measured_energy: float = context.get("energy", 0.0)
	if context.is_empty() and piece != null:
		var arm: Vector2 = point * S - piece.position
		var inverse: float = 1.0 / piece.mass + pow(arm.cross(normal), 2) / piece.inertia
		measured_energy = 0.5 / (inverse * 0.002) * pow(minf(speed, 180) / 60.0, 2)
	var fall: bool = downward and speed > 14 and piece != null and not context.get("chain", false)
	var start_speed: float = context.get("speed_start", 40.0)
	var activation := 1 - exp(-maxf(0, speed - (14.0 if fall else start_speed)) / (10.0 if fall else start_speed) * (1.0 if fall else 10.0))
	if activation <= 0 or measured_energy <= 0:
		return
	var pixels := material(piece)
	if piece == null:
		pixels = native_world.receiver(pixels, point, groups(static_ids()))
	var count := pixels.size()
	var severity := clampf((speed - 14) / 18, 0, 1) if fall else 0.0
	var energy := minf(measured_energy, count * 6)
	var total := energy * 0.42 * activation
	var motion_budget := total * (0.04 * severity if fall else 0.12) if piece != null else 0.0
	var fracture_budget := total - motion_budget
	# Processing improves existing detached-body fracture work, never collision motion.
	var processing := maxf(1.0, float(stats.get("debrisProcessing", 1.0))) if piece != null else 1.0
	fracture_budget *= processing
	var contact_allowance := fracture_budget * (0.8 - 0.65 * severity if fall else 0.8)
	var contact_budget := contact_allowance
	var fraction := 0.95 * activation / (1 + count / 256.0)
	var pixel_limit := mini(count, maxi(1, floori(count * 0.12 * processing)) if fall else floori(count * fraction * processing))
	var reach := 1.5 + sqrt(energy) * 0.35 if fall else minf(52, 1.5 + sqrt(energy) * 0.65)
	var segments: Array = context.get("segments", [{"a": point, "b": point}])
	if segments.is_empty():
		segments = [{"a": point, "b": point}]
	var crushing: Dictionary = native_world.crush(pixels, segments, reach, pixel_limit, contact_budget, fall)
	var contact_span: float = crushing.contact_span
	contact_budget = crushing.budget
	var crushed: Dictionary = crushing.crushed
	var remaining: Array = crushing.remaining
	var remaining_material: Array = crushing.remaining_material
	perf.begin(perf.FR_GRAPH)
	var graph: Dictionary = fracture_graph.build(remaining_material if fall else pixels, width, bonds, cells.size())
	perf.end()
	var contact_ids: Array = crushing.contacts
	perf.begin(perf.FR_WAVE)
	var distances: Array = fracture_graph.distances(graph, contact_ids)
	perf.end()
	var wave_reach := reach * ((1 + severity * 5) * 3 if fall else 3.0)
	var edges: Array = native_world.edges(graph, distances, normal, wave_reach, fall)
	var contact_spent := contact_allowance - contact_budget
	var crack_budget := (fracture_budget - contact_spent) * (severity if fall else 1.0)
	var before_groups: Array = groups(remaining)
	var cracking: Dictionary = native_world.crack(self, remaining, before_groups, edges, crushed, bonds, crack_budget, contact_span, fall)
	var crack_spent: float = cracking.spent
	var bond_changes: int = cracking.changes
	var crack_depth: float = cracking.depth
	if crushed.is_empty() and bond_changes == 0:
		return
	var old_pieces: Array = pieces.duplicate()
	var emissions: Array = crushing.removed
	if piece != null:
		emissions = native_world.emissions(emissions, _original_points, piece.origin_center, piece.rotation, piece.linear_velocity, piece.angular_velocity)
	for pixel in emissions:
		emit_grain(pixel.id, pixel.q, pixel.velocity if piece != null else Vector2.ZERO)
	if piece == null and not crushing.removed.is_empty():
		cells = native_world.remove_cells(cells, crushing.removed)
		_static_dirty = true
	var partitions := groups(remaining)
	if piece != null:
		# Partial bond fatigue does not change shape: retain mass, pose and contacts.
		if not crushed.is_empty() or partitions.size() != 1:
			_rebuild(piece, partitions)
		else:
			# Keep replacement traversal order for graph cuts and skill target ties.
			piece.ids = partitions[0].duplicate()
			pieces.erase(piece)
			pieces.append(piece)
	else:
		check_supports()
	var children: Array = pieces.filter(func(child): return not old_pieces.has(child))
	var motion_spent := _release_compression(children, point, motion_budget)
	var partition_stats: Dictionary = native_world.group_stats(partitions)
	fractures += 1
	events.append({"kind": "fall-fracture" if fall else "speed-fracture", "source": "collision", "time": elapsed, "x": point.x, "y": point.y, "speed": speed, "energy": energy, "count": crushed.size(), "bodyPixels": count, "pixelLimit": pixel_limit, "fraction": fraction, "severity": severity, "contactSpan": contact_span, "crackDepth": crack_depth, "bonds": bond_changes, "fragments": partition_stats.large if fall else partitions.size(), "totalGroups": partitions.size(), "largest": partition_stats.largest, "nodes": graph.nodes.size(), "motionBudget": motion_budget, "motionSpent": motion_spent, "spent": contact_spent + crack_spent + motion_spent, "budget": total})

func live_hinge_section(piece) -> Dictionary:
	return structure_physics.live_hinge_section(piece)

func _snap_hinge(piece, section: Dictionary) -> void:
	if is_instance_valid(piece.hinge):
		piece.hinge.queue_free()
	piece.hinge = null
	piece.bearing_constraint.clear()
	piece.remove_meta("section")
	var snapping: Dictionary = native_world.snap(cells, section.cuts, width, _original_points)
	cells = snapping.cells
	var emitted: int = snapping.emitted.size()
	if emitted > 0:
		_static_dirty = true
	for pixel in snapping.emitted:
		emit_grain(pixel.id, pixel.q, Vector2.ZERO)
	events.append({"kind": "pillar-snap", "time": elapsed, "x": section.pivot, "y": section.y + 1, "width": section.width, "utilization": section.utilization, "count": emitted})
	released += emitted
	check_supports()

func _advance_hinges(dt: float) -> void:
	perf.begin(perf.SUPPORT)
	_advance_hinges_unprofiled(dt)
	perf.end()

func _advance_hinges_unprofiled(dt: float) -> void:
	structure_physics.step(dt)
	for piece in pieces:
		max_angle = maxf(max_angle, absf(piece.rotation))

func rasterize(dynamic_cells: Variant = null) -> void:
	perf.begin(perf.GRID)
	rasterize_unprofiled(dynamic_cells)
	perf.end()

func rasterize_unprofiled(dynamic_cells: Variant = null) -> void:
	var fixed_ids := static_ids()
	var dimensions := Vector2i(width, floor_y)
	var changed := not _raster_valid or _raster_static_revision != _static_revision or _raster_dimensions != dimensions
	var order: Array = []
	for piece in pieces:
		var key: int = piece.get_instance_id()
		order.append(key)
		var cached: Dictionary = _raster_bodies.get(key, {})
		var same_ids: bool = not cached.is_empty() and cached.ids == piece.ids
		# Exact comparisons, never sleep flags/epsilons: even tiny physical motion
		# still updates collision cells. Keep pixel_position's original arithmetic.
		if not same_ids or cached.position != piece.position or cached.rotation != piece.rotation or cached.origin != piece.origin_center or cached.dimensions != dimensions:
			var grid: PackedInt32Array = native_pixels.project(piece.ids, _original_points, piece.origin_center, piece.position, piece.rotation, width, floor_y)
			if perf.enabled:
				perf.projected_pixels += piece.ids.size()
			_raster_bodies[key] = {"ids": cached.ids if same_ids else piece.ids.duplicate(), "position": piece.position, "rotation": piece.rotation, "origin": piece.origin_center, "dimensions": dimensions, "cells": grid}
			changed = true
		elif perf.enabled:
			perf.body_grid_reuses += 1
	changed = changed or order != _raster_order
	if changed:
		# Flat membership avoids allocating/hash-inserting every occupied cell
		# on each moving-body update. Full rebuild retains overlap semantics.
		var grids: Array = []
		for key in order:
			grids.append(_raster_bodies[key].cells)
		var buffers: Dictionary = native_pixels.occupancy(fixed_ids, grids, width * height)
		occupancy = buffers.all
		_raster_dynamic = buffers.dynamic
		for key in _raster_bodies.keys():
			if not order.has(key):
				_raster_bodies.erase(key)
		_raster_order = order
		_raster_dimensions = dimensions
		_raster_static_revision = _static_revision
		_raster_valid = true
		occupancy_revision += 1
		if perf.enabled:
			perf.grid_rebuilds += 1
	elif perf.enabled:
		perf.grid_reuses += 1
	if dynamic_cells != null:
		dynamic_cells.clear()
		# Preserve the optional Dictionary export and its original insertion order.
		for key in order:
			for cell in _raster_bodies[key].cells:
				dynamic_cells[cell] = true

func _advance_grains(dt: float) -> void:
	perf.begin(perf.GRAINS)
	_advance_grains_unprofiled(dt)
	perf.end()

# Physics consumes synchronously; renderer owns separate pending changes until sync.
func grain_roster_changed(added: Array, removed: Array) -> void:
	grain_roster_revision += 1
	grain_physics.roster_changed(added, removed, grain_roster_revision)
	# A skipped notification invalidates both consumers until an explicit rebuild.
	if grain_render_revision != grain_roster_revision - 1:
		grain_render_reset += 1
	grain_render_revision = grain_roster_revision
	for grain in added:
		grain_render_added[grain.id] = grain
	for grain in removed:
		grain_render_added.erase(grain.id)
		grain_render_removed[grain.id] = true

func _advance_grains_unprofiled(dt: float) -> void:
	if not final_collection_active:
		grain_physics.step(dt)

func _auto_collect(dt: float) -> void:
	if final_collection or not stats.get("autoCollect", false) or stats.get("autoCollectRate", 0.0) <= 0:
		return
	auto_collect_clock += dt
	var interval: float = 1.0 / stats.autoCollectRate
	var removed: Array = []
	while auto_collect_clock >= interval:
		auto_collect_clock -= interval
		if grains.is_empty():
			continue
		var selected: int = native_world.auto_index(grains, width)
		var grain: Dictionary = grains.pop_at(selected)
		removed.append(grain)
		collected[grain.id] = true
		events.append({"kind": "collect", "source": "auto", "time": elapsed, "id": grain.id, "x": grain.p.x, "y": grain.p.y, "count": 1})

	if not removed.is_empty():
		grain_roster_changed([], removed)

func suction(from: Vector2, to: Vector2, dt: float) -> void:
	if final_collection or dt <= 0 or not from.is_finite() or not to.is_finite():
		return
	suction_budget += stats.suctionRate * minf(dt, 0.1)
	var selection: Dictionary = native_world.suction(grains, from, to, stats.suctionRadius, floori(suction_budget + 0.00000001))
	var count: int = selection.count
	for grain in selection.selected:
		collected[grain.id] = true
		events.append({"kind": "collect", "time": elapsed, "id": grain.id, "x": grain.p.x, "y": grain.p.y, "count": 1})
	grains = selection.remaining
	if not selection.taken.is_empty():
		grain_roster_changed([], selection.selected)
	suction_budget = clampf(suction_budget - count, 0, 0.999999)

func secure_loose() -> int:
	var count := grains.size()
	var selection: Dictionary = native_world.secure(grains, collected, colors)
	var center: Vector2 = selection.center
	var samples: Array = selection.samples
	grain_roster_changed([], grains)
	grains.clear()
	grain_render_reset += 1
	grain_render_added.clear()
	grain_render_removed.clear()
	if count > 0:
		events.append({"kind": "collect", "mode": "rise", "count": count, "x": center.x, "y": center.y, "samples": samples, "time": elapsed})
	return count

func advance(dt: float) -> void:
	perf.begin(perf.WORLD)
	perf.physics_steps += 1
	advance_unprofiled(dt)
	perf.end()

func advance_unprofiled(dt: float) -> void:
	if settled or paused or not is_finite(dt) or dt <= 0:
		return
	simulated_ms += minf(0.1, dt) * 1000.0
	var started := Time.get_ticks_usec()
	var left := minf(dt, 0.1)
	contact_samples = pending_contacts
	pending_contacts = []
	while left > 0.00000001:
		var h := minf(left, 1.0 / 60.0)
		left -= h
		elapsed += h
		skill_physics.step(h)
		var scheduled := bombs
		bombs = []
		for bomb in scheduled:
			bomb.delay -= h
			if bomb.delay <= 0.00000001:
				blast(bomb)
			else:
				bombs.append(bomb)
		_advance_wells(h)
		var impacts := pending_impacts.duplicate()
		pending_impacts.clear()
		var strongest := {}
		for impact in impacts:
			if impact.piece != null and (not is_instance_valid(impact.piece) or not pieces.has(impact.piece)):
				continue
			var target: int = impact.piece.get_instance_id() if impact.piece != null else 0
			if not strongest.has(target) or impact.energy > strongest[target].energy:
				strongest[target] = impact
		var loudest := {}
		for impact in strongest.values():
			if impact.speed >= 8 and (loudest.is_empty() or impact.energy > loudest.energy):
				loudest = impact
		if not loudest.is_empty():
			events.append({"kind": "sound-impact", "speed": loudest.speed, "energy": loudest.energy})
		for impact in strongest.values():
			if impact_samples.size() < 1000:
				impact_samples.append({"time": elapsed, "x": impact.point.x, "y": impact.point.y, "normal": [impact.normal.x, impact.normal.y], "speed": impact.speed, "energy": impact.energy, "recipient": "static" if impact.piece == null else "body"})
			if impact.piece == null or (is_instance_valid(impact.piece) and pieces.has(impact.piece)):
				skill_physics.on_contact(impact)
				var chain: Dictionary = chain_physics.activate(impact.get("chain_context", {}), impact)
				var before := fractures
				fracture(impact.piece, impact.point, impact.speed, impact.downward, impact)
				chain_physics.finish(chain, impact, fractures > before)
		_advance_hinges(h)
		_advance_grains(h)
		_auto_collect(h)
		if final_collection and finishing_requested:
			finishing_supports = structure_physics.grounded_joints()
		contact_samples.clear()
		enforce_body_budget()
	queue_redraw()
	last_cpu_us = Time.get_ticks_usec() - started

func _physics_process(dt: float) -> void:
	if auto_advance and not paused:
		advance(dt)

func _draw() -> void:
	perf.begin(perf.DRAW)
	_draw_unprofiled()
	perf.end()

func _draw_unprofiled() -> void:
	_grain_surface.sync(self)
	if not final_collection_active:
		return
	var stride := maxi(1, ceili(float(grains.size()) / 2400.0)) if final_collection_active else 1
	for i in range(0, grains.size(), stride):
		draw_collectible(grains[i].p, float(grains[i].get("recovery_visibility", 1.0)))

func ledger() -> Dictionary:
	var chunks := 0
	for piece in pieces:
		chunks += piece.ids.size()
	return {"static": static_ids().size(), "chunks": chunks, "grains": grains.size(), "collected": collected.size()}

func balanced() -> bool:
	var ids := {}
	for id in static_ids():
		ids[id] = true
	for piece in pieces:
		for id in piece.ids:
			if ids.has(id):
				return false
			ids[id] = true
	for grain in grains:
		if ids.has(grain.id):
			return false
		ids[grain.id] = true
	for id in collected:
		if ids.has(id):
			return false
		ids[id] = true
	return ids.size() == initial

func _exit_tree() -> void:
	perf.suspend()
