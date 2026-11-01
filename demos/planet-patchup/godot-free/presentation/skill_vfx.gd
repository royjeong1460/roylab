extends Node2D

# Legacy sheets mirror src/arch/vfx; expansion sheets use the approved 2026-10-29 preview.
const SPECS := {
	"blast":[64,64,10,20],"impact":[32,32,6,24],"smoke":[64,64,10,12],
	"blackhole-open":[64,64,6,18],"blackhole-loop":[64,64,8,12],"blackhole-close":[64,64,6,18],
	"spark":[32,32,5,24],"relay-mark":[32,32,4,8],"shockwave":[96,48,8,20],
	"collect":[16,16,5,20],"satellite-normal":[48,48,1,1],"satellite-heavy":[64,64,1,1],
	"satellite-wreck":[48,48,1,1],"satellite-trail":[24,64,6,20],
}
var world: Node
var catalog: RefCounted
var images := {}
var events: Array = []
var wells := {}
var clock := 0.0
var last_impact := -INF
var collection_aim := Vector2(INF,INF)
var reduced_motion := false
var active := true

func setup(source_world: Node, source_catalog: RefCounted) -> void:
	world=source_world
	catalog=source_catalog
	z_index=40
	texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
	for key in SPECS:
		images[key]=catalog.texture("vfx-"+key)

func clear() -> void:
	events.clear()
	wells.clear()
	queue_redraw()

func _push(source: Dictionary, sheet: String, life: float, decorative := false) -> void:
	if events.size()>=80:
		var index := -1
		for i in range(events.size()):
			if events[i].decorative:
				index=i
				break
		if index<0 and decorative:
			return
		events.remove_at(maxi(0,index))
	var item := source.duplicate()
	item.merge({"sheet":sheet,"life":life,"age":0.0,"decorative":decorative},true)
	events.append(item)

func process_events(source_events: Array) -> void:
	for source in source_events:
		var event: Dictionary = source.duplicate()
		if not event.has("x") or not event.has("y"):
			if event.has("p") and event.p is Vector2:
				event.x=event.p.x
				event.y=event.p.y
			elif event.has("id") and world != null:
				var p: Vector2=world.original_point(int(event.id))
				event.x=p.x
				event.y=p.y
			elif event.get("samples",[]) is Array and not event.get("samples",[]).is_empty():
				event.x=event.samples[0].get("x",0)
				event.y=event.samples[0].get("y",0)
			else:
				continue
		if not is_finite(float(event.x)) or not is_finite(float(event.y)):
			continue
		var kind: String=event.get("kind","")
		if kind=="tool-blast" or kind=="blast":
			if event.get("phase","")=="fuse":
				if float(event.get("delay",0.35)) > 0:
					_push(event,"fuse",float(event.get("delay",0.35)))
				continue
			var follow: bool=event.get("vfx","") in ["aftershock","relay"] or event.get("secondary",false)
			_push(event,"blast",0.3 if follow else 0.5)
			_push(event,"shockwave",0.24 if follow else 0.4,true)
			_push(event,"smoke",0.4 if follow else 0.75,true)
		elif kind=="collect":
			_push(event,"collect",0.3,true)
		elif kind=="chain-impact":
			_push(event,"chain",0.65)
		elif kind in ["impact","fracture","fall-fracture","speed-fracture"]:
			if clock-last_impact<0.075 or not (float(event.get("speed",0))>=2 or float(event.get("damage",0))>=1 or int(event.get("count",0))>=3):
				continue
			last_impact=clock
			_push(event,"spark",0.21,true)
	queue_redraw()

func _process(dt: float) -> void:
	if not active or world==null or world.paused or not is_visible_in_tree():
		return
	clock+=maxf(0,dt)
	for event in events:
		event.age+=maxf(0,dt)
	events=events.filter(func(event):return event.age<event.life)
	_update_wells(dt)
	queue_redraw()

func _point(item: Dictionary) -> Vector2:
	return item.p if item.get("p") is Vector2 else Vector2(float(item.get("x",0)),float(item.get("y",0)))

func _update_wells(dt: float) -> void:
	var seen := {}
	var current: Array=world.wells
	for source in current.slice(0,16):
		var p:=_point(source)
		var key: String=str(source.get("id","%s:%s:%s" % [p.x,p.y,source.get("duration",0)]))
		seen[key]=true
		var age:=maxf(0,float(source.get("duration",0))-float(source.get("remaining",0)))
		var well: Dictionary=source.duplicate()
		well.merge({"p":p,"age":age,"phase":"blackhole-open" if age<0.333 else "blackhole-loop"},true)
		wells[key]=well
	for key in wells.keys():
		if seen.has(key):
			continue
		var well: Dictionary=wells[key]
		if well.phase!="blackhole-close":
			well.phase="blackhole-close"
			well.age=0.0
		else:
			well.age+=dt
		if well.age>=0.333:
			wells.erase(key)

