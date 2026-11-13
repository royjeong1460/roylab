extends Node

const FreeWebBridge = preload("res://platform/free_web_bridge.gd")

const Catalog = preload("res://campaign/catalog.gd")
const Journey = preload("res://campaign/journey.gd")
const Screens = preload("res://app/screens.gd")
const UITheme = preload("res://app/ui_theme.gd")
const PlayView = preload("res://app/play_view.gd")
const PlayLayout = preload("res://app/play_layout.gd")
const L10n = preload("res://app/localization.gd")
const GameSkin = preload("res://app/skin.gd")
const Feedback = preload("res://presentation/audio.gd")
const Haptics = preload("res://platform/haptics.gd")
const Lifecycle = preload("res://platform/lifecycle.gd")
const ImportExport = preload("res://platform/import_export.gd")
var web_bridge := FreeWebBridge.new()
var _web_clock := 0.0
var _feedback_was_running := false
var _feedback_open := false
var catalog := Catalog.new()
var journey := Journey.new()
var screens := Screens.new()
var feedback
var haptics
var lifecycle
var files
var play_view
var selected_region := 0
var current_screen := "loading"
var notice := ""
var _notice_source := ""
var _notice_args: Array = []
var _notice_rendered := ""
var safe_rect := Rect2()
var canvas: CanvasLayer
var safe_root := Control.new()
var view: Control
var backdrop := ColorRect.new()
var ground_surround := ColorRect.new()
var unsafe_masks: Array = []
var payload: Dictionary = {}
var _pending_import := ""
var _hud_clock := 0.0
var _finishing := false
var _reset_revision := -1
var presentation_preview_enabled := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	Engine.max_fps = 60
	L10n.setup()
	GameSkin.setup()
	DisplayServer.window_set_title("Planet Patchup · Godot")
	var error := catalog.load_catalog()
	canvas = CanvasLayer.new()
	canvas.layer = 1
	add_child(canvas)
	canvas.add_child(safe_root)
	for index in range(4):
		var mask := ColorRect.new()
		mask.color = Color("091322")
		mask.mouse_filter = Control.MOUSE_FILTER_IGNORE
		canvas.add_child(mask)
		unsafe_masks.append(mask)
	safe_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var background_layer := CanvasLayer.new()
	background_layer.layer = -10
	add_child(background_layer)
	background_layer.add_child(backdrop)
	backdrop.color = Color("091322")
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background_layer.add_child(ground_surround)
	ground_surround.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ground_surround.visible = false
	if error != OK:
		var label := Label.new()
		label.text = L10n.format("Required content could not be loaded. Your progress has not been reset.\n%s", [catalog.last_error])
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		safe_root.add_child(label)
		label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_layout()
		return
	var save_error := journey.setup(catalog)
	web_bridge.bootstrap(journey)
	journey.browser_event.connect(web_bridge.emit_event)
	web_bridge.bind_feedback(_feedback_changed)
	notice = journey.notice if save_error != OK or not journey.notice.is_empty() else ""
	selected_region = journey.selected_region()
	if OS.has_feature("web") and not OS.is_userfs_persistent():
		notice += ("\n" if not notice.is_empty() else "") + _render_notice("Browser storage is unavailable. Export your profile before leaving this page.")
	feedback = Feedback.new()
	add_child(feedback)
	feedback.setup(catalog)
	web_bridge.apply_legacy_settings(feedback)
	haptics = Haptics.new()
	add_child(haptics)
	haptics.setup(feedback.settings)
	lifecycle = Lifecycle.new()
	add_child(lifecycle)
	lifecycle.setup(feedback)
	lifecycle.active_changed.connect(_active_changed)
	lifecycle.back_requested.connect(_back_requested)
	files = ImportExport.new()
	add_child(files)
	files.import_ready.connect(_import_ready)
	files.failure.connect(show_notice)
	files.exported.connect(func(path): show_notice("Records exported: %s", [path.get_file()]))
	safe_root.theme = UITheme.make(catalog)
	screens.setup(self, catalog, journey, feedback)
	get_viewport().size_changed.connect(_layout)
	_layout()
	var preview_requested: bool = web_bridge.presentation_preview_requested()
	presentation_preview_enabled = preview_requested or bool(ProjectSettings.get_setting("presentation/preview_enabled", false))
	navigate("presentation_preview" if preview_requested else "home")
	web_bridge.emit_event("ready")

