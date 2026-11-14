extends RefCounted

const UITheme = preload("res://app/ui_theme.gd")
const L10n = preload("res://app/localization.gd")
const GameSkin = preload("res://app/skin.gd")
const OfferPopup = preload("res://app/offer_popup.gd")

var h
var _art: Array = []
var _credit_data: Dictionary = {}

func setup(host) -> void:
	h = host
	var credits = JSON.parse_string(FileAccess.get_file_as_string("res://data/credits.json"))
	if credits is Dictionary:
		_credit_data = credits
	var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/restoration_art.json"))
	if data is Dictionary and data.get("cultures") is Array:
		_art = data.cultures

func _thumbnail(index: int) -> TextureRect:
	var image := TextureRect.new()
	if index >= 0 and index < _art.size():
		var path := str(_art[index].get("thumbnail", ""))
		if not path.is_empty() and ResourceLoader.exists(path):
			image.texture = load(path) as Texture2D
	image.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	image.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	image.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	image.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return image

func _single_line(text: String, font_size := 13, color := UITheme.TEXT) -> Label:
	var label: Label = h._label(text, font_size, color)
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.clip_text = true
	label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return label

func _footer(page: Dictionary, button: Button) -> void:
	var footer := PanelContainer.new()
	var style := UITheme.box(UITheme.MENU_BG, UITheme.MENU_BORDER, 1, 0)
	style.content_margin_left = 22
	style.content_margin_right = 22
	style.content_margin_top = 10
	style.content_margin_bottom = 14
	footer.add_theme_stylebox_override("panel", style)
	button.custom_minimum_size.y = 48
	footer.add_child(button)
	page.fixed.add_child(footer)
	var layout := func():
		footer.position = Vector2(0, page.fixed.size.y - 74)
		footer.size = Vector2(page.fixed.size.x, 74)
	page.fixed.resized.connect(layout)
	page.root.ready.connect(layout)

func regions() -> Control:
	var page: Dictionary = h._page("Regions", "", "home", 74.0, true)
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	page.content.add_child(grid)
	for index in range(h.catalog.regions.size()):
		grid.add_child(_region_card(index))
	var future: Label = h._label("? · More regions may follow", 12, UITheme.MUTED)
	future.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	page.content.add_child(future)
	_footer(page, h._button("Enter selected region", func(): h.app.navigate("maps"), not h.journey.region_open(h.app.selected_region), true))
	return page.root

func _region_card(index: int) -> Button:
	var region: Dictionary = h.catalog.region(index)
	var open: bool = h.journey.region_open(index)
	var progress: Dictionary = h.journey.region_progress(index)
	var card: Button = h._button("", func(): h.app.select_region(index))
	card.custom_minimum_size = Vector2(0, 184)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.clip_contents = true
	if index == h.app.selected_region:
		card.add_theme_stylebox_override("normal", UITheme.box(UITheme.MENU_PANEL, UITheme.GOLD, 1, 0))
	var image := _thumbnail(index)
	if not open:
		image.modulate.a = 0.23
	card.add_child(image)
	var title := _single_line(L10n.format("%02d · %s", [index + 1, L10n.text(str(region.name)) if open else L10n.text("Undiscovered")]), 13, UITheme.TEXT if open else UITheme.MUTED)
	card.add_child(title)
	var summary: Label = h._label(L10n.format("%d/%d sites cleared", [int(progress.get("clears", 0)), region.sites.size()]) if open else "Clear the previous region", 12, UITheme.MUTED)
	card.add_child(summary)
	var layout := func():
		image.position = Vector2(1, 1)
		image.size = Vector2(maxf(1, card.size.x - 2), 106)
		title.position = Vector2(10, 115)
		title.size = Vector2(maxf(1, card.size.x - 20), 22)
		summary.position = Vector2(10, 140)
		summary.size = Vector2(maxf(1, card.size.x - 20), 36)
	card.resized.connect(layout)
	card.ready.connect(layout)
	return card

