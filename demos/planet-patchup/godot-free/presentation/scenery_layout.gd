extends RefCounted

static func surfaces(world: Node2D) -> Array:
	var result: Array = []
	# Finite lab ledges have exposed tops, never solid columns down to the floor.
	var mask: Array = world.fixture.get("lab_terrain_mask", [])
	if not mask.is_empty():
		for y in range(world.height):
			var x := 0
			while x < world.width:
				var start := x
				while x < world.width and int(mask[y*world.width+x]) != 0 and (y == 0 or int(mask[(y-1)*world.width+x]) == 0):
					x += 1
				if x-start >= 4:
					result.append({"x":start,"w":x-start,"y":y})
				x = maxi(x,start+1)
	else:
		result = world.terrain.duplicate(true)
	if result.is_empty():
		result.append({"x":0,"w":world.width,"y":world.floor_y})
	return result

static func floor_at(world: Node2D, x: float) -> float:
	var column := clampi(floori(x/4.0),0,world.width-1)
	return float(world.ground_surface[column])*4.0

static func objects(world: Node2D, config: Dictionary) -> Array:
	var source: Array = config.states["1"].objects
	var result: Array = source.duplicate(true)
	if result.is_empty():
		return result
	var rng := RandomNumberGenerator.new()
	rng.seed = absi(str(world.fixture.get("id","site")).hash())
	var reference := float(config.reference_width)
	var factor: float = world.width*4.0/reference
	var main := 0
	var left := INF
	var right := -INF
	for i in range(source.size()):
		var node: Dictionary = source[i]
		left = minf(left,float(node.x)-float(node.width)*0.5)
		right = maxf(right,float(node.x)+float(node.width)*0.5)
		if str(node.key).ends_with("building-a") and (not str(source[main].key).ends_with("building-a") or float(node.width)>float(source[main].width)):
			main = i
	var half_area := minf(reference*0.47,maxf(reference*0.32,(right-left)*0.5))
	var main_width := float(source[main].width)
	for i in range(result.size()):
		var node: Dictionary = result[i]
		var width := float(node.width)
		var x := reference*0.5
		if i != main:
			var lo := reference*0.5-half_area+width*0.5
			var hi := reference*0.5+half_area-width*0.5
			for attempt in range(12):
				x = rng.randf_range(lo,hi)
				if node.role != "building" or absf(x-reference*0.5)>(main_width+width)*0.28:
					break
		node.x = x
		var offset := float(config.reference_floor)-float(source[i].base)
		if i != main:
			offset = maxf(12.0,offset+rng.randf_range(-28.0,28.0))
		node.base = floor_at(world,x*factor)/factor-offset
	return result