func _layout() -> void:
	var size := get_viewport().get_visible_rect().size
	var inset := Vector4(0, 0, 0, 0)
	if OS.has_feature("ios"):
		var safe := DisplayServer.get_display_safe_area()
		var screen := Vector2(DisplayServer.screen_get_size())
		if screen.x > 0 and screen.y > 0:
			inset = Vector4(safe.position.x / screen.x * size.x, safe.position.y / screen.y * size.y, (screen.x - safe.end.x) / screen.x * size.x, (screen.y - safe.end.y) / screen.y * size.y)
	safe_rect = Rect2(Vector2(inset.x, inset.y), size - Vector2(inset.x + inset.z, inset.y + inset.w))
	safe_root.position = safe_rect.position
	safe_root.size = safe_rect.size
	backdrop.size = size
	var masks := [Rect2(0, 0, size.x, safe_rect.position.y), Rect2(0, safe_rect.end.y, size.x, maxf(0, size.y - safe_rect.end.y)), Rect2(0, safe_rect.position.y, safe_rect.position.x, safe_rect.size.y), Rect2(safe_rect.end.x, safe_rect.position.y, maxf(0, size.x - safe_rect.end.x), safe_rect.size.y)]
	for index in range(unsafe_masks.size()):
		unsafe_masks[index].position = masks[index].position
		unsafe_masks[index].size = masks[index].size
	_update_edge_colors()
	if is_instance_valid(play_view):
		play_view.set_area(_play_area())

func _play_area() -> Rect2:
	return PlayLayout.play_area(safe_rect, journey.current_run != null and journey.current_run.phase == "finishing")

func _update_edge_colors() -> void:
	for index in range(unsafe_masks.size()):
		var color := UITheme.MENU_BG if current_screen == "home" or current_screen in UITheme.TEAL_SCREENS else UITheme.BG
		if current_screen == "play" and is_instance_valid(play_view):
			color = GameSkin.hud("cream") if index == 0 else GameSkin.hud("sand") if index == 1 and GameSkin.bright() else play_view.ground_color if index == 1 else Color.TRANSPARENT
		unsafe_masks[index].color = color

func navigate(screen: String, data: Dictionary = {}) -> void:
	if journey.current_run != null and screen not in ["play", "pause", "settings", "build_info", "tutorial_intro"]:
		pause_run()
		return
	var next_payload := data.duplicate(true)
	if screen == "workshop" and current_screen == "workshop":
		next_payload = payload.duplicate(true)
		next_payload.merge(data, true)
	elif screen in ["build_info", "reset", "reset_confirm", "import_confirm"] and current_screen in ["settings", "build_info", "reset", "reset_confirm", "import_confirm"]:
		next_payload = payload.duplicate(true)
		next_payload.merge(data, true)
	elif screen == "settings" and current_screen in ["build_info", "reset", "reset_confirm", "import_confirm"] and data.is_empty():
		next_payload = payload.duplicate(true)
	elif current_screen == "settings" and screen == str(payload.get("return_screen", "home")) and data.is_empty():
		next_payload = payload.get("return_payload", {}).duplicate(true)
	if screen != current_screen:
		web_bridge.emit_event("screen", {"screen": "expedition" if screen == "play" else screen})
	current_screen = screen
	while screens.close_popup():
		pass
	payload = next_payload
	if is_instance_valid(view):
		# A pressed button can still be part of the current input dispatch.
		view.hide()
		view.queue_free()
	view = screens.build(screen, payload)
	safe_root.add_child(view)
	view.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	ground_surround.visible = is_instance_valid(play_view)
	if not is_instance_valid(play_view):
		backdrop.color = UITheme.MENU_BG if screen == "home" or screen in UITheme.TEAL_SCREENS else UITheme.BG
	_update_edge_colors()
	if is_instance_valid(play_view):
		play_view.visible = screen in ["play", "pause", "settings", "build_info"]
	if screen == "play" and play_view != null:
		screens.update_hud(play_view)

