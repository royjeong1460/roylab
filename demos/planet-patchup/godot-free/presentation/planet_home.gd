extends Control

signal region_selected(index: int)

const ART := [1, 0, 2, 3, 4, 5]
const LOCATIONS := [Vector2(-38,155),Vector2(18,125),Vector2(8,-100),Vector2(32,-25),Vector2(-25,30),Vector2(46,55)]
const SPHERE_SHADER = preload("res://presentation/planet_sphere.gdshader")
var selected_region := 0
var catalog: RefCounted
var restoration: Array[float] = [0.0,0.0,0.0,0.0,0.0,0.0]
var available: Array[bool] = [true,false,false,false,false,false]
var cleared: Array[bool] = [false,false,false,false,false,false]
var complete: Array[bool] = [false,false,false,false,false,false]
var images := {}
var yaw := deg_to_rad(125.0)
var pitch := deg_to_rad(18.0)
var orbit_seconds := 0.0
var _sphere: ColorRect
var _overlay: Control
var _shader: ShaderMaterial
var _rotation: Tween
var _press := Vector2.ZERO
var _last := Vector2.ZERO
var _dragged := false
var _pointer := -2

class Overlay extends Control:
	var home: Control
	func _draw() -> void:
		home.draw_overlay(self)

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	clip_contents = true
	mouse_filter = Control.MOUSE_FILTER_PASS
	_shader = ShaderMaterial.new()
	_shader.shader = SPHERE_SHADER
	_sphere = ColorRect.new()
	_sphere.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_sphere.material = _shader
	add_child(_sphere)
	_overlay = Overlay.new()
	_overlay.home = self
	_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_overlay)
	resized.connect(_layout)
	_layout()
	_apply_material()

func setup(source_catalog: RefCounted) -> void:
	catalog = source_catalog
	for key in ["sky","worldmap","rubble","rust-moon","slate-moon","vfx-satellite-normal","vfx-satellite-heavy","vfx-satellite-wreck"]:
		images[key] = catalog.texture(key)
	for i in range(6):
		images["landmark-%d" % (i+1)] = catalog.texture("landmark-%d" % (i+1))
	_prepare_landmark_variants()
	if is_node_ready():
		_apply_material()
	queue_redraw()

func _prepare_landmark_variants() -> void:
	# CSS brightness/saturate from paid progress-ui.js, cached without editing the artwork.
	for i in range(6):
		var key := "landmark-%d" % (i+1)
		var texture: Texture2D = images.get(key)
		if texture == null:
			continue
		for state in ["cleared","complete"]:
			var image := texture.get_image()
			if image.is_compressed():
				image.decompress()
			var brightness := 1.32 if state == "complete" else 1.13
			var saturation := 1.12 if state == "complete" else 1.05
			for y in range(image.get_height()):
				for x in range(image.get_width()):
					var pixel := image.get_pixel(x,y)
					var rgb := Vector3(minf(1,pixel.r*brightness),minf(1,pixel.g*brightness),minf(1,pixel.b*brightness))
					var luma := rgb.dot(Vector3(0.213,0.715,0.072))
					rgb = Vector3(luma,luma,luma).lerp(rgb,saturation)
					image.set_pixel(x,y,Color(clampf(rgb.x,0,1),clampf(rgb.y,0,1),clampf(rgb.z,0,1),pixel.a))
			images[key+"-"+state] = ImageTexture.create_from_image(image)

func _composition_scale() -> float:
	var top := 172.0 if size.y < 760 else 188.0
	return maxf(0.01, minf(size.x / 390.0, (size.y - 261.0 - top) / 384.0))

func _origin() -> Vector2:
	var top := 172.0 if size.y < 760 else 188.0
	var center := Vector2(size.x / 2.0, (top + size.y - 261.0) / 2.0)
	return center - Vector2(194,411) * _composition_scale()

func _layout() -> void:
	if _sphere == null:
		return
	var s := _composition_scale()
	_sphere.position = _origin() + Vector2(3,220)*s
	_sphere.size = Vector2(384,384)*s
	_overlay.size = size
	queue_redraw()
	_overlay.queue_redraw()

func _apply_material() -> void:
	if _shader == null:
		return
	_shader.set_shader_parameter("worldmap", images.get("worldmap"))
	_shader.set_shader_parameter("yaw", yaw)
	_shader.set_shader_parameter("pitch", pitch)
	_shader.set_shader_parameter("restoration_a", Vector4(restoration[0],restoration[1],restoration[2],restoration[3]))
	_shader.set_shader_parameter("restoration_b", Vector2(restoration[4],restoration[5]))
	_overlay.queue_redraw()

func update_profile(profile: Dictionary, progression) -> void:
	if catalog == null:
		return
	for i in range(6):
		var progress: Dictionary = progression.region_progress(profile, i)
		available[i] = progression.region_open(profile, i)
		cleared[i] = progress.cleared
		complete[i] = progress.complete
		restoration[i] = float(progress.restoration)
	_apply_material()

