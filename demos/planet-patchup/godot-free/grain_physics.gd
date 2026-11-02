extends RefCounted

# Loose pixels land once, then only the exposed sand frontier can flow.
# Bodies retain their separate 60Hz physics; sand never supports rigid bodies.
const FLYING_STEP := 1.0 / 30.0
const SAND_STEP := 1.0 / 30.0
const EPSILON := 0.00000001

var world: Node
var flying_elapsed := 0.0
var sand_elapsed := 0.0
var tick := 0
var motion_revision := 0
var settled: Dictionary = {}
var body_cells: Dictionary = {}
var _roster_revision := -1
var _flying: Array = []
var _sand_rows: Dictionary = {}
var _row_plans: Dictionary = {}
var _row_order := PackedInt32Array()
var _row_order_dirty := true
var _spill_cache: Dictionary = {}
var draw_dirty: Dictionary = {}
var overlap_fixes := 0
var surface: Dictionary = {}
var _surface_masks: Dictionary = {}
var _occupancy_revision := -1
var surface_wakes := 0
# A blocked surface wakes when sand neighbours or local body occupancy change.
var _blocked: Dictionary = {}
var _blocked_width := 0
var _blocked_bottom := 0

func setup(owner_world: Node) -> void:
	world = owner_world
	reset()

func reset() -> void:
	flying_elapsed = 0.0
	sand_elapsed = 0.0
	tick = 0
	motion_revision = 0
	settled.clear()
	body_cells = {}
	_blocked.clear()
	_roster_revision = -1
	_flying.clear()
	_sand_rows.clear()
	_row_plans.clear()
	_row_order.clear()
	_row_order_dirty = true
	_spill_cache.clear()
	draw_dirty.clear()
	overlap_fixes = 0
	surface.clear()
	_surface_masks.clear()
	_occupancy_revision = -1
	surface_wakes = 0

func _cell(point: Vector2) -> int:
	return floori(point.y) * int(world.width) + floori(point.x)

func _center(cell: int) -> Vector2:
	return Vector2(cell % int(world.width) + 0.5, floori(float(cell) / world.width) + 0.5)

func _occupied(cell: int) -> bool:
	return world.is_terrain_cell(cell) or world.occupancy.has(cell) or settled.has(cell)

func _rebuild_settled() -> void:
	world.perf.begin(world.perf.SETTLED)
	_rebuild_settled_unprofiled()
	world.perf.end()

func _rebuild_settled_unprofiled() -> void:
	if _roster_revision == world.grain_roster_revision:
		if world.perf.enabled:
			world.perf.roster_reuses += 1
		return
	# External collection/emission changes the ledger. Internal landing, sand
	# motion and displacement maintain the rosters below without rescanning it.
	var previous := settled
	settled = {}
	_flying = []
	for grain in world.grains:
		if not grain.get("rest", false):
			_flying.append(grain)
			continue
		var cell := _cell(grain.p)
		if settled.has(cell):
			# Preserve both IDs if an external conversion overlapped existing sand.
			grain.rest = false
			grain.v = Vector2.ZERO
			_flying.append(grain)
			continue
		grain.p = _center(cell)
		grain.speed = int(grain.get("speed", 0))
		grain.moved_tick = int(grain.get("moved_tick", 0))
		settled[cell] = grain
	# Emission/collection must not rebuild the interior frontier every time.
	for cell in previous:
		if not settled.has(cell) or previous[cell].id != settled[cell].id:
			_remove_sand_cell(cell)
	for cell in settled:
		if not previous.has(cell) or previous[cell].id != settled[cell].id:
			_add_sand_cell(cell)
	_roster_revision = world.grain_roster_revision

func _sand_row(cell: int) -> int:
	return cell / int(world.width)

func _add_sand_cell(cell: int) -> void:
	var row := _sand_row(cell)
	if not _sand_rows.has(row):
		_sand_rows[row] = {}
		_row_order_dirty = true
	_sand_rows[row][cell] = true
	_row_plans.erase(row)
	_refresh_neighbours(cell)

func _remove_sand_cell(cell: int) -> void:
	var row := _sand_row(cell)
	if _sand_rows.has(row):
		_sand_rows[row].erase(cell)
		if _sand_rows[row].is_empty():
			_sand_rows.erase(row)
			_row_order_dirty = true
	_row_plans.erase(row)
	_blocked.erase(cell)
	surface.erase(cell)
	_surface_masks.erase(cell)
	_refresh_neighbours(cell)
	_wake_above(cell)

func _wake(cell: int) -> void:
	if surface.has(cell) and _blocked.erase(cell):
		_row_plans.erase(_sand_row(cell))

func _wake_above(cell: int) -> void:
	_wake(cell)
	var above: int = cell - int(world.width)
	for parent in [above - 1, above, above + 1]:
		_wake(parent)

func _stable_cell(cell: int) -> bool:
	return settled.has(cell) or world.is_terrain_cell(cell)