func maps() -> Control:
	var index: int = h.app.selected_region
	var region: Dictionary = h.catalog.region(index)
	var page: Dictionary = h._page("Map selection", "", "home", 74.0, true)
	page.content.add_theme_constant_override("separation", 8)
	var hero := _map_hero(index)
	page.content.add_child(hero)
	var guide := HBoxContainer.new()
	guide.custom_minimum_size.y = 44
	var rule: Label = h._label("70% recovery clears a site.", 12, UITheme.MUTED)
	rule.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	rule.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	guide.add_child(rule)
	if index == 0:
		var tutorial: Button = h._button("Tutorial →", func(): h.app.start_run("training"))
		tutorial.add_theme_font_size_override("font_size", 12)
		guide.add_child(tutorial)
	page.content.add_child(guide)
	var rows := VBoxContainer.new()
	rows.add_theme_constant_override("separation", 6)
	page.content.add_child(rows)
	for site_id in region.sites:
		rows.add_child(_map_row(str(site_id), rows.get_child_count()))
	var fit_content := func():
		var height: float = page.fixed.size.y
		hero.custom_minimum_size.y = 64 if height < 762 else 90 if height < 782 else 110
		for row: Control in rows.get_children(): row.custom_minimum_size.y = 52 if height < 762 else 58
	page.fixed.resized.connect(fit_content)
	page.root.ready.connect(fit_content)
	_footer(page, h._button("Upgrade equipment", func(): h.app.navigate("workshop", {"from": "maps"})))
	return page.root

func _map_hero(index: int) -> Control:
	var region: Dictionary = h.catalog.region(index)
	var hero := Panel.new()
	hero.custom_minimum_size.y = 110
	hero.clip_contents = true
	hero.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hero.add_theme_stylebox_override("panel", UITheme.box(UITheme.MENU_PANEL, UITheme.MENU_BORDER, 1, 0))
	var image := _thumbnail(index)
	hero.add_child(image)
	image.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	image.offset_left = 1
	image.offset_top = 1
	image.offset_right = -1
	image.offset_bottom = -1
	var shade := ColorRect.new()
	shade.color = Color(0.04, 0.09, 0.12, 0.58)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hero.add_child(shade)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var title := _single_line(L10n.format("Region %d · %s", [index + 1, L10n.text(str(region.name))]), 17)
	hero.add_child(title)
	var normal_clears := 0
	var perfect := 0
	for id in region.sites:
		var record: Dictionary = h.journey.profile.stageRecords.get(str(id), {})
		var best := float(record.get("recovered", 0)) / maxf(1, float(record.get("total", 1)))
		perfect += int(best >= 1.0)
		if not bool(h.catalog.metadata(str(id)).get("boss", false)):
			normal_clears += int(best >= 0.7)
	var summary := _single_line(L10n.format("Normal %d/6 · 100%% %d/7", [normal_clears, perfect]), 12, UITheme.MINT)
	hero.add_child(summary)
	var layout := func():
		title.position = Vector2(14,maxf(6,hero.size.y-64))
		title.size = Vector2(maxf(1,hero.size.x-28),24)
		summary.position = Vector2(14,maxf(32,hero.size.y-34))
		summary.size = Vector2(maxf(1, hero.size.x - 28), 22)
	hero.resized.connect(layout)
	hero.ready.connect(layout)
	return hero

func _map_row(site_id: String, index: int) -> Button:
	var site: Dictionary = h.catalog.metadata(site_id)
	var record: Dictionary = h.journey.profile.stageRecords.get(site_id, {})
	var best := float(record.get("recovered", 0)) / maxf(1, float(record.get("total", 1)))
	var open: bool = h.journey.stage_open(site_id)
	var boss := bool(site.get("boss", false))
	var row: Button = h._button("", func(): h.app.start_run("stage", site_id), not open)
	row.custom_minimum_size.y = 58
	if boss or best >= 0.7:
		var accent := UITheme.GOLD if boss or best >= 1.0 else UITheme.MINT
		var fill := UITheme.MENU_PANEL.lerp(accent, 0.1) if best >= 0.7 else UITheme.MENU_PANEL
		row.add_theme_stylebox_override("normal", UITheme.box(fill, accent.darkened(0.2), 1, 0))
	var number := _single_line("B" if boss else "%02d" % (index + 1), 15, UITheme.GOLD)
	row.add_child(number)
	var name_label := _single_line(str(site.name), 13, UITheme.TEXT if open else UITheme.MUTED)
	row.add_child(name_label)
	var state := "FULL CLEAR" if best >= 1.0 else "CLEARED" if best >= 0.7 else "Best record" if not record.is_empty() else "Unattempted"
	if not open:
		state = "Clear all 6 normal sites" if boss else "Clear the previous region"
	var status := _single_line(state, 12, UITheme.MINT if best >= 0.7 else UITheme.MUTED)
	row.add_child(status)
	var score := _single_line(h._percent(best) if not record.is_empty() else "→", 14, UITheme.GOLD if best >= 1.0 else UITheme.MINT)
	if not open:
		score.text = L10n.text("Locked")
		score.add_theme_font_size_override("font_size", 12)
		score.add_theme_color_override("font_color", UITheme.MUTED)
	score.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(score)
	var layout := func():
		number.position = Vector2(12, 0)
		number.size = Vector2(30,row.size.y)
		name_label.position = Vector2(54, 7)
		name_label.size = Vector2(maxf(1, row.size.x - 138), 22)
		status.position = Vector2(54, 30)
		status.size = Vector2(maxf(1, row.size.x - 138), 19)
		score.position = Vector2(row.size.x - 80, 0)
		score.size = Vector2(68,row.size.y)
	row.resized.connect(layout)
	row.ready.connect(layout)
	return row

