extends Node2D

var _world: Node2D
var _config: Dictionary
var _style: Dictionary
var _tier: String
var _tiles: Array[Texture2D] = []

func setup(world: Node2D, config: Dictionary, style: Dictionary, tier: String) -> void:
	_world = world
	_config = config
	_style = style
	_tier = tier
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	for file in config.ground:
		_tiles.append(load(str(file)))
	queue_redraw()

func _draw() -> void:
	if _world == null:
		return
	var segments: Array = _world.terrain
	if segments.is_empty():
		segments = [{"x":0,"w":_world.width,"y":_world.floor_y}]
	var bottom: float = _world.height*4.0
	var tile_width := maxf(16.0,_world.width*4.0/1920.0*192.0*1080.0/844.0)
	for segment in segments:
		var left: float = float(segment.x)*4.0
		var right: float = (float(segment.x)+float(segment.w))*4.0
		var top: float = float(segment.y)*4.0
		draw_rect(Rect2(left,top,right-left,bottom-top),_style.ground)
		draw_rect(Rect2(left,top,right-left,2),_style.edge)
		var tile := floori(left/tile_width)
		while tile*tile_width < right:
			var texture := _tiles[0 if _tier == "1" else posmod(tile,_tiles.size())]
			var height := tile_width*texture.get_height()/texture.get_width()
			var full := Rect2(tile*tile_width,top,tile_width,height)
			var clipped := full.intersection(Rect2(left,top,right-left,bottom-top))
			if clipped.has_area():
				var ratio := texture.get_width()/tile_width
				var source := Rect2((clipped.position-full.position)*ratio,clipped.size*ratio)
				draw_texture_rect_region(texture,clipped,source,Color(1,1,1,0.58 if _config.culture != "mosaic" else 0.26))
			tile += 1
