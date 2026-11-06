extends Control

const GameSkin = preload("res://app/skin.gd")
const CloudLayer = preload("res://presentation/cloud_layer.gd")

var images := {}
var width := 460.0
var height := 628.0
var floor_y := 580.0
var _clouds: CloudLayer
var _map_floor_y := 0.0
var _tile_depth := 28.0
var restoration := 0.0:
	set(value):
		restoration = value
		queue_redraw()

func restoration_tier() -> float:
	return 1.0 if is_finite(restoration) and restoration >= 1.0 else 0.7 if is_finite(restoration) and restoration >= 0.7 else 0.0

func environment_style() -> Dictionary:
	var tier := restoration_tier()
	if tier == 1.0:
		return GameSkin.arch_style({"sky":Color("a9c7cf"),"horizon":Color("cad4c2"),"ground":Color("a08365"),"dust":0.0},tier)
	if tier == 0.7:
		return GameSkin.arch_style({"sky":Color("b6c3bc"),"horizon":Color("c8c6ac"),"ground":Color("96816a"),"dust":0.08},tier)
	return GameSkin.arch_style({"sky":Color("aca696"),"horizon":Color("afa58f"),"ground":Color("776653"),"dust":0.26},tier)

func _ready() -> void:
	_map_floor_y = floor_y
	size = Vector2(width, height)
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	for name in ["shared-cloud-a", "shared-cloud-b", "shared-cloud-c", "shared-mesa-a", "shared-mesa-b", "shared-mesa-c", "01-compacted", "02-panels", "03-pipes", "04-appliances", "05-drums", "06-mixed", "arch-ground-a", "arch-ground-b", "arch-ground-c", "arch-building-a", "arch-building-b", "arch-building-c", "prop-stairs", "prop-fountain", "prop-lamp", "prop-bench", "shared-scrap-a", "shared-scrap-b", "shared-scrap-c"]:
		images[name] = load("res://assets/salvage/" + name + ".png")
	_clouds = CloudLayer.new()
	add_child(_clouds)
	var cloud_alpha := 0.85 if GameSkin.bright() else 0.72 if restoration_tier()>0 else 0.42
	# The new sprite layer is above the dust draw; preserve the old effective alpha.
	_clouds.setup(Vector2(width,height),floor_y,cloud_alpha*(1.0-float(environment_style().dust)))
	queue_redraw()

func cover_view(bounds: Rect2) -> void:
	position = bounds.position
	width = bounds.size.x
	height = bounds.size.y
	floor_y = _map_floor_y - bounds.position.y
	_tile_depth = height - floor_y
	size = bounds.size
	_clouds.position = -bounds.position
	queue_redraw()

func sprite(name: String, x: float, base: float, target_width: float, alpha := 1.0, max_height := INF) -> void:
	var texture: Texture2D = images.get(name)
	if texture == null:
		return
	texture = GameSkin.texture(texture)
	target_width = minf(target_width, max_height * texture.get_width() / texture.get_height())
	var target_height := roundf(texture.get_height() * target_width / texture.get_width())
	draw_texture_rect(texture, Rect2(roundf(x), roundf(base - target_height), roundf(target_width), target_height), false, Color(1, 1, 1, alpha))

func _draw() -> void:
	var w := width
	var h := height
	var f := floor_y
	var tier := restoration_tier()
	var style := environment_style()
	draw_rect(Rect2(0, 0, w, h), style.sky)
	for x in range(0, int(w), 8):
		var u := x / w
		var y := roundf((f * 0.79 + sin(u * 9 + 0.4) * f * 0.025 + sin(u * 23) * f * 0.009) / 4) * 4
		draw_rect(Rect2(x, y, 8, h - y), style.horizon)
	var sand := [Color("c8b99e"), Color("c0ac8d"), Color("b49b7d")]
	for layer in range(3):
		for x in range(0, int(w), 4):
			var u := x / w
			var y := roundf((f * (0.80 + layer * 0.065) + sin(u * 8 + layer * 2) * f * 0.012 + sin(u * 21 + layer) * f * 0.004) / 2) * 2
			draw_rect(Rect2(x, y, 4, f - y), sand[layer])
	for y in range(ceili(f * 0.83), int(f), 7):
		for x in range((y * 13) % 29, int(w), 29):
			var grain := (x * 17 + y * 23) % 11
			if grain <= 5:
				var color := Color("e0cbaa") if grain % 2 else Color("927b62")
				color.a = 0.24
				draw_rect(Rect2(x, y, 3 + grain, 2 if y > f * 0.94 else 1), color)
	for i in range(-1, 3):
		sprite("shared-mesa-" + "abc"[(i + 3) % 3], i * w * 0.43, f * 0.82, w * 0.63, 0.32)
	if tier > 0:
		sprite("arch-building-b", -w * 0.03, f * 0.86, w * 0.30, 0.72)
		sprite("arch-building-a", w * 0.20, f * 0.81, w * 0.60, 0.86)
		sprite("arch-building-c", w * 0.80, f * 0.855, w * 0.25, 0.72)
		for prop in [["prop-stairs",0.03,0.96,0.26],["prop-fountain",0.65,0.94,0.23],["prop-lamp",0.57,0.935,0.035],["prop-lamp",0.91,0.95,0.035],["prop-bench",0.38,0.982,0.15],["prop-bench",0.84,0.985,0.13]]:
			sprite(prop[0],prop[1]*w,prop[2]*f,prop[3]*w,0.76,f*0.28)
	var positions := [[-0.21, 0.54], [0.01, 0.49], [0.25, 0.51], [0.49, 0.48], [0.73, 0.50], [-0.08, 0.30], [0.12, 0.35], [0.35, 0.32], [0.57, 0.34], [0.79, 0.31]]
	var names := ["01-compacted", "02-panels", "03-pipes", "04-appliances", "05-drums", "06-mixed"]
	var materials := [0, 5, 3, 4, 1, 2, 0, 1, 3, 4]
	var remaining: Array = [] if tier == 1.0 else [0,5,9] if tier == 0.7 else [0,1,2,3,4,5,6,7,8,9]
	for i in remaining:
		sprite(names[materials[i]], positions[i][0] * w, f + 4 + (i % 3) * 3, w * positions[i][1], 0.86 if i >= 5 else 0.70, f * 0.62)
	if style.dust > 0:
		var dust: Color = style.sky
		dust.a = style.dust
		draw_rect(Rect2(0, 0, w, f), dust)
	draw_rect(Rect2(0, f, w, h - f), style.ground)
	if tier == 1.0:
		draw_rect(Rect2(w*0.04,f-5,w*0.29,5),Color("83a8aa"))
		draw_rect(Rect2(w*0.07,f-4,w*0.12,1),Color("a8ced0"))
		for x in [0.02,0.37,0.71,0.93]:
			draw_rect(Rect2(roundf(w*x),f-3,12,3),Color("8f9f74"))
			draw_rect(Rect2(roundf(w*x)+3,f-6,4,3),Color("8f9f74"))
	for x in range(0, int(w), 192):
		var name := "arch-ground-" + "abc"[(x / 192) as int % 3]
		var texture: Texture2D = images.get(name)
		if texture != null:
			draw_texture_rect(GameSkin.texture(texture), Rect2(x, f, 192, _tile_depth), false, Color(1, 1, 1, 0.85))
