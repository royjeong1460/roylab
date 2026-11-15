extends Control

const CultureBackdrop = preload("res://presentation/culture_backdrop.gd")
const L10n = preload("res://app/localization.gd")

# Scenery needs terrain metadata, never a second playable World or expanded pixel grid.
class MapGeometry extends Node2D:
	var width: int
	var height: int
	var floor_y: int
	var terrain: Array
	var ground_surface := PackedInt32Array()
	var fixture: Dictionary

	func _init(site: Dictionary) -> void:
		fixture = site.duplicate(true)
		width = int(site.width)
		height = int(site.height)
		floor_y = int(site.floor_y)
		terrain = site.terrain.duplicate(true) if site.get("terrain") is Array else []
		if terrain.is_empty():
			terrain = [{"x":0,"w":width,"y":floor_y}]
		ground_surface.resize(width)
		ground_surface.fill(floor_y)
		for span in terrain:
			for x in range(maxi(0,int(span.x)),mini(width,int(span.x+span.w))):
				ground_surface[x] = int(span.y)

var ratio := 0.0
var _site: Dictionary
var _map: MapGeometry
var scenery: Node2D
var caption: Label

func setup(site: Dictionary, restoration_ratio: float) -> void:
	_site = site
	ratio = restoration_ratio

func _ready() -> void:
	custom_minimum_size.y = 150
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	_map = MapGeometry.new(_site)
	add_child(_map)
	scenery = CultureBackdrop.new()
	scenery.setup(_map,maxi(0,int(_site.get("region",0))),ratio,str(_site.id))
	# The play renderer uses -100 behind gameplay; this preview must sit above the menu.
	scenery.z_index = 0
	scenery.process_mode = Node.PROCESS_MODE_DISABLED
	add_child(scenery)
	caption = Label.new()
	caption.add_theme_font_size_override("font_size",10)
	caption.add_theme_color_override("font_color",Color("a6c5ae"))
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(caption)
	resized.connect(_layout)
	_update_caption()
	_layout()

func _update_caption() -> void:
	if caption == null:
		return
	var tier := 1.0 if is_finite(ratio) and ratio >= 1.0 else 0.7 if is_finite(ratio) and ratio >= 0.7 else 0.0
	caption.text = L10n.text("100% restored" if tier >= 1.0 else "70% restored" if tier >= 0.7 else "Before restoration")

func _layout() -> void:
	if scenery == null or caption == null or size.x <= 0 or size.y <= 24:
		return
	var view_width := float(_map.width)*4.0
	var factor := size.x/view_width
	var view_height := (size.y-24.0)/factor
	var floor := float(_map.floor_y)*4.0
	for span in _map.terrain:
		floor = maxf(floor,float(span.y)*4.0)
	var bounds := Rect2(0,floor-view_height*0.88,view_width,view_height)
	scenery.cover_view(bounds)
	scenery.weather_view(bounds)
	scenery.scale = Vector2.ONE * factor
	scenery.position = -bounds.position*factor
	caption.position = Vector2(0,size.y-20.0)
	caption.size = Vector2(size.x,20)