func settings(payload: Dictionary) -> Control:
	h._settings_from = str(payload.get("from", "home"))
	var page: Dictionary = h._page("Options", "", h._settings_from, 0.0, true)
	if page.has("back_button"):
		for connection in page.back_button.pressed.get_connections():
			page.back_button.pressed.disconnect(connection.callable)
		page.back_button.pressed.connect(h.app.return_from_settings)
	page.content.add_child(h._label("Basic settings", 14, UITheme.GOLD))
	var basic := _group(page.content)
	var languages := _option_row(basic, "Language")
	for entry in [["ko", "한국어"], ["en", "English"]]:
		var selected: bool = L10n.language() == str(entry[0])
		var button: Button = h._button(str(entry[1]), func(): h.app.set_language(str(entry[0])), selected, selected)
		button.add_theme_font_size_override("font_size", 12)
		if selected: _selected_setting(button)
		languages.add_child(button)
	var skins := _option_row(basic, "Game skin")
	for entry in [[1, "Original"], [2, "Bright"]]:
		var selected: bool = GameSkin.bright() == (int(entry[0]) == 2)
		var button: Button = h._button(str(entry[1]), func(): h.app.set_skin(int(entry[0])), selected or h.journey.current_run != null, selected)
		button.add_theme_font_size_override("font_size", 12)
		if selected: _selected_setting(button)
		skins.add_child(button)
	if h.journey.current_run != null:
		page.content.add_child(h._label("Return to camp to change the skin.", 12, UITheme.MUTED))
	page.content.add_child(h._label("Audio & Vibration", 14, UITheme.GOLD))
	var audio := _group(page.content)
	for entry in [["music", "Music"], ["effects", "Sound effects"], ["haptics", "Vibration"]]:
		_audio_row(audio, str(entry[0]), str(entry[1]))
	page.content.add_child(h._label("Other", 14, UITheme.GOLD))
	var other := _group(page.content)
	_link(other, "Record management", _records)
	_link(other, "Controls", _help)
	_link(other, "Credits", _credits)
	_link(other, "Build information", func(): h.app.navigate("build_info", {"from": "settings"}))
	if h.app.has_method("open_feedback"):
		_link(other, "Feedback", func(): h.app.open_feedback())
	if h.app.presentation_preview_enabled and h.journey.current_run == null:
		_link(other, "Presentation preview", func(): h.app.navigate("presentation_preview"))
	page.content.add_child(h._label("Play records are saved on this device only.", 12, UITheme.MUTED))
	return page.root

func _group(parent: VBoxContainer) -> VBoxContainer:
	var panel := PanelContainer.new()
	var style := UITheme.box(UITheme.MENU_PANEL, UITheme.MENU_BORDER, 1, 0)
	style.content_margin_left = 12
	style.content_margin_right = 12
	panel.add_theme_stylebox_override("panel", style)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 0)
	panel.add_child(column)
	parent.add_child(panel)
	return column

func _option_row(parent: VBoxContainer, text: String) -> HBoxContainer:
	if parent.get_child_count() > 0:
		parent.add_child(HSeparator.new())
	var row := HBoxContainer.new()
	row.custom_minimum_size.y = 58
	row.add_theme_constant_override("separation", 4)
	var label: Label = h._label(text, 13)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)
	parent.add_child(row)
	return row

