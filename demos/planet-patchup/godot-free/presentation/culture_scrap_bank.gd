extends Node2D

const Layout = preload("res://presentation/scenery_layout.gd")
var _caps: Array = []
var _fills: Array = []
var _tiles: Array = []
var _tile_size := Vector2.ONE

func setup(world: Node2D, config: Dictionary, state: Dictionary, _scenery_floor: float, tier: String) -> void:
	if tier == "1":
		return
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var width: float = world.width*4.0
	var factor := width/float(config.reference_width)
	_tile_size = Vector2(220,100)*factor
	for tile in state.waste_fill_tiles:
		var region: Array = tile.region
		_tiles.append({"texture":load(str(tile.texture)),"region":Rect2(region[0],region[1],region[2],region[3])})
	var pool: Array = config.states["0"].waste
	var partial: Array = config.states["0.7"].waste
	var index := 0
	for segment in Layout.surfaces(world):
		var left := float(segment.x)*4.0
		var span := float(segment.w)*4.0
		var base := float(segment.y)*4.0+factor*4.0
		var count := maxi(1,ceili(span/(width*0.18)))
		for i in range(count):
			var keep := posmod(index,10) in [0,5,9]
			var node: Dictionary = pool[posmod(index,pool.size())]
			if tier == "0.7":
				if not keep:
					index += 1
					continue
				for remaining in partial:
					if remaining.key == node.key:
						node = remaining
						break
			var texture: Texture2D = load(str(node.texture))
			var heap_width := width*(0.56+float(posmod(index,3))*0.04)
			if tier == "0.7":
				heap_width = minf(heap_width,span/count*0.96)
			var size := texture.get_size()*(heap_width/texture.get_width())
			var center := left+span*(float(i)+0.5)/count
			var full := Rect2(Vector2(center-size.x*0.5,base-size.y),size)
			var clip := Rect2(left,full.position.y,span,size.y)
			if tier == "0.7":
				clip = Rect2(left+span*i/count,full.position.y,span/count,size.y)
			# Clip each cap at its support span: raised ground lifts the background skyline.
			_caps.append({"texture":texture,"full":full,"clip":full.intersection(clip)})
			var fill_width := minf(span,size.x*0.8) if tier == "0.7" else span
			_fills.append(Rect2(clampf(center-fill_width*0.5,left,left+span-fill_width),base-size.y*0.20,fill_width,size.y*0.20))
			index += 1
	queue_redraw()

func _draw() -> void:
	for fill in _fills:
		for row in range(floori(fill.position.y/_tile_size.y),ceili(fill.end.y/_tile_size.y)):
			for col in range(floori(fill.position.x/_tile_size.x),ceili(fill.end.x/_tile_size.x)):
				var tile: Dictionary = _tiles[posmod(col+row*3,_tiles.size())]
				var full := Rect2(Vector2(col,row)*_tile_size,_tile_size)
				var part: Rect2 = full.intersection(fill)
				var source: Rect2 = tile.region
				var ratio := source.size/_tile_size
				draw_texture_rect_region(tile.texture,part,Rect2(source.position+(part.position-full.position)*ratio,part.size*ratio),Color(1,1,1,0.96))
	for cap in _caps:
		var full: Rect2 = cap.full
		var part: Rect2 = cap.clip
		var texture: Texture2D = cap.texture
		var ratio := texture.get_size()/full.size
		draw_texture_rect_region(texture,part,Rect2((part.position-full.position)*ratio,part.size*ratio),Color(1,1,1,0.96))