func select_region(index: int) -> void:
	selected_region = posmod(index, catalog.regions.size())
	if journey.region_open(selected_region):
		var selected: Dictionary = journey.select_region(selected_region)
		if not selected.ok:
			show_notice(_failure_text(selected))
	feedback.play_effect("ui-tap")
	navigate("home")

func advance_after_result(action: Callable) -> void:
	action.call()

func result_destination(receipt: Dictionary) -> Dictionary:
	var destination := {"label": L10n.text("Choose a site"), "mode": "", "siteId": "", "region": selected_region, "screen": "maps"}
	var site_id := str(receipt.get("siteId", ""))
	var region: int = journey.progression.site_region(site_id)
	if site_id == catalog.tutorial_id:
		region = 0
		if str(journey.profile.tutorial) == "upgrade":
			destination.merge({"label": L10n.text("Complete your first upgrade"), "region": 0, "screen": "workshop"}, true)
			return destination
		if str(journey.profile.tutorial) == "intro":
			return _result_retry_destination(receipt)
	elif region < 0 or not bool(receipt.get("qualified", false)):
		return _result_retry_destination(receipt)
	if not journey.region_open(region):
		return destination
	var normal_sites: Array = []
	var boss_id := ""
	for id in catalog.region(region).get("sites", []):
		if catalog.metadata(str(id)).get("boss", false):
			boss_id = str(id)
		else:
			normal_sites.append(str(id))
	var next_id := ""
	var label_key := "Next site: %s"
	if site_id == catalog.tutorial_id:
		next_id = str(normal_sites[0]) if not normal_sites.is_empty() else ""
		label_key = "Start first site: %s"
	elif site_id == boss_id:
		if region == catalog.regions.size() - 1:
			destination.merge({"label": L10n.text("Back to planet"), "region": region, "screen": "home"}, true)
			return destination
		var next_region = receipt.get("nextRegion")
		if next_region == null or int(next_region) != region + 1 or not journey.region_open(int(next_region)):
			return destination
		region = int(next_region)
		for id in catalog.region(region).get("sites", []):
			if not catalog.metadata(str(id)).get("boss", false):
				next_id = str(id)
				break
		label_key = "Next region: %s"
	else:
		var index := normal_sites.find(site_id)
		if index < 0:
			return destination
		if index + 1 < normal_sites.size():
			next_id = str(normal_sites[index + 1])
		else:
			next_id = boss_id
			label_key = "Challenge boss: %s"
	if next_id.is_empty() or not journey.stage_open(next_id):
		return destination
	destination.merge({"label": L10n.format(label_key, [L10n.text(str(catalog.metadata(next_id).get("name", next_id)))]), "mode": "stage", "siteId": next_id, "region": region, "screen": "play"}, true)
	return destination

func _result_retry_destination(receipt: Dictionary) -> Dictionary:
	var destination := {"label": L10n.text("Choose a site"), "mode": "", "siteId": "", "region": selected_region, "screen": "maps"}
	var site_id := str(receipt.get("siteId", ""))
	var tutorial := site_id == catalog.tutorial_id
	var region: int = 0 if tutorial else journey.progression.site_region(site_id)
	if region < 0 or not journey.region_open(region) or (not tutorial and not journey.stage_open(site_id)):
		return destination
	destination.merge({"label": L10n.text("Retry tutorial" if tutorial else "Retry this map"), "mode": "training" if tutorial and str(journey.profile.tutorial) == "done" else "tutorial" if tutorial else "retry", "siteId": site_id, "region": region, "screen": "play"}, true)
	return destination

