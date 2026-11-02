extends Control

const L10n = preload("res://app/localization.gd")
const CREAM := Color("fff0c3")
const GOLD := Color("e5b557")
const OLIVE := Color("36462e")
const TIER_INKS := [Color("dca64d"),Color("bbce87"),Color("f3cb6b"),Color("fff4cf")]
const SPARK_DIRECTIONS := [Vector2(-1,-0.4),Vector2(1,-0.4),Vector2(-0.7,-1),Vector2(0.7,-1),Vector2(-1,0.45),Vector2(1,0.45),Vector2(-0.5,1),Vector2(0.5,1),Vector2(-1,0),Vector2(1,0),Vector2(-0.25,-1),Vector2(0.25,-1),Vector2(-0.85,0.9),Vector2(0.85,0.9),Vector2(-0.2,1),Vector2(0.2,1)]
var view
var _font: Font
var _digits: Array = []
var _number_group: Control
var _percent: Label
var _title_group: Control
var _title_shadow: Label
var _title: Label
var _shine_clip: Control
var _shine: Label
var _fade_layer: CanvasLayer
var _fade: ColorRect
var _tier := 0
var _pulse_at := -10000.0
var _title_at := -10000.0
var _counter_value := 0.0
var _shown_percent := 0
var _previous_text := "  0"
var _current_text := "  0"
var _flip_at := -10000.0
var _last_clock := -1.0
var _last_count_tick := -10000.0
var _font_size := 77
var _title_size := 44
var _unit := 1.0
var _fading := false
var _fade_duration := 0.5
var _fade_elapsed := 0.0

func setup(source_view) -> void:
	view = source_view
	# The pause menu must remain visible above a stopped fade, even while the tree is paused.
	process_mode = Node.PROCESS_MODE_ALWAYS
	process_priority = -1
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	clip_contents = true
	_font = load(view.catalog.asset_path("font")) as Font
	_number_group = _control(self)
	for index in range(3):
		var frame := _control(_number_group)
		frame.clip_contents = true
		var digit := _label(frame,_font_size,CREAM,3)
		_digits.append({"frame":frame,"label":digit})
	_percent = _label(_number_group,33,CREAM,2)
	_percent.text = "%"
	_title_group = _control(self)
	_title_shadow = _label(_title_group,_title_size,OLIVE,7)
	_title_shadow.position = Vector2(2,3)
	_title = _label(_title_group,_title_size,GOLD,3)
	_title.add_theme_color_override("font_outline_color",CREAM)
	_shine_clip = _control(_title_group)
	_shine_clip.clip_contents = true
	_shine = _label(_shine_clip,_title_size,Color("fffdf0"),3)
	_shine.add_theme_color_override("font_outline_color",Color("fffdf0"))
	_shine.add_theme_constant_override("shadow_offset_x",0)
	_shine.add_theme_constant_override("shadow_offset_y",0)
	# A separate viewport canvas covers the HUD and unsafe areas, without clipping to the field.
	_fade_layer = CanvasLayer.new()
	_fade_layer.layer = 10
	view.add_child(_fade_layer)
	_fade = ColorRect.new()
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade.color = Color("09132200")
	_fade_layer.add_child(_fade)
	_fade.hide()
	_title_group.hide()
	visible = false

func _control(parent: Node) -> Control:
	var item := Control.new()
	item.mouse_filter = Control.MOUSE_FILTER_IGNORE
	parent.add_child(item)
	return item

func _label(parent: Control, font_size: int, color: Color, edge: int) -> Label:
	var label := Label.new()
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.add_theme_font_override("font",_font)
	label.add_theme_font_size_override("font_size",font_size)
	label.add_theme_color_override("font_color",color)
	label.add_theme_color_override("font_outline_color",OLIVE)
	label.add_theme_constant_override("outline_size",edge)
	label.add_theme_color_override("font_shadow_color",Color("263326"))
	label.add_theme_constant_override("shadow_offset_x",4)
	label.add_theme_constant_override("shadow_offset_y",5)
	parent.add_child(label)
	return label

func set_area(area: Rect2) -> void:
	position = area.position.round()
	size = area.size.round()
	_unit = clampf(minf(size.x/320.0,size.y/250.0),0.45,1.0)
	_font_size = maxi(33,floori((88.0 if size.x>=350 else 77.0)*_unit/11.0)*11)
	_title_size = maxi(22,floori(44.0*_unit/11.0)*11)
	for digit in _digits: digit.label.add_theme_font_size_override("font_size",_font_size)
	_percent.add_theme_font_size_override("font_size",maxi(22,_font_size/2))
	_title.add_theme_font_size_override("font_size",_title_size)
	_title_shadow.add_theme_font_size_override("font_size",_title_size)
	_shine.add_theme_font_size_override("font_size",_title_size)
	_layout_number()
	_layout_title()

