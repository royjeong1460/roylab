extends VBoxContainer

const CultureBackdrop = preload("res://presentation/culture_backdrop.gd")
const UITheme = preload("res://app/ui_theme.gd")
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
var picture := Control.new()

func setup(site: Dictionary, restoration_ratio: float) -> void:
	_site = site
	ratio = restoration_ratio

func _ready() -> void:
	custom_minimum_size.y = 150
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override("separation", 4)
	picture.custom_minimum_size.y = 124
	picture.size_flags_vertical = Control.SIZE_EXPAND_FILL
	picture.mouse_filter = Control.MOUSE_FILTER_IGNORE
	picture.clip_contents = true
	add_child(picture)
	_map = MapGeometry.new(_site)
	picture.add_child(_map)
	scenery = CultureBackdrop.new()
	scenery.setup(_map,maxi(0,int(_site.get("region",0))),ratio,str(_site.id))
	scenery.z_index = 0
	scenery.process_mode = Node.PROCESS_MODE_DISABLED
	picture.add_child(scenery)
	var caption := Label.new()
	var complete := is_finite(ratio) and ratio >= 1.0
	caption.text = L10n.text("100% restored" if complete else "70% restored" if is_finite(ratio) and ratio >= 0.7 else "Before restoration")
	caption.custom_minimum_size.y = 22
	caption.add_theme_font_size_override("font_size",12)
	caption.add_theme_color_override("font_color",UITheme.CLEAR_GOLD if complete else UITheme.MINT)
	caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(caption)
	picture.resized.connect(_layout)
	_layout()

func _layout() -> void:
	if picture.size.x <= 0 or picture.size.y <= 0:
		return
	var view_width := float(_map.width)*4.0
	var factor := picture.size.x/view_width
	var view_height := picture.size.y/factor
	var floor := float(_map.floor_y)*4.0
	for span in _map.terrain:
		floor = maxf(floor,float(span.y)*4.0)
	var bounds := Rect2(0,floor-view_height*0.88,view_width,view_height)
	scenery.cover_view(bounds)
	scenery.weather_view(bounds)
	scenery.scale = Vector2.ONE * factor
	scenery.position = -bounds.position*factor
