extends Node2D

static var _routes: Dictionary = {}
var _texture: Texture2D
var _route: Dictionary = {}
var _tier := "0"
var _floor_min := 0.0
var _floor_max := 0.0
var _target := Rect2()

func setup(world: Node2D, region: int, site_id: String, tier: String) -> bool:
	if _routes.is_empty():
		var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/culture_routes.json"))
		if data is Dictionary and data.get("schema") == 1 and data.get("stages") is Dictionary:
			_routes = data.stages
	var selected = _routes.get(site_id)
	# Tutorial and unmapped comparison maps retain their existing scenery.
	if not selected is Dictionary or int(selected.get("region",-1)) != region:
		return false
	_route = selected
	var resource := str(_route.get("texture",""))
	if resource.is_empty() or not ResourceLoader.exists(resource):
		push_error("Missing adopted culture panorama: "+site_id)
		return false
	_texture = load(resource) as Texture2D
	if _texture == null or _texture.get_size() != Vector2(2340,900):
		push_error("Invalid adopted culture panorama: "+site_id)
		return false
	var left := float(_route.get("left",-1))
	var width := float(_route.get("width",0))
	if left < 0 or width <= 0 or left+width > 2340:
		push_error("Invalid culture panorama section: "+site_id)
		return false
	_tier = tier
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	z_index = 2
	_floor_min = INF
	_floor_max = -INF
	for segment in world.terrain:
		_floor_min = minf(_floor_min,float(segment.y)*4.0)
		_floor_max = maxf(_floor_max,float(segment.y)*4.0)
	if not is_finite(_floor_min):
		_floor_min = world.floor_y*4.0
		_floor_max = _floor_min
	return true

func cover_view(bounds: Rect2) -> void:
	if _texture == null or bounds.size.x <= 0:
		return
	var scale_factor := bounds.size.x/float(_route.width)
	var reference_pixel := bounds.size.x/390.0
	# Normal stages retain near-floor framing; a boss exposes the whole main facade above every support.
	var floor := _floor_min-8.0*reference_pixel if bool(_route.boss) else _floor_max+13.0*reference_pixel
	_target = Rect2(bounds.position.x,floor-820.0*scale_factor,bounds.size.x,900.0*scale_factor)
	queue_redraw()

func _draw() -> void:
	if _texture == null or _tier == "0" or not _target.has_area():
		return
	draw_texture_rect_region(_texture,_target,Rect2(float(_route.left),0,float(_route.width),900))
