extends Node2D

const World = preload("res://world.gd")
const GameSkin = preload("res://app/skin.gd")
const Camera = preload("res://app/play_camera.gd")
const PlayInput = preload("res://app/play_input.gd")
const ArchBackdrop = preload("res://background.gd")
const CultureBackdrop = preload("res://presentation/culture_backdrop.gd")
const SkillVfx = preload("res://presentation/skill_vfx.gd")
const ChainFeedback = preload("res://app/chain_feedback.gd")
const CollectionOverlay = preload("res://presentation/collection_overlay.gd")
var app: Node
var catalog
var journey
var world
var run
var camera
var controls
var vfx
var chain_feedback
var collection_overlay
var _collection_camera_started := false
var tool := "blast"
var play_area := Rect2()
var site: Dictionary = {}
var profile: Dictionary = {}
var mode := "stage"
var sky_color := Color("aca696")
var ground_color := Color("776653")
var recent_events: Array = []
var _checkpointed := false
var _checkpoint_retry_at := 0.0
var _finish_queued := false
var _result_fade_started := false
var _minimap: ImageTexture
var _minimap_age := 1.0
var _minimap_rect := Rect2()

func setup(owner_app: Node, source_catalog, source_journey, source_site: Dictionary, source_profile: Dictionary, run_mode: String) -> void:
	app = owner_app
	catalog = source_catalog
	journey = source_journey
	site = source_site
	profile = source_profile
	mode = run_mode
	process_mode = Node.PROCESS_MODE_PAUSABLE

func _ready() -> void:
	# Every physical ancestor stays at identity; camera fitting is independent.
	world = World.new()
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	world.configure_site(site, journey.stats(), {"passive": profile.equipped.passive, "active": profile.equipped.active, "skills": profile.skills, "owned": profile.owned})
	add_child(world)
	journey.attach_world(world)
	run = journey.current_run
	var region := int(site.get("region", 0))
	if region <= 0:
		var backdrop := ArchBackdrop.new()
		backdrop.width = world.width * 4.0
		backdrop.height = world.height * 4.0
		backdrop.floor_y = world.floor_y * 4.0
		backdrop.z_index = -100
		var previous: Dictionary = profile.stageRecords.get(site.id, {})
		backdrop.restoration = float(previous.get("recovered", 0)) / maxf(1, float(previous.get("total", 1)))
		add_child(backdrop)
		var style: Dictionary = backdrop.environment_style()
		sky_color = style.sky
		ground_color = style.ground
	else:
		var backdrop := CultureBackdrop.new()
		add_child(backdrop)
		var previous: Dictionary = profile.stageRecords.get(site.id, {})
		var restoration := float(previous.get("recovered", 0))/maxf(1,float(previous.get("total", 1)))
		backdrop.setup(world, region, restoration)
		var style := backdrop.environment_style()
		sky_color = style.sky
		ground_color = style.ground
	camera = Camera.new()
	add_child(camera)
	camera.make_current()
	camera.setup(world, play_area)
	controls = PlayInput.new()
	add_child(controls)
	controls.setup(self)
	vfx = SkillVfx.new()
	add_child(vfx)
	vfx.setup(world, catalog)
	var chain_layer := CanvasLayer.new()
	chain_layer.layer = 0
	add_child(chain_layer)
	chain_feedback = ChainFeedback.new()
	chain_layer.add_child(chain_feedback)
	chain_feedback.setup(self)
	chain_feedback.set_area(play_area)
	collection_overlay = CollectionOverlay.new()
	chain_layer.add_child(collection_overlay)
	collection_overlay.setup(self)
	collection_overlay.set_area(play_area)
	app.feedback.sync_campaign(run)
	queue_redraw()

func set_area(area: Rect2) -> void:
	play_area = area
	if camera != null:
		camera.set_area(area)
	if chain_feedback != null:
		chain_feedback.set_area(area)
	if collection_overlay != null:
		collection_overlay.set_area(area)

func attack(point: Vector2) -> bool:
	if run == null:
		return false
	var accepted: bool = run.press(point, tool)
	if not accepted:
		app.feedback.play_effect("ui-unavailable")
	return accepted

func select_tool(id: String) -> void:
	if run == null or run.paused or run.finish_ready or run.phase != "working" or id == tool:
		return
	if id not in ["blast", "blackhole"] or (id == "blackhole" and not profile.owned.has("blackhole")):
		return
	tool = id
	controls.cancel()

func activate_skill(id: String = "") -> void:
	controls.cancel()
	if run != null and not run.activate_skill(id):
		app.feedback.play_effect("ui-unavailable")

func toggle_fit() -> void:
	if camera != null and run!=null and run.phase=="working":
		camera.toggle_fit()
		controls.cancel()