func _refresh_surface(cell: int) -> void:
	if not settled.has(cell):
		return
	var width: int = world.width
	var x := cell % width
	var buried := (cell < width or _stable_cell(cell - width)) \
		and _stable_cell(cell + width) \
		and (x == 0 or _stable_cell(cell - 1)) \
		and (x == width - 1 or _stable_cell(cell + 1))
	if buried:
		surface.erase(cell)
		_surface_masks.erase(cell)
		if not _blocked.has(cell):
			_blocked[cell] = true
			_row_plans.erase(_sand_row(cell))
		settled[cell].speed = 0
	else:
		surface[cell] = true
		_wake(cell)

func _refresh_neighbours(cell: int) -> void:
	var width: int = world.width
	_refresh_surface(cell)
	_refresh_surface(cell - width)
	_refresh_surface(cell + width)
	if cell % width > 0:
		_refresh_surface(cell - 1)
	if cell % width < width - 1:
		_refresh_surface(cell + 1)

func _body_mask(cell: int) -> int:
	var width: int = world.width
	var mask := 0
	var bit := 1
	# Own/side/below cells include diagonal clearance used by the sand rule.
	for offset in [0, -1, 1, width - 1, width, width + 1, -width]:
		if world.occupancy.has(cell + offset):
			mask |= bit
		bit <<= 1
	# Dynamic side cells forbid diagonal flow even when a static side would not.
	for offset in [0, -1, 1]:
		if body_cells.has(cell + offset):
			mask |= bit
		bit <<= 1
	return mask

func _row_plan(row: int) -> PackedInt64Array:
	if _row_plans.has(row):
		return _row_plans[row]
	var origins := PackedInt64Array(_sand_rows.get(row, {}).keys())
	origins.sort()
	var plan := PackedInt64Array()
	var sleeping := 0
	for origin in origins:
		if _blocked.has(origin):
			sleeping += 1
		else:
			if sleeping > 0:
				plan.append(-sleeping)
				sleeping = 0
			plan.append(origin)
	if sleeping > 0:
		plan.append(-sleeping)
	_row_plans[row] = plan
	return plan

func _spill_from_overlap(cell: int) -> int:
	# Sand packs into empty sand cells, even if a body currently covers the pile.
	# Covered grains rest; they no longer bounce forever inside moving bodies.
	if not settled.has(cell):
		return -1
	var width: int = world.width
	var x := cell % width
	var best := -1
	var best_distance := INF
	for dx in [0, -1, 1]:
		if x + dx < 0 or x + dx >= width:
			continue
		var origin: int = cell + dx
		var at: int = _spill_cache.get(origin, origin)
		while at >= 0 and settled.has(at):
			at -= width
		if at < 0 or world.is_terrain_cell(at):
			# This flight step only adds sand; a blocked path cannot open yet.
			_spill_cache[origin] = -1
			continue
		_spill_cache[origin] = at
		var distance: float = pow(float(cell / width - at / width), 2) + dx * dx
		if distance < best_distance:
			best_distance = distance
			best = at
	return best

func _rasterize_and_displace() -> void:
	world.perf.begin(world.perf.DISPLACE)
	_rasterize_and_displace_unprofiled()
	world.perf.end()

func _rasterize_and_displace_unprofiled() -> void:
	world.rasterize()
	body_cells = world._raster_dynamic
	if _occupancy_revision == world.occupancy_revision:
		return
	_occupancy_revision = world.occupancy_revision
	for cell in surface:
		var mask := _body_mask(cell)
		if _surface_masks.get(cell, -1) != mask:
			if _blocked.has(cell):
				surface_wakes += 1
			_wake(cell)
			_surface_masks[cell] = mask

func _step_flying(dt: float) -> void:
	world.perf.begin(world.perf.FLYING)
	_step_flying_unprofiled(dt)
	world.perf.end()

func _step_flying_unprofiled(dt: float) -> void:
	var flying := false
	var airborne: Array = []
	_spill_cache.clear()
	for grain in _flying:
		if grain.get("rest", false):
			continue
		flying = true
		var point: Vector2 = grain.p
		if world.has_terrain:
			point.x = clampf(point.x, 0.5, world.width - 0.5)
			point.y = clampf(point.y, 0.5, world.ground_y(point.x) - 0.5)
		var velocity: Vector2 = grain.v
		velocity.x = clampf(velocity.x, -240.0, 240.0)
		velocity.y = clampf(velocity.y, -240.0, 240.0)
		# Collectible dust uses cell-sized samples rather than subpixel rebounds.
		var steps := mini(16, maxi(1, ceili(maxf(absf(velocity.x), absf(velocity.y) + 70.0 * dt) * dt)))
		var h := dt / steps
		for substep in range(steps):
			velocity.y += 70.0 * h
			var next := point + velocity * h
			if next.x < 0.5 or next.x > world.width - 0.5:
				next.x = clampf(next.x, 0.5, world.width - 0.5)
				velocity.x *= -0.2
			if next.y < 0.5:
				next.y = 0.5
				velocity.y = absf(velocity.y) * 0.2
			var terrain_hit: bool = next.y >= world.ground_y(next.x) - 0.5
			if terrain_hit or _occupied(_cell(next)) or _occupied(_cell(point)):
				var x := clampi(floori(point.x), 0, int(world.width) - 1)
				var y := clampi(floori(point.y), 0, int(world.floor_y) - 1)
				var cell := y * int(world.width) + x
				if settled.has(cell):
					var free := _spill_from_overlap(cell)
					if free >= 0:
						cell = free
						point = _center(cell)
						overlap_fixes += 1
				if not settled.has(cell) and not world.is_terrain_cell(cell):
					grain.rest = true
					grain.speed = 0
					grain.moved_tick = 0
					point = _center(cell)
					velocity = Vector2.ZERO
					settled[cell] = grain
					_add_sand_cell(cell)
					break
				# A completely full column waits for surface flow to open a slot.
				velocity = Vector2.ZERO
				break
			else:
				point = next
		if grain.p != point:
			draw_dirty[grain.id] = grain
		grain.p = point
		grain.v = velocity
		if not grain.get("rest", false):
			airborne.append(grain)
	_flying = airborne
	if flying:
		motion_revision += 1