func depart_after_result(receipt: Dictionary) -> void:
	if journey.current_run != null:
		pause_run()
		return
	var destination := result_destination(receipt)
	if str(destination.screen) == "workshop":
		navigate("workshop", {"from_result": true, "receipt": receipt, "tab": "weapons"})
		return
	advance_after_result(_start_result_destination.bind(receipt.duplicate(true), false))

func retry_after_result(receipt: Dictionary) -> void:
	if journey.current_run != null:
		pause_run()
		return
	advance_after_result(_start_result_destination.bind(receipt.duplicate(true), true))

func _start_result_destination(receipt: Dictionary, retry: bool) -> void:
	if journey.current_run != null:
		pause_run()
		return
	var destination := _result_retry_destination(receipt) if retry else result_destination(receipt)
	if str(destination.mode).is_empty():
		navigate(str(destination.screen), {"from_result": true, "receipt": receipt, "tab": "weapons"} if destination.screen == "workshop" else {})
		return
	var region := int(destination.region)
	if not journey.region_open(region):
		navigate("maps")
		return
	var selected: Dictionary = journey.select_region(region)
	if not selected.ok:
		show_notice(_failure_text(selected))
		return
	selected_region = journey.selected_region()
	var site_id := str(destination.siteId)
	if site_id != catalog.tutorial_id and not journey.stage_open(site_id):
		navigate("maps")
		return
	# Retry normally uses lastSite; an older receipt still names the exact requested site.
	var mode := str(destination.mode)
	if mode == "retry" and str(journey.last_run_site) != site_id:
		mode = "stage"
	start_run(mode, site_id)

func start_run(mode: String, site_id := "") -> void:
	if journey.current_run != null:
		pause_run()
		return
	var result: Dictionary = journey.start(mode, site_id)
	if not result.ok:
		show_notice(_failure_text(result))
		return
	notice = ""
	get_tree().paused = false
	feedback.unlock()
	if result.mode == "tutorial":
		navigate("tutorial_intro", result)
		return
	_begin_play(result)

func complete_tutorial_intro() -> void:
	if current_screen != "tutorial_intro" or journey.current_run == null:
		return
	_begin_play(payload.duplicate())

func show_presentation(kind: String, region := 0) -> void:
	if not presentation_preview_enabled or journey.current_run != null:
		return
	feedback.unlock()
	navigate("presentation_sequence", {"kind": kind, "region": clampi(region, 0, 4)})

func _begin_play(result: Dictionary) -> void:
	feedback.set_game_paused(false)
	feedback.prepare_sortie()
	play_view = PlayView.new()
	play_view.setup(self, catalog, journey, result.site, result.profile, result.mode)
	play_view.play_area = _play_area()
	add_child(play_view)
	navigate("play")

func pause_run() -> void:
	if journey.current_run == null or not is_instance_valid(play_view):
		return
	journey.current_run.pause(true)
	play_view.controls.cancel()
	play_view.vfx.active = false
	feedback.set_game_paused(true)
	get_tree().paused = true
	navigate("pause")

func resume_run() -> void:
	if journey.current_run == null or not is_instance_valid(play_view):
		navigate("home")
		return
	if journey.current_run.settling:
		finish_run()
		return
	journey.current_run.pause(false)
	play_view.controls.cancel()
	play_view.vfx.active = true
	feedback.set_game_paused(journey.current_run.finish_ready)
	get_tree().paused = false
	navigate("play")

func request_restart() -> void:
	var run = journey.current_run
	if run == null or run.phase != "working" or run.state != "active" or run.settling or run.finish_ready or _finishing or not is_instance_valid(play_view):
		return
	pause_run()
	screens.show_restart_confirmation()

