extends Node2D

const GameSkin = preload("res://app/skin.gd")
const CloudLayer = preload("res://presentation/cloud_layer.gd")

# Direct translation of paid-app/src/culture-presentation.js. Terrain stays visual here.
const THEMES := [
	{},
	{"sky":"e9dfc9","distant":"d6cbb5","ground":"c6c9bc","edge":"6e7d72"},
	{"sky":"f0e4cd","distant":"dfcdb0","ground":"c9b58d","edge":"8a7556"},
	{"sky":"e1e9e6","distant":"c8d5d1","ground":"b4bfc0","edge":"6c7d7d"},
	{"sky":"e6e8d8","distant":"cfd5bf","ground":"b9b7a1","edge":"777b6b"},
	{"sky":"e8e5dc","distant":"d3d0c5","ground":"bcb9a9","edge":"78776d"},
]
var world: Node
var region := 1

func setup(source_world: Node, region_index: int) -> void:
	world = source_world
	region = clampi(region_index,1,5)
	z_index = -100
	var clouds := CloudLayer.new()
	add_child(clouds)
	clouds.setup(Vector2(world.width,world.height)*4.0,world.floor_y*4.0,0.7)
	queue_redraw()

func _roof(kind: int, x: float, y: float, width: float, height: float, color: Color) -> void:
	for step in range(4):
		var t := (step+1)/4.0
		var h := height/4
		if kind == 3:
			for tooth in range(3):
				draw_rect(Rect2(x+tooth*width/3,y+step*h,width*t/3,h),color)
		else:
			var span := sqrt(1-pow(1-t,2)) if kind == 2 else 0.55+t*0.45 if kind == 4 else t
			draw_rect(Rect2(x+width*(1-span)/2,y+step*h,width*span,h),color)

func _draw() -> void:
	if world == null:
		return
	draw_set_transform(Vector2.ZERO,0,Vector2(4,4))
	var theme: Dictionary = GameSkin.culture_style(THEMES[region])
	var w: float = world.width
	var h: float = world.height
	var floor_y: float = world.floor_y
	draw_rect(Rect2(0,0,w,h),Color(theme.sky))
	for i in range(4):
		var x := w*(i*0.28-0.04)
		var rw := w*(0.22 if i%2 else 0.18)
		var y := floor_y*(0.64+(i%2)*0.11)
		var rh := floor_y*0.055
		draw_rect(Rect2(x+rw*0.12,y,rw*0.76,floor_y-y),Color(theme.distant))
		_roof(i+1 if region == 5 else region,x,y-rh,rw,rh,Color(theme.distant))
	var terrain: Array = world.get("terrain") if world.get("terrain") is Array else []
	if terrain.is_empty():
		terrain = [{"x":0,"w":w,"y":floor_y}]
	for segment in terrain:
		draw_rect(Rect2(float(segment.x),float(segment.y),float(segment.w),h-float(segment.y)),Color(theme.ground))
		draw_rect(Rect2(float(segment.x),float(segment.y),float(segment.w),1),Color(theme.edge))
	for i in range(1,terrain.size()):
		var a: Dictionary = terrain[i-1]
		var b: Dictionary = terrain[i]
		draw_rect(Rect2(float(b.x),minf(a.y,b.y),0.6,absf(a.y-b.y)),Color(theme.edge))