func _fast_sand_tick() -> void:
	world.perf.begin(world.perf.SAND)
	_fast_sand_tick_unprofiled()
	world.perf.end()

func _fast_sand_tick_unprofiled() -> void:
	tick += 1
	var width: int = world.width
	var bottom: int = world.floor_y * width
	var direction := 1 if tick % 2 != 0 else -1
	if width <= 0:
		return
	if width != _blocked_width or bottom != _blocked_bottom:
		_blocked.clear()
		_row_plans.clear()
		_blocked_width = width
		_blocked_bottom = bottom
	# Sleeping runs consume the same LCG draws without revisiting every grain.
	if not settled.is_empty() and _blocked.size() == settled.size():
		world.rng.advance(settled.size())
		return
	if _row_order_dirty:
		_row_order = PackedInt32Array(_sand_rows.keys())
		_row_order.sort()
		_row_order_dirty = false
	var rows := _row_order
	for row_index in range(rows.size() - 1, -1, -1):
		# Lower rows can wake an upper row during this tick; obtain its plan now.
		var plan := _row_plan(rows[row_index])
		var index := 0 if direction == 1 else plan.size() - 1
		while index >= 0 and index < plan.size():
			var origin: int = plan[index]
			index += direction
			if origin < 0:
				world.rng.advance(-origin)
				continue
			if origin >= bottom or not settled.has(origin):
				continue
			var grain: Dictionary = settled[origin]
			if int(grain.get("moved_tick", 0)) == tick:
				continue
			var velocity := mini(6, int(grain.get("speed", 0)) + 1)
			var at := origin
			var hit := false
			var side := 1
			settled.erase(origin)
			for fall_step in range(velocity):
				if at + width < bottom and not _occupied(at + width):
					at += width
					continue
				hit = true
				side = -1 if world.rng.randf() < 0.5 else 1
				var diagonal := -1
				for dx in [side, -side]:
					if at % width + dx >= 0 and at % width + dx < width and at + width < bottom and not _occupied(at + width + dx) and not settled.has(at + dx) and not body_cells.has(at + dx):
						diagonal = at + width + dx
						break
				if diagonal >= 0:
					at = diagonal
				elif velocity >= 3:
					for kick in range(2):
						if at % width + side < 0 or at % width + side >= width or _occupied(at + side):
							break
						at += side
				break
			if at == origin and body_cells.has(origin):
				# Only the exposed layer slips aside; buried sand stays in the pile.
				for dx in [side, -side]:
					if origin % width + dx >= 0 and origin % width + dx < width and not _occupied(origin + dx):
						at = origin + dx
						break
			settled[at] = grain
			if at != origin:
				_remove_sand_cell(origin)
				_add_sand_cell(at)
				draw_dirty[grain.id] = grain
				motion_revision += 1
			else:
				# Static buildings and resting bodies also stop the surface. A local
				# occupancy-mask change wakes it when the support moves or is cut.
				_blocked[origin] = true
				_row_plans.erase(_sand_row(origin))
			grain.p = _center(at)
			grain.v = Vector2.ZERO
			grain.speed = 0 if hit else velocity
			grain.moved_tick = tick

func step(dt: float) -> void:
	if world == null or world.paused or not is_finite(dt) or dt <= 0.0:
		return
	if world.grains.is_empty():
		return
	_rebuild_settled()
	flying_elapsed += minf(0.1, dt)
	while flying_elapsed + EPSILON >= FLYING_STEP:
		flying_elapsed = maxf(0.0, flying_elapsed - FLYING_STEP)
		_rasterize_and_displace()
		_step_flying(FLYING_STEP)
		sand_elapsed += FLYING_STEP
		if sand_elapsed + EPSILON >= SAND_STEP:
			sand_elapsed = maxf(0.0, sand_elapsed - SAND_STEP)
			_fast_sand_tick()