func _center() -> Vector2:
	return (size/2.0).round()

func _clock() -> float:
	return float(view.run.collection.age)*1000.0+_fade_elapsed*1000.0

func _actual_percent() -> int:
	return clampi(floori(float(view.run.recovered())*100.0/maxi(1,view.run.total())),0,100)

func _set_percent(value: int, now: float, force := false) -> void:
	value = clampi(value,_shown_percent,_actual_percent())
	if value==_shown_percent and not force: return
	_previous_text = _current_text
	_shown_percent = value
	_current_text = str(value).lpad(3," ")
	_flip_at = now-100.0 if force else now
	if force: _previous_text = _current_text
	_layout_number()

func _layout_number() -> void:
	var count := str(_shown_percent).length()
	var digit_width := roundf(float(_font_size)*0.72)
	var height := roundf(float(_font_size)*1.45)
	var percent_width := roundf(float(_font_size)*0.48)
	_number_group.size = Vector2(count*digit_width+percent_width+4,height)
	_number_group.pivot_offset = (_number_group.size/2.0).round()
	_number_group.position = (_center()+Vector2(0,18*_unit)-_number_group.size/2.0).round()
	for index in range(3):
		var digit: Dictionary = _digits[index]
		digit.frame.visible = index>=3-count
		digit.frame.position = Vector2((index-(3-count))*digit_width,0)
		digit.frame.size = Vector2(digit_width,height)
		digit.label.position = Vector2.ZERO
		digit.label.size = digit.frame.size
		digit.label.pivot_offset = (digit.label.size/2.0).round()
	_percent.position = Vector2(count*digit_width+2,roundf(height*0.18))
	_percent.size = Vector2(percent_width,roundf(height*0.82))

func _layout_title() -> void:
	_title_group.size = Vector2(minf(size.x-20,292),roundf(_title_size*1.6))
	_title_group.pivot_offset = (_title_group.size/2.0).round()
	_title.size = _title_group.size
	_title_shadow.size = _title_group.size
	_shine.size = _title_group.size

func _update_tier(now: float) -> void:
	var next_tier := 0
	for threshold in [70,80,90,100]:
		if _shown_percent>=threshold and int(view.run.collection_tier)>=threshold: next_tier = threshold
	if next_tier<=_tier: return
	var new_title := _tier==0 or next_tier==100
	_tier = next_tier
	_pulse_at = now
	if new_title: _title_at = now
	_title.text = L10n.text("PERFECT!" if _tier==100 else "CLEAR!")
	_title_shadow.text = _title.text
	_shine.text = _title.text
	_title_group.show()
	var color := CREAM if _tier==100 else GOLD
	for digit in _digits:
		digit.label.add_theme_color_override("font_color",color)
		digit.label.add_theme_color_override("font_outline_color",OLIVE)
	_percent.add_theme_color_override("font_color",color)

func _animate(now: float) -> void:
	var reduced: bool = view.vfx.reduced_motion
	var flip := clampf((now-_flip_at)/45.0,0.0,1.0)
	for index in range(3):
		var label: Label = _digits[index].label
		var changed := _previous_text[index]!=_current_text[index]
		label.text = _previous_text[index] if changed and flip<0.5 and not reduced else _current_text[index]
		# Synchronized glyph flips cannot form a higher intermediate combination of digits.
		label.scale.y = 0.5 if changed and flip>=0.25 and flip<0.75 and not reduced else 1.0
	var pulse := clampf((now-_pulse_at)/420.0,0.0,1.0)
	var beat := 0.125 if _tier==70 else 0.1875 if _tier==80 else 0.25 if _tier==90 else 0.3125
	_number_group.scale = Vector2.ONE*(1.0+beat*floorf(sin(pulse*PI)*4.0)/4.0) if not reduced else Vector2.ONE
	if _tier>=70:
		# Language can change in the pause menu without rebuilding this overlay.
		_title.text = L10n.text("PERFECT!" if _tier==100 else "CLEAR!")
		_title_shadow.text = _title.text
		_shine.text = _title.text
		var frame := clampi(floori((now-_title_at)/40.0),0,5)
		var scales := [0.75,0.875,1.125,1.25,1.125,1.0]
		var rise := [12,8,4,0,-2,0]
		_title_group.scale = Vector2.ONE*(scales[frame] if not reduced else 1.0)
		_title_group.position = (_center()+Vector2(0,-66*_unit+(rise[frame] if not reduced else 0))-_title_group.size/2.0).round()
		var shine_age := fmod(maxf(0.0,now-_title_at-240.0),1600.0)
		_shine_clip.visible = now>=_title_at+240.0 and shine_age<360.0 and not reduced
		var sweep := floorf((shine_age/360.0*(_title_group.size.x+24)-24)/6.0)*6.0
		_shine_clip.position = Vector2(sweep,0)
		_shine_clip.size = Vector2(24,_title_group.size.y)
		_shine.position = Vector2(-sweep,0)

