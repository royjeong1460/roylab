extends Node2D

var _clips: Array[Rect2] = []
var _tiles: Array = []
var _tile_size := Vector2.ONE
var _top := 0.0

func setup(world: Node2D, config: Dictionary, state: Dictionary, scenery_floor: float, tier: String) -> void:
	if tier == "1":
		return
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var factor: float = world.width*4.0/float(config.reference_width)
	_tile_size = (Vector2(220,100)*factor).round()
	_top = roundf(scenery_floor-4.0*factor)
	for tile in state.waste_fill_tiles:
		var region: Array = tile.region
		_tiles.append({"texture":load(str(tile.texture)),"region":Rect2(region[0],region[1],region[2],region[3])})
	for segment in world.terrain:
		var bottom: float = float(segment.y)*4.0
		if bottom <= scenery_floor:
			continue
		var bank := Rect2(float(segment.x)*4.0,_top,float(segment.w)*4.0,bottom-_top)
		if tier == "0":
			_clips.append(bank)
		else:
			# Partial restoration extends only the three remaining heaps into the low ground.
			for heap in state.waste:
				var footprint := Rect2((float(heap.x)-float(heap.width)*0.5)*factor,_top,float(heap.width)*factor,bottom-_top)
				var clipped := bank.intersection(footprint)
				if clipped.has_area():
					_clips.append(clipped)
	queue_redraw()

func _draw() -> void:
	if _tiles.is_empty():
		return
	# Cached draw commands fill only exposed backdrop; foreground terrain and bodies stay above.
	for clip in _clips:
		for row in range(floori((clip.position.y-_top)/_tile_size.y),ceili((clip.end.y-_top)/_tile_size.y)):
			for col in range(floori(clip.position.x/_tile_size.x),ceili(clip.end.x/_tile_size.x)):
				var tile: Dictionary = _tiles[posmod(col+row*3,_tiles.size())]
				var source: Rect2 = tile.region
				var full := Rect2(Vector2(col*_tile_size.x,_top+row*_tile_size.y),_tile_size)
				var part := full.intersection(clip)
				var ratio := source.size/_tile_size
				var uv := Rect2(source.position+(part.position-full.position)*ratio,part.size*ratio)
				draw_texture_rect_region(tile.texture,part,uv,Color(1,1,1,0.96))
