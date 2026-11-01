extends RefCounted

# Frozen free30/engine/impact-world.js stepFlying/rasterize and world.js fastSandTick.
# Flying grains do not collide with each other; only settled sand occupies the grid.
const FLYING_STEP := 1.0 / 60.0
const SAND_STEP := 1.0 / 30.0
const EPSILON := 0.00000001

var world: Node
var flying_elapsed := 0.0
var sand_elapsed := 0.0
var tick := 0
var settled: Dictionary = {}
var body_cells: Dictionary = {}

func setup(owner_world: Node) -> void:
	world = owner_world
	reset()

func reset() -> void:
	flying_elapsed = 0.0
	sand_elapsed = 0.0
	tick = 0
	settled.clear()
	body_cells.clear()

func _cell(point: Vector2) -> int:
	return floori(point.y) * int(world.width) + floori(point.x)

func _center(cell: int) -> Vector2:
	return Vector2(cell % int(world.width) + 0.5, floori(float(cell) / world.width) + 0.5)

func _occupied(cell: int) -> bool:
	return world.is_terrain_cell(cell) or world.occupancy.has(cell) or settled.has(cell)

func _rebuild_settled() -> void:
	# Rebuild from the live ledger so suction/automatic collection cannot leave ghosts.
	settled.clear()
	for grain in world.grains:
		if not grain.get("rest", false):
			continue
		var cell := _cell(grain.p)
		if settled.has(cell):
			# Preserve both IDs if an external conversion overlapped existing sand.
			grain.rest = false
			grain.v = Vector2.ZERO
			continue
		grain.p = _center(cell)
		grain.speed = int(grain.get("speed", 0))
		grain.moved_tick = int(grain.get("moved_tick", 0))
		settled[cell] = grain

func _rasterize_and_displace() -> void:
	world.rasterize()
	body_cells.clear()
	# Sideways diagonal clearance excludes bodies but deliberately permits static cells.
	for piece in world.pieces:
		for id in piece.ids:
			var point: Vector2 = piece.pixel_position(id)
			var x := floori(point.x)
			var y := floori(point.y)
			if x < 0 or x >= world.width or y < 0 or y >= world.floor_y:
				continue
			var cell := y * int(world.width) + x
			body_cells[cell] = true
			if settled.has(cell):
				var grain: Dictionary = settled[cell]
				settled.erase(cell)
				grain.rest = false
				grain.v = Vector2.ZERO
				grain.speed = 0
				# rasterize() appends these new zero-velocity grains to source flying.
				world.grains.erase(grain)
				world.grains.append(grain)

func _step_flying(dt: float) -> void:
	for grain in world.grains:
		if grain.get("rest", false):
			continue
		var point: Vector2 = grain.p
		if world.has_terrain:
			point.x = clampf(point.x, 0.5, world.width - 0.5)
			point.y = clampf(point.y, 0.5, world.ground_y(point.x) - 0.5)
		var velocity: Vector2 = grain.v
		velocity.x = clampf(velocity.x, -240.0, 240.0)
		velocity.y = clampf(velocity.y, -240.0, 240.0)
		var steps := mini(64, maxi(1, ceili(maxf(absf(velocity.x), absf(velocity.y) + 70.0 * dt) * dt / 0.4)))
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
			if terrain_hit or _occupied(_cell(next)):
				var x := clampi(floori(point.x), 0, int(world.width) - 1)
				var y := clampi(floori(point.y), 0, int(world.floor_y) - 1)
				var cell := y * int(world.width) + x
				if not _occupied(cell):
					grain.rest = true
					grain.speed = 0
					grain.moved_tick = 0
					point = _center(cell)
					velocity = Vector2.ZERO
					settled[cell] = grain
					break
				velocity.x = velocity.x * 0.4 + (-0.5 if point.x < world.width / 2.0 else 0.5)
				velocity.y = -minf(4.0, absf(velocity.y) * 0.1)
				if not terrain_hit or not world.has_terrain:
					point.x = next.x
				point.y = clampf(point.y + velocity.y * h, 0.5, world.ground_y(point.x) - 0.5)
			else:
				point = next
		grain.p = point
		grain.v = velocity

func _fast_sand_tick() -> void:
	tick += 1
	var width: int = world.width
	var bottom: int = world.floor_y * width
	var direction := 1 if tick % 2 != 0 else -1
	for y in range(int(world.floor_y) - 1, -1, -1):
		var x := 0 if direction == 1 else width - 1
		while x >= 0 and x < width:
			var origin := y * width + x
			x += direction
			if not settled.has(origin):
				continue
			var grain: Dictionary = settled[origin]
			if int(grain.get("moved_tick", 0)) == tick:
				continue
			var velocity := mini(6, int(grain.get("speed", 0)) + 1)
			var at := origin
			var hit := false
			settled.erase(origin)
			for fall_step in range(velocity):
				if at + width < bottom and not _occupied(at + width):
					at += width
					continue
				hit = true
				var side := -1 if world.rng.randf() < 0.5 else 1
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
			grain.p = _center(at)
			grain.v = Vector2.ZERO
			grain.speed = 0 if hit else velocity
			grain.moved_tick = tick
			settled[at] = grain

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