func set_selected(index: int) -> void:
	selected_region = posmod(index,6)
	var anchor: Vector2 = LOCATIONS[ART[selected_region]]
	var target_yaw := deg_to_rad(anchor.y)
	while target_yaw-yaw > PI:
		target_yaw -= TAU
	while target_yaw-yaw < -PI:
		target_yaw += TAU
	var target_pitch := deg_to_rad(anchor.x)
	var duration := maxf(0.5,maxf(rad_to_deg(Vector2(target_yaw-yaw,target_pitch-pitch).length())/110.0*1.875,absf(rad_to_deg(target_pitch-pitch))/40.0*1.875))
	if _rotation != null:
		_rotation.kill()
	if is_inside_tree():
		_rotation = create_tween().set_parallel(true).set_trans(Tween.TRANS_QUINT).set_ease(Tween.EASE_IN_OUT)
		_rotation.tween_property(self,"yaw",target_yaw,duration)
		_rotation.tween_property(self,"pitch",target_pitch,duration)
	else:
		yaw = target_yaw
		pitch = target_pitch
	_apply_material()

func _process(dt: float) -> void:
	if not is_visible_in_tree():
		return
	orbit_seconds += minf(dt,0.1)
	_apply_material()

func _view(vector: Vector3) -> Vector3:
	var xx := vector.x*cos(yaw)-vector.z*sin(yaw)
	var zz := vector.x*sin(yaw)+vector.z*cos(yaw)
	return Vector3(xx,vector.y*cos(pitch)-zz*sin(pitch),vector.y*sin(pitch)+zz*cos(pitch))

func _anchor(index: int) -> Vector3:
	var location: Vector2 = LOCATIONS[ART[index]]
	var lat := deg_to_rad(location.x)
	var lon := deg_to_rad(location.y)
	return Vector3(sin(lon)*cos(lat),sin(lat),cos(lon)*cos(lat))

func _image(canvas: CanvasItem, key: String, rect: Rect2, alpha := 1.0) -> void:
	var texture: Texture2D = images.get(key)
	if texture != null:
		canvas.draw_texture_rect(texture,rect,false,Color(1,1,1,alpha))

func _rubble(canvas: CanvasItem, rect: Rect2, alpha: float) -> void:
	var texture: Texture2D = images.get("rubble")
	if texture == null:
		return
	var circle := PackedVector2Array()
	for i in range(96):
		circle.append(Vector2(194,411)+Vector2.from_angle(i*TAU/96)*170)
	var corners := PackedVector2Array([rect.position,rect.position+Vector2(rect.size.x,0),rect.end,rect.position+Vector2(0,rect.size.y)])
	for polygon in Geometry2D.intersect_polygons(corners,circle):
		var uvs := PackedVector2Array()
		for point in polygon:
			uvs.append((point-rect.position)/rect.size)
		canvas.draw_polygon(polygon,PackedColorArray([Color(1,1,1,alpha)]),uvs,texture)

func _landmark(canvas: CanvasItem, index: int, rect: Rect2, alpha: float) -> void:
	var state := "complete" if complete[index] else "cleared" if cleared[index] else "working"
	var key := "landmark-%d" % (index+1)
	_image(canvas,key+("-"+state if state!="working" else ""),rect,alpha)
	if state=="working":
		return
	var s := maxf(2,roundf(rect.size.x/44)*2)
	var x := rect.position.x
	var y := rect.position.y
	var w := rect.size.x
	var cx := roundf(x+w/2)
	var bottom := y+w
	var plaza := Color("f5ce73") if complete[index] else Color("98c6b2")
	plaza.a=alpha
	canvas.draw_rect(Rect2(x+6,bottom-4,w-12,4),plaza)
	canvas.draw_rect(Rect2(cx+5*s,y+2*s,s,9*s),Color(0.153,0.231,0.235,alpha))
	var flag := Color("ffe49e") if complete[index] else Color("a2d1bb")
	flag.a=alpha
	canvas.draw_rect(Rect2(cx+6*s,y+2*s,5*s,3*s),flag)
	if complete[index]:
		canvas.draw_rect(Rect2(cx-4*s,y-2*s,8*s,2*s),flag)
		for offset in [-4,-1,2]:
			canvas.draw_rect(Rect2(cx+offset*s,y-4*s,2*s,3*s),flag)
		for point in [Vector2(-6,10),Vector2(w+4,18),Vector2(-2,w-10)]:
			canvas.draw_rect(Rect2(Vector2(x,y)+point,Vector2(s,3*s)),flag)
			canvas.draw_rect(Rect2(Vector2(x,y)+point+Vector2(-s,s),Vector2(3*s,s)),flag)

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,size),Color("192b32"))
	var cover := maxf(size.x / 390.0, size.y / 844.0)
	var sky_size := Vector2(390,844) * cover
	_image(self,"sky",Rect2((size-sky_size)/2.0,sky_size),0.78)
	var s := _composition_scale()
	var origin := _origin()
	draw_set_transform(origin,0,Vector2(s,s))
	_image(self,"rust-moon",Rect2(4,254,84,84),0.7)
	_image(self,"slate-moon",Rect2(332,211,42,42),0.42)
	draw_set_transform(Vector2.ZERO)

