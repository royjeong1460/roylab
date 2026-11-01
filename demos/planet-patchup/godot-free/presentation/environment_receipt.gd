extends Control

const Background = preload("res://background.gd")
const L10n = preload("res://app/localization.gd")
var ratio := 0.0
var scenery: Control
var caption: Label

func setup(restoration_ratio: float) -> void:
	ratio = restoration_ratio
	if scenery != null:
		scenery.restoration = ratio
		_update_caption()

func _ready() -> void:
	custom_minimum_size.y = 150
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	scenery = Background.new()
	scenery.width = 576.0
	scenery.height = 256.0
	scenery.floor_y = 224.0
	scenery.restoration = ratio
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
	var tier: float = scenery.restoration_tier()
	caption.text = L10n.text("100% restored" if tier >= 1.0 else "70% restored" if tier >= 0.7 else "Before restoration")

func _layout() -> void:
	if scenery == null or caption == null:
		return
	var factor := maxf(0.0,minf(size.x/576.0,(size.y-24.0)/256.0))
	scenery.scale = Vector2.ONE * factor
	scenery.position = Vector2((size.x-576.0*factor)*0.5,0)
	caption.position = Vector2(0,256.0*factor+4)
	caption.size = Vector2(size.x,20)