func restart_run() -> void:
	var run = journey.current_run
	if run == null or run.phase != "working" or run.state != "active" or run.settling or run.finish_ready or _finishing or not is_instance_valid(play_view):
		return
	var site_id := str(run.site.id)
	var mode := str(run.mode)
	var abandoned: Dictionary = journey.abandon("restarted")
	if not abandoned.ok:
		show_notice(_failure_text(abandoned))
		return
	play_view.controls.cancel()
	play_view.vfx.active = false
	remove_child(play_view)
	play_view.queue_free()
	play_view = null
	feedback.set_game_paused(false)
	feedback.leave_campaign()
	get_tree().paused = false
	start_run(mode, site_id)
	if journey.current_run == null:
		navigate("maps")

func finish_run() -> void:
	if _finishing or journey.current_run == null:
		return
	if not journey.current_run.finish_ready and not journey.current_run.settling:
		journey.current_run.request_finish()
		resume_run()
		return
	_finishing = true
	var result: Dictionary = journey.finish()
	_finishing = false
	if not result.ok:
		notice = _failure_text(result)
		pause_run()
		return
	feedback.finish_campaign(result)
	feedback.set_game_paused(false)
	feedback.leave_campaign()
	get_tree().paused = false
	if is_instance_valid(play_view):
		remove_child(play_view)
		play_view.queue_free()
	play_view = null
	selected_region = journey.selected_region()
	notice = ""
	navigate("workshop", {"from_result": true, "receipt": result, "tab": "weapons"})
	if int(result.get("newArtwork",-1)) >= 0:
		screens.show_artwork_reward(int(result.newArtwork))

func buy_offer(id: String, expected: Dictionary) -> void:
	var result: Dictionary = journey.buy(id, expected)
	if not result.ok:
		feedback.play_effect("ui-unavailable")
		show_notice(_failure_text(result))
		return
	notice = ""
	feedback.play_effect("ui-confirm")
	_refresh_equipment_screen(id)

func equip_skill(id: String, slot: int = -1) -> void:
	var result: Dictionary = journey.equip_skill(id, slot)
	if not result.ok:
		show_notice(_failure_text(result))
		return
	feedback.play_effect("ui-confirm")
	notice = ""
	_refresh_equipment_screen(id)

func unequip_skill(id: String) -> void:
	var result: Dictionary = journey.unequip_skill(id)
	if not result.ok:
		show_notice(_failure_text(result))
		return
	feedback.play_effect("ui-confirm")
	notice = ""
	_refresh_equipment_screen(id)

func _refresh_equipment_screen(id: String) -> void:
	if current_screen in ["receipt", "chapter"]:
		navigate(current_screen, payload)
		screens.open_unlock_intro(id)
	else:
		navigate("workshop", payload)

func skip_run_guide() -> void:
	if journey.current_run != null and journey.current_run.guide != null:
		journey.current_run.guide.skip()
		if is_instance_valid(play_view):
			play_view.queue_redraw()
			screens.update_hud(play_view)

func skip_tutorial() -> void:
	var result: Dictionary = journey.skip_tutorial()
	if result.ok:
		notice = ""
		navigate("workshop", payload)
	else:
		show_notice(_failure_text(result))

func show_settings(from := "home") -> void:
	var return_screen := from
	var return_payload: Dictionary = payload.duplicate(true) if from == current_screen else {}
	if journey.current_run != null:
		return_screen = "pause"
		return_payload = {}
		journey.current_run.pause(true)
		if is_instance_valid(play_view):
			play_view.controls.cancel()
			play_view.vfx.active = false
		feedback.set_game_paused(true)
		get_tree().paused = true
	elif payload.has("return_screen") and current_screen in ["settings", "build_info", "reset", "reset_confirm", "import_confirm"]:
		return_screen = str(payload.return_screen)
		return_payload = payload.get("return_payload", {}).duplicate(true)
	navigate("settings", {"from": return_screen, "return_screen": return_screen, "return_payload": return_payload})

