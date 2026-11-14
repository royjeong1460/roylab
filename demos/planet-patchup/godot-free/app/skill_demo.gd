extends VBoxContainer

const World = preload("res://world.gd")
const SkillVfx = preload("res://presentation/skill_vfx.gd")
const L10n = preload("res://app/localization.gd")
const UITheme = preload("res://app/ui_theme.gd")
const SCENES_PATH := "res://data/skill_demo_scenes.json"
const MAP_SIZE := Vector2i(144, 81)
const FLOOR_Y := 73

var _catalog
var _skill_id := ""
var _passive := false
var _threshold := 0
var _scene: Dictionary
var _stats: Dictionary
var _fixture: Dictionary
var _block_ids: Array = []
var _held_ids: Dictionary = {}
var _viewport: SubViewport
var _display: TextureRect
var _world
var _vfx
var _status: Label
var _caption: Label
var _count: Label
var _battery: ProgressBar
var _age := 0.0
var _next_action := 0
var _activated := false
var _effect_seen := false
var _echo_count := 0
var _battery_before := 0
var _battery_after := 0
var _restart_pending := false
var _focused := true
var _running := false

func configure(source_catalog, source_stats: Dictionary, skill_id: String) -> void:
	_catalog = source_catalog
	_stats = source_stats.duplicate(true)
	_skill_id = skill_id
	_passive = str(_catalog.skills.get(skill_id, {}).get("kind", "")) == "passive"
	var scenes = JSON.parse_string(FileAccess.get_file_as_string(SCENES_PATH))
	if scenes is Dictionary:
		_scene = scenes.get(skill_id, {})

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_theme_constant_override("separation", 6)
	var frame := AspectRatioContainer.new()
	frame.ratio = 16.0 / 9.0
	frame.custom_minimum_size = Vector2(0, 170)
	frame.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	frame.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(frame)
	var stage := Control.new()
	stage.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_child(stage)
	_display = TextureRect.new()
	_display.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_display.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_display.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_display.mouse_filter = Control.MOUSE_FILTER_IGNORE
	stage.add_child(_display)
	_display.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var caption_panel := PanelContainer.new()
	caption_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption_panel.add_theme_stylebox_override("panel", UITheme.box(Color("fff5dc"), Color("d4c6a5"), 1, 4))
	stage.add_child(caption_panel)
	caption_panel.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	_caption = Label.new()
	_caption.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_caption.add_theme_font_size_override("font_size", 10)
	_caption.add_theme_color_override("font_color", Color("43523e"))
	_caption.mouse_filter = Control.MOUSE_FILTER_IGNORE
	caption_panel.add_child(_caption)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	add_child(row)
	_status = Label.new()
	_status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status.add_theme_font_size_override("font_size", 11)
	_status.add_theme_color_override("font_color", UITheme.MINT)
	_status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(_status)
	_count = Label.new()
	_count.add_theme_font_size_override("font_size", 11)
	_count.add_theme_color_override("font_color", UITheme.GOLD)
	row.add_child(_count)
	var replay := Button.new()
	replay.text = L10n.text("Watch again")
	replay.custom_minimum_size.y = 44
	replay.add_theme_font_size_override("font_size", 11)
	replay.pressed.connect(_request_restart)
	row.add_child(replay)
	if _skill_id == "recharge":
		_battery = ProgressBar.new()
		_battery.custom_minimum_size.y = 24
		_battery.show_percentage = true
		_battery.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_battery)
	var note := Label.new()
	var preparation_hits := int(_scene.get("precharge_attacks", 1))
	note.text = L10n.format("Base level · %d attacks until activation", [preparation_hits]) if _passive else L10n.text("Base-level skill demonstration")
	note.add_theme_font_size_override("font_size", 10)
	note.add_theme_color_override("font_color", UITheme.MUTED)
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(note)
	_fixture = _make_fixture()
	if _fixture.is_empty():
		_status.text = L10n.text("Required content could not be loaded.")
		set_physics_process(false)
		return
	visibility_changed.connect(_sync_running)
	_replace_world()

