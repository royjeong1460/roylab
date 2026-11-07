extends Control

signal finished

const Scenery = preload("res://presentation/cinematic_scenery.gd")
const UITheme = preload("res://app/ui_theme.gd")
const L10n = preload("res://app/localization.gd")
const SPHERE = preload("res://presentation/planet_sphere.gdshader")
const TRANSITIONS := [
	"Beyond the arches, the eaves come into view.",
	"Past the eaves, the amber market opens up.",
	"Beyond the market, the canal stretches ahead.",
	"Past the canal, the high terraces rise.",
	"Beyond the heights, the mosaic basin comes into view."
]
var catalog
var lifecycle
var kind := "ending"
var region := 0
var _duration := 15.0
var _elapsed := 0.0
var _last_tick := 0
var _playing := true
var _scenes: Array = []
var _space: TextureRect
var _planet: ColorRect
var _material: ShaderMaterial
var _region_label: Label
var _caption: Label
var _caption_panel: PanelContainer
var _fade: ColorRect
var _skip: Button
var _actions: HBoxContainer

func setup(source_catalog, source_lifecycle, sequence_kind: String, region_index := 0) -> void:
	catalog = source_catalog
	lifecycle = source_lifecycle
	kind = "transition" if sequence_kind == "transition" else "ending"
	region = clampi(region_index, 0, 4)
	_duration = 3.0 if kind == "transition" else 15.0

func _ready() -> void:
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = UITheme.make(catalog, true)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var indices: Array = [region, region + 1] if kind == "transition" else [0, 1, 2, 3, 4, 5]
	for index in indices:
		var scene := Scenery.new()
		scene.setup(index, kind == "ending" or index == region)
		add_child(scene)
		_scenes.append(scene)
	_space = TextureRect.new()
	_space.texture = catalog.texture("sky")
	_space.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_space.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_space.modulate = Color(0.22, 0.30, 0.34)
	_space.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_space)
	_material = ShaderMaterial.new()
	_material.shader = SPHERE
	_material.set_shader_parameter("worldmap", catalog.texture("worldmap"))
	_material.set_shader_parameter("restoration_a", Vector4.ONE)
	_material.set_shader_parameter("restoration_b", Vector2.ONE)
	_planet = ColorRect.new()
	_planet.material = _material
	_planet.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_planet)
	_fade = ColorRect.new()
	_fade.z_index = 4
	_fade.color = UITheme.MENU_BG
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade)
	_region_label = Label.new()
	_region_label.z_index = 5
	_region_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_region_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_region_label.add_theme_font_size_override("font_size", 14)
	_region_label.add_theme_color_override("font_shadow_color", Color("192b32"))
	_region_label.add_theme_constant_override("shadow_offset_y", 2)
	_region_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_region_label)
	_caption_panel = PanelContainer.new()
	_caption_panel.z_index = 5
	_caption_panel.add_theme_stylebox_override("panel", UITheme.box(Color(0.07, 0.14, 0.17, 0.88), Color.TRANSPARENT, 0, 18))
	_caption_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_caption_panel)
	_caption = Label.new()
	_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_caption.add_theme_font_size_override("font_size", 22)
	_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_caption_panel.add_child(_caption)
	_skip = Button.new()
	_skip.z_index = 6
	_skip.text = L10n.text("Skip →")
	_skip.pressed.connect(func(): finished.emit())
	add_child(_skip)
	_actions = HBoxContainer.new()
	_actions.z_index = 6
	_actions.add_theme_constant_override("separation", 10)
	add_child(_actions)
	for entry in [["Watch again", replay], ["Back to previews", func(): finished.emit()]]:
		var button := Button.new()
		button.text = L10n.text(entry[0])
		button.custom_minimum_size = Vector2(0, 48)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size", 13)
		button.pressed.connect(entry[1])
		_actions.add_child(button)
	resized.connect(_layout)
	lifecycle.active_changed.connect(func(_active): _last_tick = Time.get_ticks_usec())
	_layout()
	replay()