func _audio_row(parent: VBoxContainer, key: String, title: String) -> void:
	var enabled: bool = h.feedback.settings.get(key, true)
	var native_vibration := OS.has_feature("ios") or OS.has_feature("android")
	var row := _option_row(parent, title)
	var toggle: Button = h._button("ON" if enabled else "OFF", func(): h.app.set_audio(key, not enabled), key == "haptics" and not native_vibration)
	toggle.custom_minimum_size.x = 70
	toggle.add_theme_font_size_override("font_size", 12)
	toggle.add_theme_color_override("font_color", UITheme.MINT if enabled else UITheme.MUTED)
	if key == "haptics" and not native_vibration:
		toggle.text = L10n.text("app only")
	row.add_child(toggle)
	if key == "haptics":
		return
	var line := HBoxContainer.new()
	line.custom_minimum_size.y = 44
	var label := _single_line("Volume",12,UITheme.MUTED)
	label.custom_minimum_size.x = 40
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	line.add_child(label)
	var slider := HSlider.new()
	slider.min_value = 0
	slider.max_value = 100
	slider.step = 5
	slider.value = float(h.feedback.settings.get(key + "Volume", 1)) * 100
	slider.custom_minimum_size.y = 44
	slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	line.add_child(slider)
	var value := _single_line("%d%%" % int(slider.value), 12, UITheme.MUTED)
	value.custom_minimum_size.x = 40
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	line.add_child(value)
	slider.value_changed.connect(func(amount):
		value.text = "%d%%" % int(amount)
		h.app.set_audio(key + "Volume", amount / 100.0))
	parent.add_child(line)

func _link(parent: VBoxContainer, title: String, action: Callable) -> void:
	if parent.get_child_count() > 0:
		parent.add_child(HSeparator.new())
	var button: Button = h._button("", action)
	button.custom_minimum_size.y = 54
	h._flat(button, UITheme.TEXT)
	var label := _single_line(title, 13)
	button.add_child(label)
	var arrow := _single_line("›", 20, UITheme.MUTED)
	arrow.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	button.add_child(arrow)
	var layout := func():
		label.position = Vector2.ZERO
		label.size = Vector2(maxf(1, button.size.x - 32), button.size.y)
		arrow.position = Vector2(button.size.x - 28, 0)
		arrow.size = Vector2(28, button.size.y)
	button.resized.connect(layout)
	button.ready.connect(layout)
	parent.add_child(button)

func _popup(title: String, content: VBoxContainer) -> void:
	h.close_popup()
	var popup := OfferPopup.new()
	popup.configure(L10n.text(title), content)
	popup.theme = h._menu_theme
	h._offer_popup = popup
	popup.closed.connect(func():
		if h._offer_popup == popup:
			h._offer_popup = null)
	h.app.view.add_child(popup)

func _records() -> void:
	var content := VBoxContainer.new()
	content.add_child(h._label("Play records are saved on this device only.", 13, UITheme.MUTED))
	content.add_child(h._button("Import profile", func(): h.app.import_profile(), h.journey.current_run != null))
	content.add_child(h._button("Export records", func(): h.app.export_profile()))
	content.add_child(h._button("Reset progress", func(): h.app.show_reset_confirm(), h.journey.current_run != null))
	_popup("Record management", content)

func _help() -> void:
	var content := VBoxContainer.new()
	content.add_child(h._label("Tap to attack. Two fingers move and zoom. On PC, right-drag to move and scroll to zoom.", 13))
	content.add_child(h._label("Tap a tool below the field to select it.", 13))
	content.add_child(h._label("70% recovery clears a site.", 13, UITheme.MINT))
	if h.app.selected_region == 0:
		content.add_child(h._button("Tutorial ↗", func(): h.app.start_run("training"), h.journey.current_run != null))
	var stats: Dictionary = h.journey.stats()
	content.add_child(h._label("Your equipment", 14, UITheme.GOLD))
	for entry in [["Battery", stats.capacity], ["Blast radius", stats.bombRadius]]:
		content.add_child(h._label(L10n.format("%s · %s", [L10n.text(str(entry[0])), String.num(float(entry[1]), 2)]), 12))
	content.add_child(h._label(L10n.format("Debris Processing · %s×", [String.num(float(stats.debrisProcessing), 2)]), 12))
	content.add_child(h._label(L10n.format("Resource Refining · +%s%% scrap", [String.num(float(stats.salvageYield) * 100.0, 2)]), 12))
	_popup("Controls", content)

func _credit_visible(entry: Dictionary) -> bool:
	var platform := str(entry.get("platform", "all"))
	return platform == "all" or platform == ("web" if OS.has_feature("web") else "native")