func return_from_settings() -> void:
	if journey.current_run != null:
		navigate("pause")
		return
	var return_screen := str(payload.get("return_screen", payload.get("from", "home")))
	var return_payload: Dictionary = payload.get("return_payload", {}).duplicate(true)
	navigate(return_screen, return_payload)

func set_audio(key: String, value: Variant) -> void:
	feedback.set_setting(key, value)
	haptics.setup(feedback.settings)
	if not key.ends_with("Volume"):
		navigate(current_screen, payload)

func set_language(code: String) -> void:
	var store_warning := not notice.is_empty() and notice == journey.store.warning
	var journal_warning := not notice.is_empty() and notice == journey.journal.warning
	var error := L10n.set_language(code)
	if error != OK:
		show_notice("Could not save language preference. Please try again.")
		return
	if store_warning:
		journey.notice = journey.store.warning
		notice = journey.notice
	elif journal_warning:
		notice = journey.journal.warning
	elif notice == _notice_rendered:
		notice = _render_notice(_notice_source, _notice_args)
	feedback.play_effect("ui-tap")
	navigate(current_screen, payload)

func set_skin(id: int) -> void:
	if journey.current_run != null: return
	if GameSkin.select(id) != OK:
		show_notice("Could not save skin preference. Please try again.")
		return
	feedback.play_effect("ui-tap")
	navigate(current_screen,payload)

func show_reset_confirm() -> void:
	_reset_revision = int(journey.profile.revision)
	navigate("reset_confirm")

func reset_progress() -> void:
	var result: Dictionary = journey.reset_progress(_reset_revision)
	if not result.ok:
		show_notice(_failure_text(result))
		return
	notice = _render_notice("Progress reset. Sound settings and local records have been kept.")
	selected_region = 0
	feedback.play_effect("ui-confirm")
	navigate("home")

func import_profile() -> void:
	if current_screen == "import_confirm" and not _pending_import.is_empty():
		var result: Dictionary = journey.import_profile(_pending_import)
		if not result.ok:
			show_notice(_failure_text(result))
			return
		_pending_import = ""
		selected_region = journey.selected_region()
		notice = journey.notice if not journey.notice.is_empty() else _render_notice("Profile imported. The previous Godot profile was backed up.")
		feedback.play_effect("ui-confirm")
		navigate("home")
		return
	if journey.current_run != null:
		show_notice("Finish the current run before importing progress.")
		return
	files.request_import()

func _import_ready(text: String) -> void:
	var result: Dictionary = journey.preview_import(text)
	if not result.ok:
		show_notice(_failure_text(result))
		return
	_pending_import = text
	navigate("import_confirm", {"preview": result.preview})

func export_profile() -> void:
	files.export_json(journey.export_profile())

func _render_notice(source: String, args: Array = []) -> String:
	_notice_source = source
	_notice_args = args.duplicate()
	_notice_rendered = L10n.format(source, args) if not args.is_empty() else L10n.text(source)
	return _notice_rendered

func show_notice(text: String, args: Array = []) -> void:
	notice = text if text == _notice_rendered and args.is_empty() else _render_notice(text, args)
	if is_instance_valid(view):
		if current_screen == "play" and is_instance_valid(play_view):
			screens.update_hud(play_view)
		else:
			navigate(current_screen, payload)