func _sprite(key: String, point: Vector2, width: float, age := 0.0, alpha := 1.0, angle := 0.0, height := -1.0, loop := false, mirror := false, frame_index := -1) -> void:
	var texture: Texture2D=images.get(key)
	if texture==null or not SPECS.has(key):
		return
	var spec: Array=SPECS[key]
	var frame:=frame_index if frame_index>=0 else int(floor(age*float(spec[3])))
	frame=mini(2,int(spec[2])-1) if reduced_motion else frame%int(spec[2]) if loop else clampi(frame,0,int(spec[2])-1)
	var h:=width*float(spec[1])/float(spec[0]) if height<0 else height
	draw_set_transform(point*4,angle,Vector2(-4 if mirror else 4,4))
	draw_texture_rect_region(texture,Rect2(-width/2,-h/2,width,h),Rect2(frame*int(spec[0]),0,int(spec[0]),int(spec[1])),Color(1,1,1,alpha))
	draw_set_transform(Vector2.ZERO,0,Vector2(4,4))

func _ring(point: Vector2, radius: float, color: String, alpha: float) -> void:
	var ink:=Color(color)
	ink.a=alpha
	draw_arc(point,maxf(0,radius),0,TAU,64,ink,0.25)

func _collect(event: Dictionary) -> void:
	var t:=minf(1,float(event.age)/0.3)
	var samples: Array=event.get("samples",[event])
	var rise: bool=event.get("mode","")=="rise" or event.get("source","")=="auto"
	if not rise:
		samples=[event]
	for sample in samples.slice(0,8):
		var source:=_point(sample)
		var target:=source-Vector2(0,9) if rise else collection_aim if collection_aim.is_finite() else source
		var p:=source if reduced_motion else source.lerp(target,t if rise else t*t)
		var ink: Color = world.collectible_color() if world != null else Color("a8dfc4")
		ink.a=1-t
		draw_rect(Rect2(p-Vector2(0.5,0.5),Vector2.ONE),ink)
		if t>0.75:
			_sprite("collect",source if reduced_motion else target,2,minf(0.2,(t-0.75)*0.8),0.45*(1-t))

func _relay_marks() -> void:
	if world.skill_physics==null:
		return
	for mark in world.skill_physics.marks:
		if mark.get("used",false) or float(mark.get("remaining",0))<=0:
			continue
		var ids: Dictionary=mark.get("ids",{})
		for piece in world.pieces:
			if not is_instance_valid(piece):
				continue
			var owns_id:=false
			for id in piece.ids:
				if ids.has(id):
					owns_id=true
					break
			if owns_id:
				_sprite("relay-mark",piece.position/4,5,clock,1,piece.rotation,-1,true)

func _orbital() -> void:
	if world.skill_physics==null:
		return
	var current: Dictionary=world.skill_physics.active
	if current.is_empty() or current.get("id","orbital")!="orbital":
		return
	var targets: Array=current.get("targets",[])
	var next:=int(current.get("next",0))
	for target in targets.slice(next,next+2):
		var p:=Vector2(float(target.get("x",0)) if target is Dictionary else float(target),4)
		_ring(p,1,"d3b579",0.65)
		draw_rect(Rect2(p+Vector2(-0.125,1.5),Vector2(0.25,1.25)),Color("d3b579"))
	for projectile in current.get("projectiles",[]):
		var p:=_point(projectile)
		var heavy: bool=projectile.get("heavy",false)
		var width:=12.0 if heavy else 9.0
		if not reduced_motion:
			_sprite("satellite-trail",p-Vector2(0,width*0.65),width*0.42,clock,0.6,0,width*0.95,true)
		_sprite("satellite-heavy" if heavy else "satellite-normal",p,width,0,1,0 if reduced_motion else clampf(float(projectile.get("vy",0))*0.001,-0.12,0.12))





func _draw() -> void:
	if world==null:
		return
	draw_set_transform(Vector2.ZERO,0,Vector2(4,4))
	for event in events:
		var point:=_point(event)
		var progress: float=event.age/event.life
		var alpha:=1-progress
		var radius:=float(event.get("radius",4))
		if event.sheet=="collect":
			_collect(event)
			continue
		if reduced_motion and event.decorative:
			continue
		match event.sheet:
			"fuse":
				_ring(point,radius,"c5aa73",0.5)
				draw_rect(Rect2(point-Vector2(0.5,0.5),Vector2.ONE),Color("f6d196"))
			"chain":
				_sprite("spark",point,2,event.age)
			"blast":
				_ring(point,radius,"d3b579",alpha*0.5)
				_sprite("impact" if event.get("vfx","")=="orbital" else "blast",point,radius*2*0.9,event.age,alpha)
			"shockwave":
				_sprite("shockwave",point,radius*2,event.age,0.5*alpha)
			"smoke":
				_sprite("smoke",point-Vector2(0,progress*1.5),radius,event.age,0.32*alpha)
			_:
				_sprite("spark",point,clampf(3,1.75,4.5),event.age,alpha)
	for well in wells.values():
		var alpha:=maxf(0,1-float(well.age)/0.333) if well.phase=="blackhole-close" else 1.0
		var p:=_point(well)
		var radius:=float(well.get("radius",4))
		_ring(p,radius,"a59caf",alpha*0.24)
		_sprite(well.phase,p,maxf(3,radius*0.9),well.age,alpha,0,-1,well.phase=="blackhole-loop")
	_relay_marks()
	_orbital()