func _physics_process(dt: float) -> void:
	if run == null or run.paused or _result_fade_started or not is_instance_valid(world):
		return
	world.perf.begin(world.perf.OTHER)
	run.collection_center = camera.to_map(play_area.get_center())
	run.update(dt, controls.aim, controls.previous, false)
	controls.previous = controls.aim
	if run.phase=="finishing":
		if not _collection_camera_started:
			_collection_camera_started = true
			controls.cancel()
			camera.begin_collection()
	world.perf.begin(world.perf.EFFECTS)
	var events: Array = world.events.duplicate()
	world.events.clear()
	recent_events.append_array(events)
	if recent_events.size() > 120:
		recent_events = recent_events.slice(recent_events.size() - 120)
	vfx.collection_aim = run.collection_center if run.phase=="finishing" else controls.aim
	vfx.active = not run.paused
	# Final recovery moves the real grains; do not draw a second decorative copy.
	vfx.process_events(events.filter(func(event): return event.get("kind","")!="collect"))
	chain_feedback.visible = run.phase=="working"
	if chain_feedback.visible: chain_feedback.process_events(events)
	app.feedback.sync_campaign(run)
	app.feedback.set_well_count(world.wells.size())
	app.feedback.process_events(events, dt, world.collected.size(), true)
	app.haptics.setup(app.feedback.settings)
	app.haptics.process_events(events, dt, world.collected.size(), true, run.ratio())
	world.perf.end()
	if run.qualified() and not _checkpointed and mode != "tutorial" and world.elapsed >= _checkpoint_retry_at:
		var saved: Dictionary = journey.checkpoint_stage()
		if saved.ok:
			_checkpointed = true
		else:
			_checkpoint_retry_at = world.elapsed + 10.0
			app.show_notice("Could not save the 70% checkpoint. Your current run is still available.")
	if run.finish_ready and not _result_fade_started:
		_result_fade_started = true
		controls.cancel()
		collection_overlay.begin_fade(0.5)
	_minimap_age += dt
	queue_redraw()
	world.perf.end()

func _process(dt: float) -> void:
	if is_instance_valid(world):
		if run != null and not run.paused and not _result_fade_started:
			world.perf.frame(world)
		else:
			world.perf.suspend()
	if run != null and not run.paused and _result_fade_started:
		if collection_overlay.fade_complete() and not _finish_queued:
			_finish_queued = true
			app.call_deferred("finish_run")
		return
	if run != null and not run.paused and not run.finish_ready:
		journey.journal.frame(dt * 1000.0, world.last_cpu_us / 1000.0)

func _draw() -> void:
	if world == null or controls == null or run == null or run.paused:
		return
	if run.phase=="working" and run.guide != null and run.guide.stage=="aim":
		var point: Vector2 = run.guide.target
		draw_arc(point * 4.0, 3.5 * 4, 0, TAU, 24, Color("ffe49e"), 2)

func minimap_texture() -> Texture2D:
	if world == null or camera == null:
		return null
	world.perf.begin(world.perf.MINIMAP)
	var result: Texture2D = _minimap_texture_unprofiled()
	world.perf.end()
	return result

func _minimap_texture_unprofiled() -> Texture2D:
	if world == null or camera == null:
		return null
	var visible: Rect2 = camera.visible_map_rect()
	if _minimap != null and _minimap_age < 0.4 and visible == _minimap_rect:
		return _minimap
	_minimap_age = 0.0
	_minimap_rect = visible
	var size := Vector2i(144, 100)
	var image := Image.create(size.x, size.y, false, Image.FORMAT_RGBA8)
	image.fill(Color.TRANSPARENT if GameSkin.bright() else Color("dae4cb"))
	var map_size := Vector2(world.width, world.height)
	var scale := minf(float(size.x) / map_size.x, float(size.y) / map_size.y)
	var origin := (Vector2(size) - map_size * scale) / 2.0
	var map_bottom := mini(size.y, ceili(origin.y + map_size.y * scale))
	for x in range(maxi(0, ceili(origin.x)), mini(size.x, ceili(origin.x + map_size.x * scale))):
		var ground := clampi(floori(origin.y + world.ground_y((x - origin.x) / scale) * scale), 0, size.y)
		for y in range(ground, map_bottom):
			image.set_pixel(x, y, ground_color if GameSkin.bright() else Color("71886b"))
	for id in world.static_ids():
		_mini_pixel(image, world.original_point(id), world.pixel_color(id), scale, origin)
	for piece in world.pieces:
		for id in piece.ids:
			_mini_pixel(image, piece.pixel_position(id), world.pixel_color(id), scale, origin)
	for grain in world.grains:
		_mini_pixel(image, grain.p, world.collectible_color(), scale, origin)
	var from := origin + visible.position * scale
	var to := origin + visible.end * scale
	var left := clampi(floori(from.x), 0, size.x - 1)
	var right := clampi(ceili(to.x), 0, size.x - 1)
	var top := clampi(floori(from.y), 0, size.y - 1)
	var bottom := clampi(ceili(to.y), 0, size.y - 1)
	var camera_ink := Color("fff4da") if GameSkin.bright() else Color("ed7c40")
	for x in range(left, right + 1):
		image.set_pixel(x, top, camera_ink)
		image.set_pixel(x, bottom, camera_ink)
	for y in range(top, bottom + 1):
		image.set_pixel(left, y, camera_ink)
		image.set_pixel(right, y, camera_ink)
	if _minimap == null:
		_minimap = ImageTexture.create_from_image(image)
	else:
		_minimap.update(image)
	return _minimap

func _mini_pixel(image: Image, point: Vector2, color: Color, scale: float, origin: Vector2) -> void:
	var pixel := Vector2i(floori(origin.x + point.x * scale), floori(origin.y + point.y * scale))
	if pixel.x >= 0 and pixel.x < image.get_width() and pixel.y >= 0 and pixel.y < image.get_height():
		image.set_pixelv(pixel, color)