func begin_fade(duration: float) -> void:
	if _fading: return
	_fading = true
	_fade_duration = maxf(0.001,duration)
	_fade_elapsed = 0.0
	_counter_value = _actual_percent()
	_set_percent(_actual_percent(),_clock(),true)
	_update_tier(_clock())
	_animate(_clock())
	visible = true
	queue_redraw()

func fade_complete() -> bool:
	return _fading and _fade_elapsed>=_fade_duration

func _process(dt: float) -> void:
	if view==null or view.run==null: return
	_fade.position = Vector2.ZERO
	_fade.size = get_viewport_rect().size
	if view.run.paused:
		_fade.hide()
		return
	visible = _fading or (view.run.phase=="finishing" and view.run.collection_started())
	if not visible: return
	if _fading:
		_fade_elapsed = minf(_fade_duration,_fade_elapsed+maxf(0.0,dt))
		var progress := clampf((_fade_elapsed/_fade_duration-0.16)/0.84,0.0,1.0)
		_fade.color.a = floorf(progress*16.0)/16.0
		_fade.show()
	var now := _clock()
	var elapsed := maxf(0.0,(now-_last_clock)/1000.0) if _last_clock>=0 else 0.0
	_last_clock = now
	if not _fading:
		var actual := _actual_percent()
		_counter_value = minf(actual,_counter_value+(actual-_counter_value)*(1.0-exp(-12.0*elapsed))+14.0*elapsed)
		if now-_last_count_tick>=45.0:
			_last_count_tick = now
			_set_percent(floori(_counter_value),now)
	_update_tier(now)
	_animate(now)
	queue_redraw()

func _pixel_rect(at: Vector2, extent: Vector2, ink: Color) -> void:
	draw_rect(Rect2(at.round(),Vector2(maxf(1,roundf(extent.x)),maxf(1,roundf(extent.y)))),ink)

func _cross(at: Vector2, unit: float, ink: Color) -> void:
	_pixel_rect(at-Vector2(unit*2,unit/2),Vector2(unit*4,unit),ink)
	_pixel_rect(at-Vector2(unit/2,unit*2),Vector2(unit,unit*4),ink)
	_pixel_rect(at-Vector2.ONE*unit/2,Vector2.ONE*unit,CREAM)

func _corner(at: Vector2, side_x: int, side_y: int, length: float, ink: Color) -> void:
	for shadow in [true,false]:
		var point := at+Vector2(3,4) if shadow else at
		var color := OLIVE if shadow else ink
		_pixel_rect(point+Vector2(5 if side_x<0 else -length,0),Vector2(length-5,3),color)
		_pixel_rect(point+Vector2(0,5 if side_y<0 else -length),Vector2(3,length-5),color)
		_pixel_rect(point+Vector2(2 if side_x<0 else -2,2 if side_y<0 else -2),Vector2(3,3),color)

func _draw() -> void:
	if not visible or view==null or view.run==null: return
	var center := _center()
	var now := _clock()
	var reduced: bool = view.vfx.reduced_motion
	var pulse := clampf((now-_pulse_at)/620.0,0.0,1.0)
	var ink: Color = TIER_INKS[clampi((_tier-70)/10,0,3)] if _tier>=70 else CREAM
	var half_width := minf(size.x/2.0-28,138*_unit)
	var half_height := 103.0*_unit
	if _tier>=70:
		var length := 14.0+maxi(0,_tier-70)/5.0
		for x in [-1,1]:
			for y in [-1,1]:
				var corner := center+Vector2(x*half_width,y*half_height)
				_corner(corner,x,y,length,ink)
		if not reduced and pulse<1.0:
			var count := 8+maxi(0,(_tier-70)/10)*2+int(_tier==100)*2
			var travel := floorf(pulse*12.0)/12.0
			for index in range(count):
				var direction: Vector2 = SPARK_DIRECTIONS[index].normalized()
				var point := center+Vector2(direction.x*(half_width*0.6+travel*42),direction.y*(half_height*0.65+travel*44))
				var unit := 2.0 if pulse>0.55 else 3.0
				_cross(point,unit,Color(ink,0.5 if pulse>0.7 else 1.0))
			if _tier>=80 and int(pulse*9.0)%3!=2:
				for side in [-1,1]:
					for step in range(3):
						_pixel_rect(center+Vector2(side*(half_width-4+step*4),-22+step*12),Vector2(3,7+step*2),ink)
	# A stepped underline frames the counter without a panel covering incoming pixels.
	var underline := center+Vector2(-56*_unit,84*_unit)
	_pixel_rect(underline,Vector2(112*_unit,3),OLIVE)
	_pixel_rect(underline+Vector2(4,-2),Vector2(104*_unit,2),ink)
