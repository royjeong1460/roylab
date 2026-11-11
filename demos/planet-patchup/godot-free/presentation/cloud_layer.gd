extends Node2D

const GameSkin = preload("res://app/skin.gd")
var _clouds: Array = []
var _extent := Vector2.ONE
var _sunny := false
var _sun := Vector2(0.72,0.22)
var _alpha := 0.62

func setup(extent: Vector2, _floor_y: float, alpha: float) -> void:
	z_index = 1
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_alpha = alpha
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	# Local RNG: weather never consumes gameplay randomness or reads restoration.
	_sunny = rng.randi_range(0,1) == 1
	_sun = Vector2(rng.randf_range(0.16,0.84),rng.randf_range(0.12,0.32))
	if not _sunny:
		for i in range(4):
			var cloud := Sprite2D.new()
			cloud.texture = GameSkin.texture(load("res://assets/salvage/shared-cloud-"+"abc"[rng.randi_range(0,2)]+".png"))
			cloud.centered = false
			cloud.modulate.a = alpha
			add_child(cloud)
			_clouds.append({"sprite":cloud,"u":rng.randf(),"y":rng.randf_range(0.04,0.44),"width":rng.randf_range(0.18,0.30),"speed":rng.randf_range(0.0022,0.0041)})
	cover_view(Rect2(Vector2.ZERO,extent))

func cover_view(bounds: Rect2) -> void:
	position = bounds.position
	if _extent != bounds.size:
		_extent = bounds.size
		queue_redraw()
	_place_clouds()

func _place_clouds() -> void:
	for cloud in _clouds:
		var sprite: Sprite2D = cloud.sprite
		var width: float = _extent.x*float(cloud.width)
		var factor := minf(width/sprite.texture.get_width(),_extent.y*0.20/sprite.texture.get_height())
		sprite.scale = Vector2.ONE*factor
		var size := sprite.texture.get_size()*factor
		sprite.position = Vector2(float(cloud.u)*(_extent.x+size.x)-size.x,clampf(_extent.y*float(cloud.y),0.0,maxf(0.0,_extent.y*0.5-size.y)))

func _process(delta: float) -> void:
	for cloud in _clouds:
		cloud.u = fposmod(float(cloud.u)-float(cloud.speed)*delta,1.0)
	_place_clouds()

func _draw() -> void:
	if not _sunny:
		return
	var pixel := maxf(0.5,minf(_extent.x/130.0,_extent.y/100.0))
	var center := (_extent*_sun/pixel).round()*pixel
	var light := Color("f4dc9f")
	light.a = _alpha*0.72
	# Short square rays stay entirely inside the upper-half weather area.
	for offset in [Vector2(-8,-1),Vector2(6,-1),Vector2(-1,-8),Vector2(-1,6)]:
		draw_rect(Rect2(center+offset*pixel,Vector2(2,2)*pixel),light)
	light.a = _alpha
	draw_rect(Rect2(center-Vector2(3,4)*pixel,Vector2(6,8)*pixel),light)
	draw_rect(Rect2(center-Vector2(4,3)*pixel,Vector2(8,6)*pixel),light)
	draw_rect(Rect2(center-Vector2(2,3)*pixel,Vector2(3,2)*pixel),Color(1.0,0.94,0.76,_alpha))