func _credits() -> void:
	var content := VBoxContainer.new()
	content.add_child(h._label(str(_credit_data.get("title", "Planet Patchup")), 18, UITheme.GOLD))
	content.add_child(h._label(str(_credit_data.get("subtitle", "행성을 지켜줘!")), 13))
	for section in _credit_data.get("sections", []):
		var entries: Array = []
		for entry in section.get("entries", []):
			if _credit_visible(entry):
				entries.append(entry)
		if entries.is_empty():
			continue
		content.add_child(h._label(str(section.get("title", "")), 14, UITheme.GOLD))
		for entry in entries:
			content.add_child(h._label(str(entry.get("role", "")), 12, UITheme.MUTED))
			content.add_child(h._label(str(entry.get("name", "")), 13))
	content.add_child(h._button("Licenses", _licenses))
	_popup("Credits", content)

func _licenses() -> void:
	var content := VBoxContainer.new()
	for notice in _credit_data.get("notices", []):
		if not _credit_visible(notice):
			continue
		var item: Dictionary = notice
		content.add_child(h._button(str(item.get("title", "")), func(): _license_text(item)))
		content.add_child(h._label(str(item.get("license", "")), 12, UITheme.MUTED))
	content.add_child(h._button("Back to credits", _credits))
	_popup("Licenses", content)

func _license_text(notice: Dictionary) -> void:
	var content := VBoxContainer.new()
	content.add_child(h._label(str(notice.get("license", "")), 12, UITheme.MUTED))
	var text := RichTextLabel.new()
	text.bbcode_enabled = false
	text.text = str(notice.get("text", ""))
	text.selection_enabled = true
	text.focus_mode = Control.FOCUS_ALL
	text.custom_minimum_size.y = 280
	text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	text.add_theme_font_size_override("normal_font_size", 12)
	content.add_child(text)
	content.add_child(h._label(str(notice.get("source", "")), 12, UITheme.MUTED))
	content.add_child(h._button("Back to licenses", _licenses))
	_popup(str(notice.get("title", "Licenses")), content)

func _working() -> bool:
	var run = h.journey.current_run
	return run != null and run.phase == "working" and not run.settling and not run.finish_ready

func pause() -> Control:
	var working := _working()
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.theme = h._menu_theme
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0.04, 0.09, 0.13, 0.79)
	root.add_child(dim)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UITheme.box(UITheme.MENU_PANEL, UITheme.GOLD, 1, 18))
	root.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	panel.add_child(column)
	var title: Label = h._label("Paused", 24)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(title)
	var run = h.journey.current_run
	if run != null:
		var site: Label = h._label(str(run.site.name), 13, UITheme.GOLD)
		site.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		column.add_child(site)
	var copy: Label = h._label("Time and battery are paused." if working else "Recovery is paused.", 12, UITheme.MUTED)
	copy.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(copy)
	column.add_child(h._button("Resume cleanup" if working else "Resume recovery", func(): h.app.resume_run(), false, true))
	if working:
		column.add_child(h._button("Restart", func(): h.app.request_restart()))
		column.add_child(h._button("Finish cleanup", _confirm_finish))
	var options: Button = h._button("Options", func(): h.app.show_settings("pause"))
	options.add_theme_font_size_override("font_size", 13)
	h._flat(options, UITheme.MUTED)
	column.add_child(options)
	if h.app.has_method("open_feedback"):
		var feedback: Button = h._button("Feedback", func(): h.app.open_feedback())
		feedback.add_theme_font_size_override("font_size", 13)
		h._flat(feedback, UITheme.MUTED)
		column.add_child(feedback)
	var layout := func():
		panel.size.x = minf(342, maxf(1, root.size.x - 44))
		panel.size.y = panel.get_combined_minimum_size().y
		panel.position = (root.size - panel.size) / 2.0
	root.resized.connect(layout)
	root.ready.connect(layout)
	return root

func _confirm_finish() -> void:
	if not _working():
		return
	var content := VBoxContainer.new()
	content.add_child(h._label("Loose debris is collected before rewards and upgrades.", 13))
	var actions := HBoxContainer.new()
	var cancel: Button = h._button("Cancel", func(): h.close_popup())
	cancel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	actions.add_child(cancel)
	var collect: Button = h._button("Start recovery", func():
		h.close_popup()
		if _working():
			h.app.finish_run()
		else:
			h.app.resume_run(), false, true)
	collect.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	actions.add_child(collect)
	content.add_child(actions)
	_popup("Finish cleanup?", content)

func _selected_setting(button: Button) -> void:
	button.add_theme_stylebox_override("disabled",UITheme.box(Color("344641"),UITheme.GOLD,1,10))
	button.add_theme_color_override("font_disabled_color",UITheme.GOLD)
