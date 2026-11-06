extends Node2D

const GameSkin = preload("res://app/skin.gd")
const CloudLayer = preload("res://presentation/cloud_layer.gd")
const GroundLayer = preload("res://presentation/culture_ground.gd")
const ScrapBank = preload("res://presentation/culture_scrap_bank.gd")
static var _environments: Dictionary = {}
var _config: Dictionary = {}
var _state: Dictionary = {}
var _tier := "0"
var _view_bounds := Rect2()
var _scenery_floor := 0.0
var _terrain: Texture2D
var _terrain_rect := Rect2()
var _clip := Control.new()
var _scenery := Node2D.new()
var _ground: GroundLayer

func setup(world: Node2D, region: int, restoration := 0.0) -> void:
	var extent := Vector2(world.width,world.height)*4.0
	_view_bounds = Rect2(Vector2.ZERO,extent)
	z_index = -100
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if _environments.is_empty():
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/culture_environments.json"))
		if parsed is Dictionary and parsed.get("schema_version") == 1:
			_environments = parsed.get("regions",{})
	_config = _environments.get(str(region),{})
	if _config.is_empty():
		push_error("Missing approved culture environment: "+str(region))
		return
	# Snapshot the best record on entry; waste never disappears during play.
	_tier = "1" if is_finite(restoration) and restoration >= 1.0 else "0.7" if is_finite(restoration) and restoration >= 0.7 else "0"
	_state = _config.states[_tier]
	_clip.clip_contents = true
	_clip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_clip)
	_clip.add_child(_scenery)
	var layout := Node2D.new()
	var factor := extent.x/float(_config.reference_width)
	_scenery_floor = world.floor_y*4.0
	# Distant scenery stands behind the highest foreground ledge, not the valley floor.
	for segment in world.terrain:
		_scenery_floor = minf(_scenery_floor,float(segment.y)*4.0)
	layout.scale = Vector2.ONE*factor
	layout.position.y = _scenery_floor-float(_config.reference_floor)*factor
	_scenery.add_child(layout)
	_terrain = load(str(_state.terrain))
	_terrain_rect = Rect2(layout.position,_terrain.get_size()*factor)
	for node in _state.objects:
		var building: bool = node.role == "building"
		var alpha := (0.56 if building else 0.66) if _tier == "0" else (0.78 if building else 0.84)
		_sprite(layout,node,2 if building else 3,alpha)
	if _state.revival is String:
		_image(layout,_state.revival,Vector2.ZERO,Vector2.ONE,4)
	var bank := ScrapBank.new()
	bank.z_index = 4
	_scenery.add_child(bank)
	bank.setup(world,_config,_state,_scenery_floor,_tier)
	for node in _state.waste:
		var heap: Dictionary = node.duplicate()
		# Broader unclean heaps overlap; preserve centers, flips and the restored layouts.
		if _tier == "0":
			heap.width = float(heap.width)*1.4
		_sprite(layout,heap,5,0.96)
	var clouds := CloudLayer.new()
	_scenery.add_child(clouds)
	clouds.setup(extent,world.floor_y*4.0,0.24 if _tier == "0" else 0.58)
	_ground = GroundLayer.new()
	_ground.z_index = 8
	_scenery.add_child(_ground)
	_ground.setup(world,_config,environment_style(),_tier)
	cover_view(_view_bounds)

func cover_view(bounds: Rect2) -> void:
	_view_bounds = bounds
	if _ground != null:
		_clip.position = bounds.position
		_clip.size = bounds.size
		_scenery.position = -bounds.position
		_ground.cover_view(bounds)
	queue_redraw()

func environment_style() -> Dictionary:
	var sky := Color(str(_state.get("sky","aaa99c")))
	var ground := Color(str(_state.get("ground","a3987e")))
	return GameSkin.culture_style({"sky":sky,"distant":sky.darkened(0.12),"ground":ground,"edge":ground.lightened(0.18)})

func _image(parent: Node2D, resource: String, origin: Vector2, factor: Vector2, layer: int, alpha := 1.0) -> void:
	var image := Sprite2D.new()
	# Keep authored scenery pixels intact; the skin still controls sky, ground and HUD.
	image.texture = load(resource)
	image.centered = false
	image.position = origin
	image.scale = factor
	image.z_index = layer
	image.modulate.a = alpha
	parent.add_child(image)

func _sprite(parent: Node2D, node: Dictionary, layer: int, alpha: float) -> void:
	var texture: Texture2D = load(str(node.texture))
	var width := float(node.width)
	var factor := width/texture.get_width()
	var image := Sprite2D.new()
	image.texture = texture
	image.centered = false
	# Reflect about the stored center without changing manual placement.
	var mirrored: bool = node.get("flipX",false)
	image.position = Vector2(float(node.x)+width*0.5 if mirrored else float(node.x)-width*0.5,float(node.base)-texture.get_height()*factor)
	image.scale = Vector2(-factor if mirrored else factor,factor)
	image.z_index = layer
	image.modulate.a = alpha
	parent.add_child(image)

func _draw() -> void:
	draw_rect(_view_bounds,environment_style().sky)
	if _terrain == null:
		return
	draw_rect(Rect2(_view_bounds.position.x,_scenery_floor,_view_bounds.size.x,_view_bounds.end.y-_scenery_floor),Color(str(_state.terrain_fill)))
	# Mirror only the distant terrain at each edge so the skyline meets without duplicating props.
	var width := _terrain_rect.size.x
	for tile in range(floori(_view_bounds.position.x/width),ceili(_view_bounds.end.x/width)):
		var mirrored := posmod(tile,2) == 1
		var x := (tile+int(mirrored))*width
		draw_set_transform(Vector2(x,_terrain_rect.position.y),0.0,Vector2(-1 if mirrored else 1,1))
		draw_texture_rect(_terrain,Rect2(Vector2.ZERO,_terrain_rect.size),false)
	draw_set_transform(Vector2.ZERO)
