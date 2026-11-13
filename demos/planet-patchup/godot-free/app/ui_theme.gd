extends RefCounted

const BG := Color("091322")
const PANEL := Color("121f2d")
const BORDER := Color("344351")
const MENU_BG := Color("192b32")
const MENU_PANEL := Color("263c45")
const MENU_BORDER := Color("47616a")
const TEAL_SCREENS := ["regions","pause","restoration","maps","workshop","loadout","receipt","chapter","settings","tutorial_intro","presentation_preview","presentation_sequence"]
const TEXT := Color("eee3c9")
const MUTED := Color("a8b3b8")
const GOLD := Color("cbb17a")
const MINT := Color("a6c5ae")
const HUD_INK := Color("394337")
const HUD_CREAM := Color("d7d2b2")
const HUD_PALE := Color("eee4c3")
const HUD_OLIVE := Color("63714e")
const HUD_SAND := Color("ede4c3")

static func tint_icon(control: CanvasItem, color := GOLD) -> void:
	# Source menus recolor the original monochrome SVGs with a CSS filter.
	var shader := Shader.new()
	shader.code = "shader_type canvas_item; uniform vec4 ink : source_color; void fragment() { COLOR = vec4(ink.rgb, ink.a * COLOR.a); }"
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("ink", color)
	control.material = material

static func hud_button(button: Button, olive := false) -> void:
	var fill := HUD_OLIVE if olive else Color("f0e5bd")
	var border := Color("e7c975") if olive else Color("7b8362")
	for state in ["normal","hover","pressed","disabled"]:
		var color := fill.lightened(0.08) if state == "hover" else fill.darkened(0.1) if state == "pressed" else fill
		button.add_theme_stylebox_override(state,box(color,border,2,0))
	button.add_theme_stylebox_override("focus",box(Color.TRANSPARENT,border,2,0))

static func box(fill: Color, border := BORDER, width := 1, padding := 12) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(width)
	style.content_margin_left = padding
	style.content_margin_right = padding
	style.content_margin_top = padding
	style.content_margin_bottom = padding
	return style

static func make(catalog, teal := false) -> Theme:
	var theme := Theme.new()
	var font_path: String = catalog.asset_path("font")
	if not font_path.is_empty() and ResourceLoader.exists(font_path):
		theme.default_font = load(font_path) as Font
	theme.default_font_size = 13
	var panel := MENU_PANEL if teal else PANEL
	for state in ["normal", "hover", "pressed", "disabled", "focus"]:
		var fill := panel
		var border := MENU_BORDER if teal else BORDER
		if state == "hover":
			fill = panel.lightened(0.05) if teal else Color("1d2d3a")
			border = GOLD
		elif state == "pressed":
			fill = panel.darkened(0.15) if teal else Color("293641")
		elif state == "focus":
			fill = Color.TRANSPARENT
			border = GOLD
		theme.set_stylebox(state, "Button", box(fill, border, 2 if state == "focus" else 1, 10))
	theme.set_color("font_color", "Button", TEXT)
	theme.set_color("font_hover_color", "Button", TEXT)
	theme.set_color("font_pressed_color", "Button", GOLD)
	theme.set_color("font_disabled_color", "Button", Color("899398"))
	theme.set_color("font_color", "Label", TEXT)
	theme.set_color("default_color", "RichTextLabel", TEXT)
	theme.set_constant("separation", "VBoxContainer", 10)
	theme.set_constant("separation", "HBoxContainer", 8)
	theme.set_constant("h_separation", "GridContainer", 10)
	theme.set_constant("v_separation", "GridContainer", 10)
	theme.set_stylebox("panel", "PanelContainer", box(panel,MENU_BORDER if teal else BORDER))
	theme.set_stylebox("background", "ProgressBar", box(Color("27323c"), Color.TRANSPARENT, 0, 0))
	theme.set_stylebox("fill", "ProgressBar", box(MINT, Color.TRANSPARENT, 0, 0))
	theme.set_stylebox("scroll", "VScrollBar", box(MENU_BG if teal else Color("15212d"), Color.TRANSPARENT, 0, 0))
	theme.set_stylebox("grabber", "VScrollBar", box(Color("68808a") if teal else Color("536772"), Color.TRANSPARENT, 0, 0))
	return theme
