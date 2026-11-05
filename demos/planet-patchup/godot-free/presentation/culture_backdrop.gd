extends Node2D

const GameSkin = preload("res://app/skin.gd")
const CloudLayer = preload("res://presentation/cloud_layer.gd")
const GroundLayer = preload("res://presentation/culture_ground.gd")
const ScrapBank = preload("res://presentation/culture_scrap_bank.gd")
static var _environments: Dictionary = {}
var _config: Dictionary = {}
var _state: Dictionary = {}
var _tier := "0"
var _extent := Vector2.ONE
var _scenery_floor := 0.0

func setup(world: Node2D, region: int, restoration := 0.0) -> void:
	_extent = Vector2(world.width,world.height)*4.0
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
	var bounds := Control.new()
	bounds.size = _extent
	bounds.clip_contents = true
	bounds.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bounds)
	var layout := Node2D.new()
	var factor := _extent.x/float(_config.reference_width)
	_scenery_floor = world.floor_y*4.0
	# Distant scenery stands behind the highest foreground ledge, not the valley floor.
	for segment in world.terrain:
		_scenery_floor = minf(_scenery_floor,float(segment.y)*4.0)
	layout.scale = Vector2.ONE*factor
	layout.position.y = _scenery_floor-float(_config.reference_floor)*factor
	bounds.add_child(layout)
	_image(layout,str(_state.terrain),Vector2.ZERO,Vector2.ONE,0)
	for node in _state.objects:
		var building: bool = node.role == "building"
		var alpha := (0.56 if building else 0.66) if _tier == "0" else (0.78 if building else 0.84)
		_sprite(layout,node,2 if building else 3,alpha)
	if _state.revival is String:
		_image(layout,_state.revival,Vector2.ZERO,Vector2.ONE,4)
	var bank := ScrapBank.new()
	bank.z_index = 4
	bounds.add_child(bank)
	bank.setup(world,_config,_state,_scenery_floor,_tier)
	for node in _state.waste:
		var heap: Dictionary = node.duplicate()
		# Broader unclean heaps overlap; preserve centers, flips and the restored layouts.
		if _tier == "0":
			heap.width = float(heap.width)*1.4
		_sprite(layout,heap,5,0.96)
	var clouds := CloudLayer.new()
	bounds.add_child(clouds)
	clouds.setup(_extent,world.floor_y*4.0,0.24 if _tier == "0" else 0.58)
	var ground := GroundLayer.new()
	ground.z_index = 8
	bounds.add_child(ground)
	ground.setup(world,_config,environment_style(),_tier)
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
	draw_rect(Rect2(Vector2.ZERO,_extent),environment_style().sky)
	if not _state.is_empty():
		# Extend the distant soil below its raised artwork; no strip of sky under a valley.
		draw_rect(Rect2(0,_scenery_floor,_extent.x,maxf(0,_extent.y-_scenery_floor)),Color(str(_state.terrain_fill)))
