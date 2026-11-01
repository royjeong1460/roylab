extends Control

const L10n = preload("res://app/localization.gd")
const GOLD := Color("e3b84f")
var view
var percentage: Label
var milestone: Label
var _tier := 0
var _pulse_at := -10000.0
var _shown_percent := 0

func setup(source_view) -> void:
	view = source_view
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	for index in range(2):
		var label := Label.new()
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_color_override("font_outline_color",Color("263b35"))
		label.add_theme_constant_override("outline_size",4 if index==0 else 2)
		label.add_theme_font_size_override("font_size",42 if index==0 else 13)
		label.add_theme_color_override("font_color",Color("fff4da") if index==0 else GOLD)
		var path: String = view.catalog.asset_path("font")
		if not path.is_empty(): label.add_theme_font_override("font",load(path) as Font)
		add_child(label)
		if index==0: percentage = label
		else: milestone = label
	visible = false

func set_area(area: Rect2) -> void:
	position = area.position
	size = area.size
	percentage.add_theme_font_size_override("font_size",48 if size.x>=350 else 42)

func _center() -> Vector2:
	return view.camera.map_to_screen(view.run.collection_center)-position

func _process(_dt: float) -> void:
	if view==null or view.run==null: return
	var run = view.run
	visible = run.phase=="finishing" and run.collection_started()
	if not visible or run.paused: return
	var next_tier: int = run.collection_tier
	if next_tier>_tier:
		_tier = next_tier
		_pulse_at = run.finishing_elapsed_ms
		percentage.add_theme_color_override("font_color",GOLD)
	_shown_percent = maxi(_shown_percent,clampi(floori(float(run.recovered())*100.0/maxi(1,run.total())),0,100))
	percentage.text = "%d%%" % _shown_percent
	milestone.text = L10n.text("ALL CLEAR" if _tier==100 else "CLEARED") if _tier>=70 else ""
	var center := _center()
	percentage.size = Vector2(minf(240,size.x),64)
	percentage.position = center-percentage.size/2.0
	percentage.pivot_offset = percentage.size/2.0
	var pulse := clampf((float(run.finishing_elapsed_ms)-_pulse_at)/650.0,0.0,1.0)
	percentage.scale = Vector2.ONE if view.vfx.reduced_motion else Vector2.ONE*(1.0+sin(pulse*PI)*(0.16+maxi(0,_tier-70)*0.004))
	milestone.size = Vector2(minf(240,size.x),26)
	milestone.position = center+Vector2(-milestone.size.x/2.0,34)
	queue_redraw()

func _draw() -> void:
	if not visible or view==null or view.run==null: return
	var center := _center()
	var age := 0.0 if view.vfx.reduced_motion else maxf(0.0,(float(view.run.finishing_elapsed_ms)-1000.0)/1000.0)
	var radius := clampf(minf(size.x,size.y)*0.115,24.0,44.0)
	var ink := GOLD if _tier>=70 else Color("98d7bb")
	# Only bounded rings are decorative; every moving pixel is drawn by World.
	for arm in range(3):
		var points := PackedVector2Array()
		for step in range(21):
			var t := float(step)/20.0
			var angle := age*1.7+float(arm)*TAU/3.0+t*2.2
			points.append(center+Vector2.from_angle(angle)*lerpf(radius*0.55,radius*1.55,t))
		draw_polyline(points,Color(ink,0.42),2.0)
	draw_circle(center,radius,Color("243c36e6"))
	draw_arc(center,radius,0,TAU,48,Color(ink,0.9),2.0)
	var pulse := clampf((float(view.run.finishing_elapsed_ms)-_pulse_at)/650.0,0.0,1.0)
	if _tier>=70 and pulse<1.0 and not view.vfx.reduced_motion:
		draw_arc(center,radius*(1.2+pulse*1.6),0,TAU,48,Color(GOLD,(1.0-pulse)*0.75),2.0)
