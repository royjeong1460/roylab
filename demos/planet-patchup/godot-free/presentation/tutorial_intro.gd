extends Control

signal finished

const DURATION := 5.0
const SPHERE_SHADER = preload("res://presentation/planet_sphere.gdshader")
const Background = preload("res://background.gd")
const UITheme = preload("res://app/ui_theme.gd")
const L10n = preload("res://app/localization.gd")

var catalog
var lifecycle
var _elapsed := 0.0
var _last_tick_usec := 0
var _completed := false
var _sky: TextureRect
var _sphere: ColorRect
var _material: ShaderMaterial
var _scenery: Control
var _caption: Label
var _caption_panel: PanelContainer
var _skip: Button
var _fade: ColorRect
var _progress: ProgressBar

func setup(source_catalog, source_lifecycle) -> void:
	catalog = source_catalog
	lifecycle = source_lifecycle

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	theme = UITheme.make(catalog, true)
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_sky = TextureRect.new()
	_sky.texture = catalog.texture("sky")
	_sky.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_sky.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	_sky.modulate = Color(0.34, 0.40, 0.43)
	_sky.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_sky)
	_material = ShaderMaterial.new()
	_material.shader = SPHERE_SHADER
	_material.set_shader_parameter("worldmap", catalog.texture("worldmap"))
	_sphere = ColorRect.new()
	_sphere.material = _material
	_sphere.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_sphere)
	_scenery = Background.new()
	_scenery.width = 576.0
	_scenery.height = 384.0
	_scenery.floor_y = 344.0
	add_child(_scenery)
	_caption_panel = PanelContainer.new()
	_caption_panel.z_index = 5
	_caption_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_caption_panel.add_theme_stylebox_override("panel", UITheme.box(Color(0.08, 0.15, 0.18, 0.90), UITheme.MENU_BORDER, 1, 16))
	add_child(_caption_panel)
	_caption = Label.new()
	_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_caption.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_caption.add_theme_font_size_override("font_size", 20)
	_caption_panel.add_child(_caption)
	_progress = ProgressBar.new()
	_progress.z_index = 12
	_progress.max_value = DURATION
	_progress.show_percentage = false
	_progress.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_progress.add_theme_stylebox_override("background", UITheme.box(UITheme.MENU_PANEL, Color.TRANSPARENT, 0, 0))
	_progress.add_theme_stylebox_override("fill", UITheme.box(UITheme.GOLD, Color.TRANSPARENT, 0, 0))
	add_child(_progress)
	_fade = ColorRect.new()
	_fade.z_index = 10
	_fade.color = UITheme.MENU_BG
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade)
	_skip = Button.new()
	_skip.z_index = 11
	_skip.text = L10n.text("Skip →")
	_skip.add_theme_font_size_override("font_size", 13)
	_skip.pressed.connect(finish)
	add_child(_skip)
	resized.connect(_layout)
	_layout()
	lifecycle.active_changed.connect(_foreground_changed)
	_last_tick_usec = Time.get_ticks_usec()

func _layout() -> void:
	if _sphere == null:
		return
	_sky.size = size
	_fade.size = size
	_skip.position = Vector2(maxf(12.0, size.x - 110.0), 16.0)
	_skip.size = Vector2(94, 44)
	_caption_panel.size = Vector2(minf(560.0, maxf(1.0, size.x - 40.0)), 92.0)
	_caption_panel.position = Vector2((size.x - _caption_panel.size.x) * 0.5, maxf(76.0, minf(size.y * 0.74, size.y - 112.0)))
	_progress.position = Vector2(20.0, maxf(0.0, size.y - 10.0))
	_progress.size = Vector2(maxf(1.0, size.x - 40.0), 3.0)
	_render()

func _render() -> void:
	var zoom := smoothstep(1.8, 3.7, _elapsed)
	var dissolve := smoothstep(2.5, 3.7, _elapsed)
	var diameter := minf(size.x * 0.9, size.y * 0.54) * lerpf(1.0, 3.0, zoom)
	_sphere.size = Vector2.ONE * diameter
	_sphere.position = Vector2(size.x * 0.5, size.y * 0.43) - _sphere.size * 0.5
	_sphere.modulate.a = 1.0 - dissolve
	_material.set_shader_parameter("yaw", deg_to_rad(lerpf(95.0, 125.0, minf(1.0, _elapsed / 3.0))))
	_material.set_shader_parameter("pitch", deg_to_rad(18.0))
	var cover := maxf(size.x / _scenery.width, size.y / _scenery.height) * lerpf(1.0, 1.04, smoothstep(3.0, 5.0, _elapsed))
	_scenery.scale = Vector2.ONE * cover
	_scenery.position = (size - _scenery.size * cover) * 0.5
	_scenery.modulate.a = dissolve
	var message := L10n.text("A planet left behind." if _elapsed < 2.5 else "First cleanup starts here.")
	if _caption.text != message:
		_caption.text = message
	_caption_panel.modulate.a = minf(smoothstep(0.3, 0.7, _elapsed), 1.0 - smoothstep(4.3, 4.7, _elapsed))
	_fade.modulate.a = maxf(1.0 - smoothstep(0.0, 0.35, _elapsed), smoothstep(4.5, DURATION, _elapsed))
	_progress.value = _elapsed

func _foreground_changed(_active: bool) -> void:
	_last_tick_usec = Time.get_ticks_usec()

func _process(_delta: float) -> void:
	var now := Time.get_ticks_usec()
	var delta := maxf(0.0, float(now - _last_tick_usec) / 1000000.0)
	_last_tick_usec = now
	if _completed or lifecycle == null or not lifecycle.active:
		return
	_elapsed = minf(DURATION, _elapsed + delta)
	_render()
	if _elapsed >= DURATION:
		finish()

func finish() -> void:
	if _completed:
		return
	_completed = true
	set_process(false)
	finished.emit()