func _make_fixture() -> Dictionary:
	if _scene.is_empty():
		return {}
	var texture: Texture2D = _catalog.texture("arch-building-a")
	if texture == null:
		return {}
	var image := texture.get_image()
	if image == null:
		return {}
	if image.is_compressed() and image.decompress() != OK:
		return {}
	var total := MAP_SIZE.x * MAP_SIZE.y
	var cells: Array = []
	var roles: Array = []
	var colors: Array = []
	cells.resize(total)
	roles.resize(total)
	colors.resize(total)
	cells.fill(0)
	roles.fill(0)
	colors.fill(0)
	_block_ids.clear()
	for block in _scene.blocks:
		var ids: Array = []
		for y in range(int(block[1]), int(block[1] + block[3])):
			for x in range(int(block[0]), int(block[0] + block[2])):
				var id := y * MAP_SIZE.x + x
				var color := image.get_pixel((x * 2) % image.get_width(), (y * 2) % image.get_height())
				if color.a < 0.5:
					color = Color("c98a52")
				cells[id] = 3
				roles[id] = int(block[4])
				colors[id] = color.to_rgba32() >> 8
				ids.append(id)
		_block_ids.append(ids)
	return {"schema_version": 1, "width": MAP_SIZE.x, "height": MAP_SIZE.y,
		"floor_y": FLOOR_Y, "cells": cells, "roles": roles, "colors": colors,
		"modules": []}

func _replace_world() -> void:
	if not is_inside_tree():
		return
	_set_running(false)
	if is_instance_valid(_viewport):
		remove_child(_viewport)
		_viewport.queue_free()
	_world = null
	_vfx = null
	_viewport = SubViewport.new()
	_viewport.size = Vector2i(320, 180)
	_viewport.disable_3d = true
	_viewport.world_2d = World2D.new()
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	_viewport.canvas_item_default_texture_filter = Viewport.DEFAULT_CANVAS_ITEM_TEXTURE_FILTER_NEAREST
	add_child(_viewport)
	var background := Node2D.new()
	background.draw.connect(func():
		background.draw_rect(Rect2(-576, -324, 1728, 972), Color("bdcdbc"))
		background.draw_rect(Rect2(0, FLOOR_Y * 4.0, MAP_SIZE.x * 4.0, (MAP_SIZE.y - FLOOR_Y) * 4.0), Color("b49a70"))
		background.draw_line(Vector2(0, FLOOR_Y * 4.0), Vector2(MAP_SIZE.x * 4.0, FLOOR_Y * 4.0), Color("ead4a0"), 2.0))
	_viewport.add_child(background)
	_world = World.new()
	_world.configure_site(_fixture, _stats, {
		"passive": [_skill_id] if _passive else [],
		"active": [] if _passive else [_skill_id],
		"skills": {_skill_id: 1}, "owned": ["bomb"]})
	_viewport.add_child(_world)
	_prepare_bodies()
	_threshold = int(_world.skill_physics.threshold(_skill_id)) if _passive else 0
	if _passive and bool(_scene.get("precharge", false)):
		var preparation_hits := clampi(int(_scene.get("precharge_attacks", 1)), 1, _threshold)
		_world.skill_physics.counts[_skill_id] = _threshold - preparation_hits
		_world.skill_physics.passive_count = _threshold - preparation_hits
	_vfx = SkillVfx.new()
	_viewport.add_child(_vfx)
	_vfx.setup(_world, _catalog)
	var bounds: Array = _scene.camera
	var camera := Camera2D.new()
	camera.position = Vector2(float(bounds[0]) + float(bounds[2]) * 0.5, float(bounds[1]) + float(bounds[3]) * 0.5) * 4.0
	camera.zoom = Vector2.ONE * minf(320.0 / (float(bounds[2]) * 4.0), 180.0 / (float(bounds[3]) * 4.0))
	_viewport.add_child(camera)
	camera.make_current()
	_display.texture = _viewport.get_texture()
	_age = 0.0
	_next_action = 0
	_activated = false
	_effect_seen = false
	_echo_count = 0
	_battery_before = 0
	_battery_after = 0
	_restart_pending = false
	_update_labels()
	_sync_running()

func _prepare_bodies() -> void:
	_held_ids.clear()
	for spec in _scene.get("bodies", []):
		var ids: Array = _block_ids[int(spec.block)].filter(func(id): return _world.cells[id] > 0)
		if ids.is_empty():
			continue
		var piece = _world.release(ids)
		piece.freeze = true
		var owned := {}
		for id in ids:
			owned[id] = true
		_held_ids[str(spec.name)] = owned
	_world.sync_static()

