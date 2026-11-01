extends Node2D

const GameSkin = preload("res://app/skin.gd")
const HEIGHTS := [0.16,0.30,0.23,0.39]
const WIDTHS := [0.25,0.18,0.30,0.20]
const STARTS := [-0.06,0.35,0.73,0.12]
const SPEEDS := [0.0028,0.0041,0.0034,0.0022]
var _width := 1.0
var _clouds: Array = []

func setup(extent: Vector2, floor_y: float, alpha: float) -> void:
	_width = extent.x
	z_index = 1
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	for i in range(4):
		var image: Texture2D = load("res://assets/salvage/shared-cloud-"+"abc"[i%3]+".png")
		var cloud := Sprite2D.new()
		cloud.texture = GameSkin.texture(image)
		cloud.centered = false
		var width: float = extent.x*WIDTHS[i]
		var height := width*image.get_height()/image.get_width()
		cloud.scale = Vector2.ONE*(width/image.get_width())
		cloud.position = Vector2(extent.x*STARTS[i],floor_y*HEIGHTS[i]-height)
		cloud.modulate.a = alpha
		add_child(cloud)
		_clouds.append({"sprite":cloud,"width":width,"speed":extent.x*SPEEDS[i]})

func _process(delta: float) -> void:
	# Moving four cached sprites leaves the static scenery draw commands untouched.
	for cloud in _clouds:
		var sprite: Sprite2D = cloud.sprite
		sprite.position.x = fposmod(sprite.position.x+float(cloud.width)-float(cloud.speed)*delta,_width+float(cloud.width))-float(cloud.width)
