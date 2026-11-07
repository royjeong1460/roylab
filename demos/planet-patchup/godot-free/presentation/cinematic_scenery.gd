extends Control

const Background = preload("res://background.gd")
const CloudLayer = preload("res://presentation/cloud_layer.gd")
var region := 0
var restored := true
var _config: Dictionary = {}
var _state: Dictionary = {}
var _textures: Dictionary = {}
var _arch: Control
var _clouds: CloudLayer

func setup(region_index: int, clean := true) -> void:
	region = clampi(region_index, 0, 5)
	restored = clean
	if region > 0:
		var data: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/culture_environments.json"))
		_config = data.regions[str(region)]
		_state = _config.states["1" if clean else "0"]
		for key in ["terrain", "revival"]:
			var path = _state.get(key)
			if path is String:
				_textures[path] = load(path)
		for node in _state.objects + _state.waste:
			_textures[node.texture] = load(node.texture)

func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if region == 0:
		_arch = Background.new()
		_arch.width = 576.0
		_arch.height = 384.0
		_arch.floor_y = 344.0
		_arch.restoration = 1.0 if restored else 0.0
		add_child(_arch)
		for child in _arch.get_children():
			if child is CloudLayer:
				child.z_index = 0
	resized.connect(_layout)
	_layout()

func _layout() -> void:
	if _arch != null:
		var cover := maxf(size.x / _arch.width, size.y / _arch.height)
		_arch.scale = Vector2.ONE * cover
		_arch.position = (size - _arch.size * cover) * 0.5
	if region > 0 and size.x > 0 and size.y > 0:
		if _clouds != null:
			remove_child(_clouds)
			_clouds.queue_free()
		_clouds = CloudLayer.new()
		add_child(_clouds)
		_clouds.setup(size, size.y * 0.79, 0.58 if restored else 0.24)
		_clouds.z_index = 0
	queue_redraw()

func _sprite(node: Dictionary) -> void:
	var texture: Texture2D = _textures[node.texture]
	var width := float(node.width)
	var height := texture.get_height() * width / texture.get_width()
	var rect := Rect2(float(node.x) - width * 0.5, float(node.base) - height, width, height)
	if node.get("flipX", false):
		rect.position.x += width
		rect.size.x = -width
	draw_texture_rect(texture, rect, false)

func _draw() -> void:
	if _state.is_empty() or size.x <= 0 or size.y <= 0:
		return
	draw_rect(Rect2(Vector2.ZERO, size), Color(str(_state.sky)))
	var reference := Vector2(float(_config.reference_width), float(_config.reference_height))
	var cover := maxf(size.x / reference.x, size.y / reference.y)
	var origin := Vector2((size.x - reference.x * cover) * 0.5, size.y * 0.80 - float(_config.reference_floor) * cover)
	var floor_y := origin.y + float(_config.reference_floor) * cover
	draw_rect(Rect2(0, floor_y, size.x, maxf(0.0, size.y - floor_y)), Color(str(_state.terrain_fill)))
	draw_set_transform(origin, 0.0, Vector2.ONE * cover)
	var terrain: Texture2D = _textures[_state.terrain]
	draw_texture(terrain, Vector2.ZERO)
	for node in _state.objects:
		_sprite(node)
	if _state.revival is String:
		draw_texture(_textures[_state.revival], Vector2.ZERO)
	for node in _state.waste:
		_sprite(node)
	draw_set_transform(Vector2.ZERO)