func draw_overlay(canvas: CanvasItem) -> void:
	var s := _composition_scale()
	canvas.draw_set_transform(_origin(),0,Vector2(s,s))
	var sites: Array = []
	for i in range(6):
		sites.append({"i":i,"p":_view(_anchor(i))})
	sites.sort_custom(func(a,b): return a.p.z < b.p.z)
	for site in sites:
		var p: Vector3 = site.p
		if p.z <= 0.18:
			continue
		var i: int = site.i
		var depth := minf(1.0,(p.z-0.18)/0.4)
		var k := 0.48+0.52*p.z
		var w := roundf(44*k)*2
		var center := Vector2(3,220)+Vector2(roundf(95.5+p.x*85),roundf(95.5-p.y*85))*2
		if restoration[i] < 1.0:
			for debris in [Vector3(-23,9,14),Vector3(22,11,12),Vector3(-18,-11,9)]:
				var n := roundf(debris.z*k)*2
				var pos := center+Vector2(debris.x*k*2-n/2,debris.y*k*2-n*0.65)
				_rubble(canvas,Rect2(pos,Vector2(n,n)),depth*(1-restoration[i]))
		_landmark(canvas,i,Rect2(center-Vector2(w/2,w-6),Vector2(w,w)),depth)
		var pin_color := Color("ffda8d") if i == selected_region and available[i] else Color("b7b3a6")
		canvas.draw_circle(center,8 if i == selected_region else 5,Color("1f2b31"))
		canvas.draw_circle(center,5 if i == selected_region else 3,pin_color)
	var satellites := ["normal","normal","wreck","heavy","wreck"]
	var widths := [32.0,30.0,30.0,34.0,28.0]
	for i in range(5):
		var theta := 0.7+i*TAU/5+orbit_seconds*TAU/120
		var depth := sin(theta)
		var alpha := clampf((depth-0.42)/0.22,0,1)*0.82
		if alpha <= 0:
			continue
		var point := Vector2(194+194*cos(theta),411+190*depth)
		var w: float = widths[i]*(0.72+0.28*maxf(0,depth))
		canvas.draw_set_transform(_origin()+point*s,theta-PI/2,Vector2(s,s))
		_image(canvas,"vfx-satellite-"+satellites[i],Rect2(-w/2,-w/2,w,w),alpha)
	canvas.draw_set_transform(Vector2.ZERO)

func _gui_input(event: InputEvent) -> void:
	# Native GUI buttons use mouse emulation; this recognizer already handles touch directly.
	if (event is InputEventMouseButton or event is InputEventMouseMotion) and event.device == -1:
		return
	var position_local := Vector2.ZERO
	var start := false
	var end := false
	var move := false
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		position_local = event.position
		start = event.pressed
		end = not event.pressed
	elif event is InputEventScreenTouch:
		if _pointer >= 0 and event.index != _pointer:
			_pointer = -2
			return
		position_local = event.position
		start = event.pressed
		end = not event.pressed
		if start:
			_pointer = event.index
	elif event is InputEventMouseMotion and _pointer == -1:
		position_local = event.position
		move = true
	elif event is InputEventScreenDrag and event.index == _pointer:
		position_local = event.position
		move = true
	else:
		return
	var s := _composition_scale()
	if s <= 0:
		return
	var point := (position_local-_origin())/s
	if start:
		if not Rect2(3,220,384,384).has_point(point):
			_pointer = -2
			return
		if event is InputEventMouseButton:
			_pointer = -1
		_press = point
		_last = point
		_dragged = false
	elif move and _pointer != -2:
		if point.distance_to(_press)>12:
			_dragged = true
			if _rotation != null:
				_rotation.kill()
		if _dragged:
			var delta := point-_last
			yaw -= delta.x/170.0
			pitch = clampf(pitch+delta.y/170.0,-PI/2,PI/2)
			_apply_material()
		_last = point
	elif end and _pointer != -2:
		_pointer = -2
		var nearest := -1
		var distance := INF
		for i in range(6):
			var p := _view(_anchor(i))
			if p.z <= 0.18:
				continue
			var d := point.distance_to(Vector2(194+p.x*170,411-p.y*170)) if not _dragged else 1.0-p.z
			if d<distance:
				distance=d
				nearest=i
		if nearest>=0 and (_dragged or distance<=44):
			set_selected(nearest)
			region_selected.emit(nearest)