func _failure_text(result: Dictionary) -> String:
	var reason := str(result.get("reason", "unknown"))
	if reason in ["storage", "storage-blocked"]:
		var details: String = journey.store.warning
		if not details.is_empty():
			push_warning("Planet Patchup storage: " + details)
			return details
	if reason == "storage-unavailable":
		return _render_notice(FreeWebBridge.STORAGE_UNAVAILABLE)
	if reason == "slots-full":
		return _render_notice("Choose a slot to replace, or unequip a skill first.")
	if reason == "slot":
		return _render_notice("This skill slot is not available yet.")
	if reason == "duplicate-skill":
		return _render_notice("This skill is already equipped.")
	var descriptions := {"locked": "This map is locked. Clear the required sites first.", "insufficient": "Not enough scrap.", "stale": "Progress changed. Please try again.", "storage": "Could not save progress. Your previous data has been kept.", "storage-blocked": "Progress could not be read. Export or import a recovery copy in Options.", "active": "Finish the current run first.", "site-data": "Map data could not be loaded. Your progress has been kept.", "unavailable": "This upgrade is not available yet.", "unowned": "Learn this skill before equipping it."}
	descriptions["numeric-limit"] = "Unable to calculate the next upgrade safely. Your scrap is unchanged."
	return _render_notice(str(descriptions[reason])) if descriptions.has(reason) else _render_notice("Could not complete this action (%s). Your previous progress has been kept.", [reason])

func _active_changed(active: bool) -> void:
	if current_screen == "tutorial_intro":
		return
	if not active and journey.current_run != null:
		journey.journal.checkpoint(journey.current_run, {"closed": false, "paused": true})
		pause_run()

func _back_requested() -> void:
	if current_screen in ["presentation_preview", "presentation_sequence"]:
		navigate("presentation_preview" if current_screen == "presentation_sequence" else "home")
		return
	if current_screen == "restoration":
		if not screens.close_popup(): screens.close_restoration()
		return
	if current_screen == "tutorial_intro":
		view.finish()
		return
	if screens.close_popup():
		return
	if journey.current_run != null:
		if current_screen == "play":
			pause_run()
		elif current_screen == "pause":
			resume_run()
		elif current_screen == "settings" or current_screen == "build_info":
			navigate("pause")
		return
	if current_screen == "settings":
		return_from_settings()
	elif current_screen in ["build_info", "reset", "reset_confirm", "import_confirm"]:
		navigate("settings")
	elif current_screen in ["receipt", "chapter"] or (current_screen == "workshop" and payload.get("from_result", false)):
		navigate("maps")
	elif current_screen in ["maps", "regions", "workshop"]:
		navigate("home")
	else:
		show_settings("home")

func _process(dt: float) -> void:
	if web_bridge.available() and journey.current_run != null and journey.current_run.world != null:
		_web_clock += maxf(0.0, dt)
		if _web_clock >= 0.5:
			_web_clock = 0.0
			web_bridge.emit_event("run_frame", FreeWebBridge.run_payload(journey.current_run))
	if is_instance_valid(play_view) and play_view.world != null:
		backdrop.color = play_view.sky_color
		ground_surround.color = play_view.ground_color
		var floor_screen: Vector2 = play_view.world.get_global_transform_with_canvas() * Vector2(0, play_view.world.floor_y * 4.0)
		var height := get_viewport().get_visible_rect().size.y
		var top := clampf(floor_screen.y, 0, height)
		ground_surround.position = Vector2(0, top)
		ground_surround.size = Vector2(get_viewport().get_visible_rect().size.x, height - top)
	_hud_clock += dt
	if current_screen == "play" and _hud_clock >= 0.1 and is_instance_valid(play_view):
		_hud_clock = 0
		screens.update_hud(play_view)

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST and journey.current_run != null:
		journey.journal.checkpoint(journey.current_run, {"closed": true, "paused": true})

func open_feedback() -> void:
	if not web_bridge.available():
		return
	web_bridge.emit_event("feedback_open", {"screen": current_screen})
	web_bridge.request_feedback()

func _feedback_changed(opened: bool) -> void:
	if opened:
		if _feedback_open:
			return
		_feedback_open = true
		_feedback_was_running = journey.current_run != null and current_screen == "play" and not journey.current_run.paused
		if _feedback_was_running:
			pause_run()
	else:
		if not _feedback_open:
			return
		_feedback_open = false
		var resume := _feedback_was_running
		_feedback_was_running = false
		if resume and journey.current_run != null:
			resume_run()
