extends Control

const Locale = preload("res://app/localization.gd")
const COLORS := [Color("f1ce77"),Color("f0ae62"),Color("ee8661"),Color("dd7185")]
const LIFE := 1.1
const LIMIT := 10
var view
var effects: Array = []
var font: Font = ThemeDB.fallback_font
var reduced_motion := false

func setup(source_view) -> void:
	view = source_view
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	var font_path: String = view.catalog.asset_path("font")
	if not font_path.is_empty() and ResourceLoader.exists(font_path):
		var bold := FontVariation.new()
		bold.base_font = load(font_path) as Font
		bold.variation_embolden = 0.8
		font = bold

func set_area(play_area: Rect2) -> void:
	position = play_area.position
	size = play_area.size
	queue_redraw()

func clear() -> void:
	for effect in effects:
		effect.label.hide()
		effect.label.queue_free()
	effects.clear()
	queue_redraw()

func _caption(stage: int, count: int) -> String:
	return "%d %s\n%s" % [stage,Locale.text("CHAIN"),Locale.format("+%d SCRAP",[count]) if count > 0 else Locale.text("CRACK")]

func process_events(source_events: Array) -> void:
	for source in source_events:
		if not source is Dictionary or source.get("kind") != "chain-impact":
			continue
		var point: Vector2 = source.p if source.get("p") is Vector2 else Vector2(float(source.get("x",0)),float(source.get("y",0)))
		if not point.is_finite():
			continue
		var key := "%s:%s" % [source.get("chainId",0),source.get("edge","")]
		var stage := maxi(1,int(source.get("stage",1)))
		var count := maxi(0,int(source.get("count",0)))
		var merged := false
		for effect in effects:
			if effect.key == key and effect.age < 0.15:
				effect.count += count
				effect.caption_stage = stage
				effect.label.text = _caption(stage,effect.count)
				merged = true
				break
		if merged:
			continue
		if effects.size() >= LIMIT:
			var expired: Dictionary = effects.pop_front()
			expired.label.hide()
			expired.label.queue_free()
		var color: Color = COLORS[mini(COLORS.size()-1,stage-1)]
		var label := Label.new()
		label.text = _caption(stage,count)
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.mouse_filter = Control.MOUSE_FILTER_IGNORE
		label.add_theme_font_override("font",font)
		label.add_theme_font_size_override("font_size",17)
		label.add_theme_color_override("font_color",color)
		label.add_theme_color_override("font_outline_color",Color("273c3c"))
		label.add_theme_constant_override("outline_size",4)
		label.add_theme_color_override("font_shadow_color",Color(0.05,0.1,0.1,0.75))
		label.add_theme_constant_override("shadow_offset_x",1)
		label.add_theme_constant_override("shadow_offset_y",2)
		add_child(label)
		effects.append({"key":key,"stage":stage,"caption_stage":stage,"count":count,"point":point,"color":color,"age":0.0,"label":label})
	_layout_labels()
	queue_redraw()

func _paused() -> bool:
	return view == null or not is_instance_valid(view) or view.run == null or view.run.paused or view.run.state != "active"

func _screen_point(point: Vector2) -> Vector2:
	return view.camera.map_to_screen(point) - position

func _layout_labels() -> void:
	if view == null or view.camera == null or size.x <= 0 or size.y <= 0:
		return
	for effect in effects:
		var label: Label = effect.label
		label.text = _caption(effect.caption_stage,effect.count)
		label.size = label.get_minimum_size()
		var point := _screen_point(effect.point)
		var margin := minf(size.x/2.0,maxf(70.0,label.size.x/2.0+8.0))
		var x := clampf(point.x,margin,size.x-margin)
		var top := minf(size.y,maxf(54.0,label.size.y+8.0))
		var y := clampf(point.y-12.0-(0.0 if reduced_motion else effect.age*30.0),top,maxf(top,size.y-8.0))
		label.position = Vector2(x-label.size.x/2.0,y-label.size.y)
		label.modulate.a = maxf(0.0,1.0-effect.age/LIFE)

func _process(dt: float) -> void:
	if _paused() or not is_finite(dt) or dt <= 0:
		return
	if view.vfx != null:
		reduced_motion = view.vfx.reduced_motion
	for index in range(effects.size()-1,-1,-1):
		var effect: Dictionary = effects[index]
		effect.age += dt
		if effect.age >= LIFE:
			effect.label.hide()
			effect.label.queue_free()
			effects.remove_at(index)
	_layout_labels()
	queue_redraw()

func _draw() -> void:
	if view == null or view.camera == null or reduced_motion:
		return
	for effect in effects:
		var flash := maxf(0.0,1.0-effect.age/0.5)
		if flash <= 0:
			continue
		var point := _screen_point(effect.point)
		var radius: float = (6.0+sqrt(float(effect.count))*0.7)*view.camera.zoom.x*4.0
		var ink: Color = effect.color
		ink.a = flash*0.8
		draw_arc(point,radius*(0.45+effect.age*2.0),0,TAU,48,ink,2)
		for i in range(8):
			var angle: float = i*PI/4.0+effect.stage*0.23
			var distance: float = radius*(0.25+effect.age*3.0)
			draw_rect(Rect2(point+Vector2.from_angle(angle)*distance-Vector2(2,2),Vector2(4,4)),ink)