func _layout() -> void:
	if _space == null:
		return
	for scene in _scenes:
		scene.size = size
		scene.pivot_offset = size * 0.5
	_space.size = size
	_fade.size = size
	_skip.position = Vector2(maxf(12.0, size.x - 118.0), 16)
	_skip.size = Vector2(102, 44)
	_region_label.position = Vector2(20, 74)
	_region_label.size = Vector2(maxf(1.0, size.x - 40), 48)
	_caption_panel.size = Vector2(minf(640, maxf(1, size.x - 40)), 116)
	_caption_panel.position = Vector2((size.x - _caption_panel.size.x) * 0.5, maxf(130.0, minf(size.y * 0.67, size.y - 196)))
	_actions.position = Vector2(20, maxf(0, size.y - 72))
	_actions.size = Vector2(maxf(1, size.x - 40), 48)
	_render()

func replay() -> void:
	_elapsed = 0.0
	_last_tick = Time.get_ticks_usec()
	_playing = true
	_actions.hide()
	_skip.show()
	_render()

func _region_name(index: int) -> String:
	return L10n.text(str(catalog.region(index).name))

func _render() -> void:
	var t := _elapsed
	var globe := smoothstep(8.3, 9.7, t) if kind == "ending" else 0.0
	_space.modulate.a = globe
	_planet.visible = globe > 0.0
	_planet.modulate.a = globe
	var diameter := minf(size.x * 0.92, size.y * 0.56) * lerpf(1.65, 0.90, smoothstep(8.3, 13.4, t))
	_planet.size = Vector2.ONE * diameter
	_planet.position = Vector2(size.x * 0.5, size.y * 0.40) - _planet.size * 0.5
	_material.set_shader_parameter("yaw", deg_to_rad(125.0 + maxf(0.0, t - 8.3) * 13.0))
	_material.set_shader_parameter("pitch", deg_to_rad(18.0))
	for i in range(_scenes.size()):
		var alpha := 0.0
		if kind == "transition":
			alpha = 1.0 if i == 0 else smoothstep(0.9, 2.1, t)
		else:
			var start := i * 1.45
			alpha = 1.0 if i == 0 else smoothstep(start, start + 0.45, t)
			if i < 5 and t >= start + 1.90:
				alpha = 0.0
			alpha *= 1.0 - globe
		_scenes[i].visible = alpha > 0.0
		_scenes[i].modulate.a = alpha
		_scenes[i].scale = Vector2.ONE * (1.0 + 0.025 * smoothstep(0, _duration, t))
	if kind == "transition":
		_region_label.text = _region_name(region) + " → " + _region_name(region + 1)
		_caption.text = L10n.text(TRANSITIONS[region])
		_caption_panel.modulate.a = smoothstep(0.2, 0.6, t)
	else:
		_region_label.text = _region_name(clampi(floori(t / 1.45), 0, 5)) if t < 8.3 else "PLANET PATCHUP"
		var message := "The dust settles." if t < 4.6 else "The paths are open again." if t < 9.0 else "A place to begin again."
		_caption.text = L10n.text(message)
		var alpha := smoothstep(0.5, 0.9, t) * (1.0 - smoothstep(4.1, 4.5, t)) if t < 4.6 else smoothstep(4.6, 5.0, t) * (1.0 - smoothstep(8.5, 8.9, t)) if t < 9.0 else smoothstep(9.0, 9.6, t)
		_caption_panel.modulate.a = alpha
	_fade.modulate.a = maxf(1.0 - smoothstep(0.0, 0.6, t), 0.32 * smoothstep(_duration - 0.8, _duration, t))

func _process(_dt: float) -> void:
	var now := Time.get_ticks_usec()
	var delta := maxf(0.0, float(now - _last_tick) / 1000000.0)
	_last_tick = now
	if not _playing or lifecycle == null or not lifecycle.active:
		return
	_elapsed = minf(_duration, _elapsed + delta)
	_render()
	if _elapsed >= _duration:
		_playing = false
		_skip.hide()
		_actions.show()