func _release_bodies(name: String, velocity: Vector2) -> void:
	var owned := {}
	if name == "*":
		for ids in _held_ids.values():
			owned.merge(ids)
	else:
		owned = _held_ids.get(name, {})
	for piece in _world.pieces:
		if not piece.ids.any(func(id): return owned.has(id)):
			continue
		piece.freeze = false
		piece.sleeping = false
		piece.linear_velocity = velocity * 4.0

func _set_running(value: bool) -> void:
	_running = value
	if not is_instance_valid(_viewport) or _world == null:
		return
	_world.paused = not value
	_vfx.active = value
	_viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS if value else SubViewport.UPDATE_DISABLED
	PhysicsServer2D.space_set_active(_viewport.world_2d.space, value)

func _sync_running() -> void:
	_set_running(is_visible_in_tree() and _focused and not _restart_pending)

func _request_restart() -> void:
	if _restart_pending:
		return
	_restart_pending = true
	_set_running(false)
	_replace_world.call_deferred()

func _run_action(action: Dictionary) -> void:
	match str(action.kind):
		"attack":
			_world.attack(Vector2(float(action.point[0]), float(action.point[1])), "blast")
		"activate":
			_battery_before = roundi(float(_world.charge) / float(_world.stats.capacity) * 100.0)
			_activated = _world.skill_physics.activate(_skill_id)
			_battery_after = roundi(float(_world.charge) / float(_world.stats.capacity) * 100.0)
		"release":
			_release_bodies(str(action.body), Vector2(float(action.velocity[0]), float(action.velocity[1])))

func _physics_process(dt: float) -> void:
	if not _running or _world == null or dt <= 0:
		return
	_age += minf(dt, 0.1)
	var actions: Array = _scene.actions
	while _next_action < actions.size() and _age >= float(actions[_next_action].at):
		_run_action(actions[_next_action])
		_next_action += 1
	_world.advance(dt)
	var events: Array = _world.events.duplicate()
	_world.events.clear()
	for event in events:
		if event.get("kind") == "blast" and event.get("secondary", false) and event.get("vfx") == _skill_id:
			_echo_count += 1
			_effect_seen = true
		elif event.get("kind") == "skill-vfx":
			if str(event.get("effect", "")) in ["slam-up", "slam-down", "expand", "wave", "recharge"]:
				_effect_seen = true
	_vfx.process_events(events)
	_update_labels()
	if _age >= float(_scene.duration):
		_request_restart()

func _update_labels() -> void:
	var caption := ""
	for phase in _scene.captions:
		if _age >= float(phase[0]):
			caption = str(phase[1])
	_caption.text = L10n.text(caption)
	if _skill_id == "recharge":
		var percentage := clampf(float(_world.charge) / maxf(1.0, float(_world.stats.capacity)) * 100.0, 0.0, 100.0)
		_battery.value = percentage
		_status.text = L10n.text("Battery Recharge" if _activated else "Use battery, then recharge")
		_count.text = "%d%% → %d%%" % [_battery_before, _battery_after] if _activated else "%d%%" % roundi(percentage)
	elif not _passive:
		_status.text = L10n.text("Skill used" if _activated else "Preparing skill")
		_count.text = L10n.text("Once per sortie")
	elif _skill_id == "aftershock" and _echo_count > 0:
		_status.text = L10n.text("Follow-up Blast")
		_count.text = L10n.format("Extra blasts · %d / %d", [_echo_count, 2])
	elif _effect_seen:
		_status.text = L10n.text(str(_catalog.skills[_skill_id].name))
		_count.text = L10n.text("Skill triggered")
	elif int(_world.skill_physics.passive_triggers) > 0:
		var state := "Waiting for marked fragment impact" if _skill_id in ["relay", "wave"] else "Skill triggered"
		_status.text = L10n.text(state)
		_count.text = "%d / %d" % [_threshold, _threshold]
	else:
		_status.text = L10n.text("Effective Shockwave attacks")
		_count.text = "%d / %d" % [int(_world.skill_physics.counts.get(_skill_id, 0)), _threshold]

func _notification(what: int) -> void:
	if what in [NOTIFICATION_APPLICATION_FOCUS_OUT, NOTIFICATION_APPLICATION_PAUSED]:
		_focused = false
		_sync_running()
	elif what in [NOTIFICATION_APPLICATION_FOCUS_IN, NOTIFICATION_APPLICATION_RESUMED]:
		_focused = true
		_sync_running()
