extends RefCounted

const UITheme = preload("res://app/ui_theme.gd")
const PlanetHome = preload("res://presentation/planet_home.gd")
const EnvironmentReceipt = preload("res://presentation/environment_receipt.gd")
const L10n = preload("res://app/localization.gd")
const GameSkin = preload("res://app/skin.gd")
const PlayLayout = preload("res://app/play_layout.gd")
const Diagnostics = preload("res://platform/diagnostics.gd")
const OfferPopup = preload("res://app/offer_popup.gd")
const PLAY_TIPS := [
	"Tap and release without moving to attack. Two fingers move and zoom.",
	"Mint pixels are ready to recover when the battery runs out.",
	"Use two fingers to move and zoom. On PC, right-drag and use the mouse wheel.",
	"Keep every recovered pixel. Spend parts on upgrades before your next sortie.",
	"When the battery runs out, all loose pixels gather at the center automatically.",
	"Clear all six normal sites at 70% to unlock the boss. Aim for 100% All Clear!",
	"Tap a tool below the field to select it.",
	"Pause to collect early and return to the workshop."
]
const BRIGHT_PLAY_TIPS := [
	"Tap without moving to attack",
	"Two fingers move and zoom",
	"Battery empty? Recovery starts automatically",
	"Upgrades apply next sortie",
	"Clear normal sites at 70% to unlock the boss",
	"Tap a tool below the field to select it.",
	"Each active skill is usable once per sortie",
	"Aim for 100% All Clear"
]
var app
var catalog
var journey
var feedback
var _hud: Dictionary = {}
var _tab := "weapons"
var _workshop_scroll: Dictionary = {}
var _offer_popup: Control
var _settings_from := "home"
var _performance_updated := 0
var _diagnostic_taps: Array[int] = []

func setup(application, source_catalog, source_journey, source_feedback) -> void:
	app = application
	catalog = source_catalog
	journey = source_journey
	feedback = source_feedback

func close_popup() -> bool:
	if not is_instance_valid(_offer_popup):
		return false
	_offer_popup.close()
	_offer_popup = null
	return true

func _label(text: String, font_size := 13, color := UITheme.TEXT) -> Label:
	var label := Label.new()
	label.text = L10n.text(text)
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

func _button(text: String, callback: Callable, disabled := false, primary := false) -> Button:
	var button := Button.new()
	button.text = L10n.text(text)
	button.custom_minimum_size.y = 44
	button.disabled = disabled
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.pressed.connect(callback)
	if primary:
		button.add_theme_stylebox_override("normal", UITheme.box(UITheme.GOLD, Color("ecdbab")))
		button.add_theme_stylebox_override("hover", UITheme.box(Color("e0c68f"), UITheme.GOLD))
		button.add_theme_stylebox_override("pressed", UITheme.box(Color("ad945c"), UITheme.GOLD))
		button.add_theme_color_override("font_color", Color("172028"))
		button.add_theme_color_override("font_hover_color", Color("172028"))
	return button

func _flat(button: Button, color := UITheme.GOLD) -> Button:
	for state in ["normal", "hover", "pressed"]:
		button.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	button.add_theme_color_override("font_color", color)
	return button

func _place(parent: Control, child: Control, rect: Rect2) -> void:
	parent.add_child(child)
	child.position = rect.position
	child.size = rect.size

func _hud_icon(key: String, color: Color) -> TextureRect:
	var icon := TextureRect.new()
	icon.texture = catalog.texture(key)
	icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	UITheme.tint_icon(icon,color)
	return icon

func _composition(home := false) -> Dictionary:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var background := ColorRect.new()
	background.color = UITheme.BG
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(background)
	# Menu pages own their one scroll area; only the short home needs an outer scroll.
	var frame: Control = ScrollContainer.new() if home else Control.new()
	if home:
		var home_scroll := frame as ScrollContainer
		home_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
		home_scroll.scroll_deadzone = 8
		home_scroll.follow_focus = true
	else:
		frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(frame)
	frame.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var content := Control.new()
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	frame.add_child(content)
	var fixed := Control.new()
	fixed.size = Vector2(390,844)
	fixed.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(fixed)
	var fit := func():
		# Home compacts vertical space; its width and touch targets stay at native size.
		var factor := 1.0 if home else maxf(0.01,minf(1.0,root.size.x / 390.0))
		fixed.size = Vector2(root.size.x / factor,maxf(540,root.size.y) if home else 844)
		var extent := fixed.size * factor
		content.custom_minimum_size = Vector2(root.size.x,maxf(root.size.y,extent.y))
		if home:
			(frame as ScrollContainer).vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO if extent.y > root.size.y else ScrollContainer.SCROLL_MODE_DISABLED
		else:
			content.size = content.custom_minimum_size
		fixed.scale = Vector2.ONE * factor
		fixed.position = Vector2((root.size.x-extent.x)/2.0,maxf(0,(root.size.y-extent.y)/2.0))
	root.resized.connect(fit)
	root.ready.connect(fit)
	return {"root": root, "fixed": fixed}

func _page(title: String, kicker := "", back := "home", footer_height := 0.0) -> Dictionary:
	var page := _composition()
	var fixed: Control = page.fixed
	_place(fixed, _label(kicker, 9, UITheme.GOLD), Rect2(22,24,300,18))
	var heading := _label(title,25)
	_place(fixed,heading,Rect2(22,48,300,40))
	var close := _button("×", func():
		if back == "play": app.resume_run()
		else: app.navigate(back))
	_place(fixed,close,Rect2(324,28,44,44))
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.scroll_deadzone = 8
	scroll.follow_focus = true
	_place(fixed, scroll, Rect2(22,103,346,711))
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 12)
	scroll.add_child(content)
	var fit_scroll := func():
		var factor := maxf(0.01,minf(1.0,page.root.size.x / 390.0))
		heading.size.x = maxf(100,fixed.size.x-92)
		close.position.x = fixed.size.x-66
		scroll.size.x = maxf(100,fixed.size.x-44)
		scroll.size.y = minf(711,maxf(80,page.root.size.y / factor - 133))
		if footer_height > 0.0:
			var available: float = (page.root.size.y-footer_height-12.0-fixed.position.y)/factor-scroll.position.y
			scroll.size.y = minf(scroll.size.y,maxf(0.0,available))
	page.root.resized.connect(fit_scroll)
	page.root.ready.connect(fit_scroll)
	page.root.ready.connect(func():
		# Native scroll-begin cancels a button press when the gesture becomes a drag.
		for button in content.find_children("*", "Button", true, false):
			button.mouse_filter = Control.MOUSE_FILTER_PASS)
	page.content = content
	page.scroll = scroll
	page.heading = heading
	if not app.notice.is_empty():
		content.add_child(_label(app.notice, 12, Color("f1ce88")))
	if not journey.journal.warning.is_empty():
		content.add_child(_label(journey.journal.warning,12,Color("f1ce88")))
	return page

func _percent(ratio: float) -> String:
	return "%.1f%%" % (floorf(ratio * 1000.0 + 0.00000001) / 10.0)

func _number(value: Variant) -> String:
	return journey.economy.money_text(value)

func _region_status(index: int) -> String:
	var progress: Dictionary = journey.region_progress(index)
	if progress.get("complete", false):
		return L10n.text("100% · All Clear")
	if progress.get("cleared", false):
		return L10n.text("70%+ · Cleared")
	return L10n.format("%s cleaned",[_percent(float(progress.get("ratio",0)))])

func build(screen: String, payload: Dictionary = {}) -> Control:
	_hud.clear()
	match screen:
		"home": return _home()
		"regions": return _regions()
		"maps": return _maps()
		"workshop", "loadout": return _workshop(payload)
		"play", "hud": return _play_hud()
		"receipt": return _receipt(payload)
		"chapter": return _chapter(payload)
		"settings": return _settings(payload)
		"pause": return _pause()
		"reset", "reset_confirm": return _reset()
		"import_confirm": return _import_confirm(payload)
		"build_info": return _build_info()
		_: return _error(payload)

func _home() -> Control:
	var page := _composition(true)
	var fixed: Control = page.fixed
	var planet := PlanetHome.new()
	_place(fixed, planet, Rect2(0,0,390,844))
	planet.setup(catalog)
	planet.update_profile(journey.profile)
	planet.set_selected(app.selected_region)
	planet.region_selected.connect(func(index): app.select_region(index))
	_place(fixed, _label("%02d / 06" % (app.selected_region + 1), 12, Color("a9beb7")), Rect2(24,31,85,22))
	var options := _flat(_button("▦",func(): app.show_settings("home")),Color("a9beb7"))
	_place(fixed,options,Rect2(326,18,44,44))
	var subtitle := _label("Save the planet!", 11, Color("b5c4b9"))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_place(fixed, subtitle, Rect2(0,80,390,24))
	var title := _label("PLANET\nPATCHUP", 30, Color("f3d79c"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_color_override("font_shadow_color", Color("84593b"))
	title.add_theme_constant_override("shadow_offset_y", 3)
	_place(fixed, title, Rect2(0,112,390,92))
	var footer := VBoxContainer.new()
	footer.mouse_filter = Control.MOUSE_FILTER_PASS
	footer.add_theme_constant_override("separation",6)
	_place(fixed,footer,Rect2(24,598,342,230))
	var selector := HBoxContainer.new()
	selector.add_theme_constant_override("separation",8)
	selector.custom_minimum_size.y = 44
	footer.add_child(selector)
	var previous_region := _button("‹",func(): app.select_region(posmod(app.selected_region-1,6)))
	var next_region := _button("›",func(): app.select_region(posmod(app.selected_region+1,6)))
	for arrow in [previous_region,next_region]:
		arrow.add_theme_font_size_override("font_size",28)
		arrow.add_theme_color_override("font_color",UITheme.TEXT)
		arrow.add_theme_stylebox_override("normal",UITheme.box(Color("20313d"),UITheme.MINT,1,0))
		arrow.add_theme_stylebox_override("hover",UITheme.box(Color("314652"),UITheme.TEXT,1,0))
		arrow.add_theme_stylebox_override("pressed",UITheme.box(Color("14242e"),UITheme.GOLD,1,0))
	previous_region.custom_minimum_size = Vector2(44,44)
	next_region.custom_minimum_size = Vector2(44,44)
	selector.add_child(previous_region)
	var region: Dictionary = catalog.region(app.selected_region)
	var name_label := _label(str(region.get("name", "")),14,Color("f4dfaf"))
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	name_label.clip_text = true
	name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	name_label.tooltip_text = name_label.text
	name_label.mouse_filter = Control.MOUSE_FILTER_PASS
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	selector.add_child(name_label)
	selector.add_child(next_region)
	var open: bool = journey.region_open(app.selected_region)
	var region_status := _region_status(app.selected_region) if open else L10n.text("Clear the previous region to unlock")
	var summary := _label(L10n.format("%s · Planet %s",[region_status,_percent(journey.planet_progress())]),10,Color("bfcdc2"))
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	summary.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	summary.custom_minimum_size.y = 22
	summary.autowrap_mode = TextServer.AUTOWRAP_OFF
	summary.clip_text = true
	summary.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	summary.tooltip_text = summary.text
	summary.mouse_filter = Control.MOUSE_FILTER_PASS
	footer.add_child(summary)
	var markers := HBoxContainer.new()
	markers.add_theme_constant_override("separation",0)
	markers.custom_minimum_size.y = 44
	footer.add_child(markers)
	var dots: Array[Button] = []
	for index in range(catalog.regions.size()):
		var marker := "━" if index == app.selected_region else "·"
		var dot := _flat(_button(marker,func(): app.select_region(index)),Color("edbf76") if index == app.selected_region else Color("718482"))
		dot.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		dot.clip_text = true
		markers.add_child(dot)
		dots.append(dot)
	var future := _label("?", 14, Color("839b97"))
	future.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	future.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	future.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	future.mouse_filter = Control.MOUSE_FILTER_IGNORE
	markers.add_child(future)
	var enter := _button("Enter     →" if open else "Locked", func():
		if journey.profile.tutorial == "intro": app.start_run("tutorial")
		else: app.navigate("maps"), not open, true)
	enter.add_theme_font_size_override("font_size",17)
	var enter_style := UITheme.box(Color("dca75f"),Color("ecc583"),2)
	enter_style.shadow_color = Color("79573b")
	enter_style.shadow_size = 4
	enter_style.shadow_offset = Vector2(0,4)
	enter.add_theme_stylebox_override("normal", enter_style)
	enter.add_theme_stylebox_override("disabled",UITheme.box(Color("334750"),Color("718589"),2))
	enter.custom_minimum_size.y = 52
	footer.add_child(enter)
	var upgrades := _flat(_button("Upgrades",func(): app.navigate("workshop")),Color("bdcdc0"))
	var regions := _flat(_button("Regions",func(): app.navigate("regions")),Color("bdcdc0"))
	var achievements := _flat(_button("Feedback" if app.web_bridge.available() else "Achievements\nComing soon",func(): app.open_feedback(),not app.web_bridge.available()),Color("bdcdc0"))
	var menu := HBoxContainer.new()
	menu.add_theme_constant_override("separation",8)
	menu.custom_minimum_size.y = 44
	footer.add_child(menu)
	for button in [upgrades,regions,achievements]:
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.clip_text = true
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.tooltip_text = button.text
		button.add_theme_font_size_override("font_size",10)
		button.add_theme_stylebox_override("disabled",StyleBoxEmpty.new())
		menu.add_child(button)
	var home_notice: Label
	if not app.notice.is_empty():
		home_notice = _label(app.notice,11,Color("ffdf86"))
		home_notice.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_place(fixed,home_notice,Rect2(24,207,342,38))
	var layout_home := func():
		var width: float = fixed.size.x
		var height: float = fixed.size.y
		var compact := height < 760
		planet.size = fixed.size
		options.position.x = width-64
		subtitle.position.y = 66 if compact else 72
		subtitle.size.x = width
		title.position.y = 90 if compact else 100
		title.size = Vector2(width,66 if compact else 72)
		title.add_theme_font_size_override("font_size",26 if compact else 30)
		# One measured stack owns the footer; no overlapping absolute child positions.
		var margin := 16.0 if width < 350 else 24.0
		footer.position = Vector2(margin,height-246)
		footer.size = Vector2(maxf(1,width-margin*2),230)
		name_label.add_theme_font_size_override("font_size",13 if width < 350 else 14)
		summary.add_theme_font_size_override("font_size",9 if width < 350 else 10)
		if home_notice != null:
			home_notice.position.y = 180 if compact else 207
			home_notice.size.x = width-48
	fixed.resized.connect(layout_home)
	page.root.ready.connect(layout_home)
	return page.root

func _regions() -> Control:
	var page := _page("Regions", "ONE PLANET · SIX CULTURES")
	for index in range(catalog.regions.size()):
		var region: Dictionary = catalog.region(index)
		var status := _region_status(index) if journey.region_open(index) else "Locked"
		page.content.add_child(_button(L10n.format("%02d · %s\n%s",[index+1,L10n.text(region.name),L10n.text(status)]),func(): app.select_region(index)))
	var future := _label("? · More regions may follow", 13, UITheme.MUTED)
	future.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	page.content.add_child(future)
	page.content.add_child(_button("Back to planet",func(): app.navigate("home")))
	return page.root

func _maps() -> Control:
	var region: Dictionary = catalog.region(app.selected_region)
	var page := _page(str(region.name),L10n.format("REGION %02d · MAP SELECT",[app.selected_region+1]))
	var content: VBoxContainer = page.content
	content.add_child(_label(L10n.format("%s · Planet %s",[_region_status(app.selected_region),_percent(journey.planet_progress())]),12,UITheme.MINT))
	var progress: Dictionary = journey.region_progress(app.selected_region)
	content.add_child(_label(L10n.format("%d / 7 cleared · Region cleanup %s",[int(progress.get("clears",0)),_percent(float(progress.get("ratio",0)))]),10,UITheme.MUTED))
	content.add_child(_button("Tutorial\nBlast · Collect · Upgrade     Practice →",func(): app.start_run("training")))
	for index in range(region.sites.size()):
		var site_id := str(region.sites[index])
		var site: Dictionary = catalog.metadata(site_id)
		var record: Dictionary = journey.profile.stageRecords.get(site_id,{})
		var best := float(record.get("recovered",0)) / maxf(1,float(record.get("total",1)))
		var open: bool = journey.stage_open(site_id)
		var state := "FULL CLEAR" if best >= 1 else "CLEARED" if best >= 0.7 else "BOSS · 70% to clear" if site.boss else "Reach 70% to clear"
		if not open: state = "Clear all 6 sites at 70%" if site.boss else "Clear the previous region"
		var row := _button("",func(): app.start_run("stage",site_id),not open)
		row.custom_minimum_size.y = 88 if site.boss else 78
		var body := Control.new()
		body.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.add_child(body)
		var number_label := _label("B" if site.boss else "%02d" % (index+1),13,UITheme.GOLD)
		number_label.autowrap_mode = TextServer.AUTOWRAP_OFF
		body.add_child(number_label)
		var name_label := _label(site.name,12,UITheme.TEXT if open else UITheme.MUTED)
		body.add_child(name_label)
		var state_label := _label(state,10,UITheme.GOLD if best>=1 else UITheme.MINT if best>=0.7 else UITheme.MUTED)
		body.add_child(state_label)
		var best_label := _label(L10n.text("BEST" if open else "LOCKED")+"\n"+_percent(best),11,UITheme.GOLD if best>=1 else UITheme.TEXT)
		best_label.autowrap_mode = TextServer.AUTOWRAP_OFF
		best_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		body.add_child(best_label)
		var meter := ProgressBar.new()
		meter.mouse_filter = Control.MOUSE_FILTER_IGNORE
		meter.show_percentage = false
		meter.value = best*100
		body.add_child(meter)
		var layout_row := func():
			# The button owns a complete card; fixed side reserves cannot collapse into vertical text.
			body.position = Vector2.ZERO
			body.size = row.size
			number_label.position = Vector2(12,22)
			number_label.size = Vector2(30,24)
			name_label.position = Vector2(50,12)
			name_label.size = Vector2(maxf(80,row.size.x-137),30)
			state_label.position = Vector2(50,45)
			state_label.size = Vector2(maxf(80,row.size.x-137),22)
			best_label.position = Vector2(row.size.x-77,14)
			best_label.size = Vector2(65,42)
			meter.position = Vector2(12,row.size.y-8)
			meter.size = Vector2(maxf(0,row.size.x-24),3)
		row.resized.connect(layout_row)
		row.ready.connect(layout_row)
		content.add_child(row)
	content.add_child(_label("Reach 70% on every normal site to open the boss. Clear the boss to open the next region. Return any time for 100% All Clear.",10,UITheme.MUTED))
	return page.root

func _offer_description(offer: Dictionary) -> String:
	var id := str(offer.id)
	var level := int(offer.level)
	if offer.has("description_key"):
		var args: Array = offer.get("description_args",[]).duplicate()
		for index in args.size():
			if args[index] is String: args[index] = L10n.text(args[index])
		var effect := L10n.format(str(offer.description_key),args)
		# Track descriptions already contain their current → next values and units.
		if catalog.tracks.has(id) or id=="blackhole": return effect
		if level==0 and catalog.skills.has(id):
			return L10n.format("At Lv 1\n%s",[effect])
		var description := L10n.format("Current Lv %s\n%s",[_number(level),effect])
		if str(offer.get("numeric_error","")).is_empty():
			description += "\n"+L10n.format("Next Lv %s\n%s",[_number(level+1),L10n.format(str(offer.get("next_description_key",offer.description_key)),offer.get("next_description_args",offer.get("description_args",[])))])
		return description
	return L10n.text(str(offer.get("description","")))

func _skill_icon(id: String) -> String:
	return str(catalog.skills.get(id,{}).get("icon",""))

func _skill_summary(id: String) -> String:
	return L10n.text(str({
		"aftershock":"Adds scattered explosions around the attack.",
		"relay":"Marks a nearby fragment. Its next hard collision creates an extra impact.",
		"slam":"Lifts nearby loose pieces, then drives them down.",
		"expand":"Builds an expanding pressure field, ending in a burst.",
		"wave":"Marks a nearby fragment. Its next hard landing sends waves along the ground.",
		"orbital":"Drops impact payloads onto the remaining structure.",
		"seismic":"Strikes foundations across the remaining structure.",
		"gravity":"Adds downward load to structures and loose pieces.",
		"sonic":"Sweeps inward from both sides of the structure.",
		"recharge":"Restores battery without consuming an attack."
	}.get(id,"")))

func _skill_unlock_hint(id: String) -> String:
	var unlock: Dictionary = journey.progression.skill_unlock_info(id)
	var index := int(unlock.get("region",0))
	var needed := int(unlock.get("clears",0))
	var cleared: int = journey.progression.normal_clears(journey.profile,index)
	var region_name := L10n.text(str(unlock.get("region_name","")))
	if needed == 0:
		return L10n.format("Open %s to unlock.",[region_name])
	var progress := L10n.format("%s · %d/%d normal sites at 70%%",[region_name,mini(cleared,needed),needed])
	if not journey.region_open(index):
		return L10n.format("Open %s first.",[region_name])+"\n"+progress
	return progress

func _skill_equip_controls(column: VBoxContainer, id: String) -> void:
	var kind := str(catalog.skills[id].kind)
	var equipped: Array = journey.profile.equipped.get(kind,[])
	var slots: int = journey.progression.skill_slots(journey.profile,kind)
	var current_slot := equipped.find(id)
	if current_slot >= 0:
		column.add_child(_label(L10n.format("Equipped · slot %d",[current_slot+1]),11,UITheme.MINT))
		column.add_child(_button("Unequip",func(): app.unequip_skill(id)))
	elif equipped.size() < slots:
		column.add_child(_button(L10n.format("Equip · slot %d",[equipped.size()+1]),func(): app.equip_skill(id)))
	else:
		column.add_child(_label("Choose a slot to replace",11,UITheme.MUTED))
		for slot in range(slots):
			var name := L10n.text(str(catalog.skills.get(equipped[slot],{}).get("name","")))
			var replace := _button(L10n.format("Replace slot %d · %s",[slot+1,name]),func(): app.equip_skill(id,slot))
			replace.add_theme_font_size_override("font_size",11)
			column.add_child(replace)

func _skill_loadout_summary(content: VBoxContainer) -> void:
	var row := HBoxContainer.new()
	content.add_child(row)
	for kind in ["passive","active"]:
		var equipped: Array = journey.profile.equipped.get(kind,[])
		var slots: int = journey.progression.skill_slots(journey.profile,kind)
		var title := L10n.text("Passive" if kind=="passive" else "Active")
		var label := _label("%s · %d/%d" % [title,equipped.size(),slots],11,UITheme.GOLD)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(label)

func _offer_name(offer: Dictionary) -> String:
	return L10n.text(str({"blastForce":"Impact Power","blastRadius":"Break Radius","blastReach":"Shock Reach","wellPull":"Pull","wellReach":"Pull Range","wellDuration":"Duration","mix":"Core Mixing","wear":"Grinding","battery":"Battery","debrisProcessing":"Debris Processing","salvageYield":"Resource Refining"}.get(str(offer.id),offer.name)))

func _offer_hint(offer: Dictionary) -> String:
	if not str(offer.get("numeric_error","")).is_empty():
		return L10n.text("Unable to calculate the next upgrade safely. Your parts are unchanged.")
	if catalog.skills.has(offer.id) and not journey.progression.skill_available(journey.profile,str(offer.id)):
		return _skill_unlock_hint(str(offer.id))
	if not offer.available and not _offer_owned(offer):
		return L10n.text("Clear 3 sites at 70% to unlock.") if offer.id=="blackhole" else L10n.text("Unlock Black Hole first.")
	return ""

func _offer_owned(offer: Dictionary) -> bool:
	return offer.id=="blackhole" and int(offer.level)>0

func _offer_locked(offer: Dictionary) -> bool:
	# Existing ownership keeps details/equipment accessible, even before a new gate.
	if _offer_owned(offer) or not str(offer.get("numeric_error","")).is_empty(): return false
	if catalog.skills.has(offer.id) and int(offer.level)>0: return false
	return not bool(offer.available)

func _offer_level(offer: Dictionary) -> String:
	if offer.id=="blackhole": return L10n.text("Owned" if _offer_owned(offer) else "Not owned")
	if not str(offer.get("numeric_error","")).is_empty(): return L10n.format("Lv %s",[_number(offer.level)])
	return L10n.format("Lv %s → %s",[_number(offer.level),_number(int(offer.level)+1)])

func _offer_summary(id: String) -> String:
	if catalog.skills.has(id): return _skill_summary(id)
	return L10n.text(str({
		"blastForce":"Pushes fragments harder and strengthens nearby cracks.",
		"blastRadius":"Widens the central area that breaks pixels loose directly.",
		"blastReach":"Carries the impact farther from the center to nearby fragments.",
		"blackhole":"Pulls loose material inward, then grinds pieces through sustained contact.",
		"wellPull":"Pulls nearby pieces toward the black hole more strongly.",
		"wellReach":"Widens the area affected by the black hole.",
		"wellDuration":"Keeps the black hole active longer.",
		"mix":"Stirs pieces more strongly inside the black hole.",
		"wear":"Raises the maximum grinding strength during sustained contact.",
		"battery":"Increases the energy available for each sortie.",
		"debrisProcessing":"Helps fragments break into pixels through collisions. Does not change direct attacks or falling speed.",
		"salvageYield":"Adds parts from recovered pixels. Does not change recovery percentage or multiply boss bonuses."
	}.get(id,"")))

func _show_offer_details(offer: Dictionary) -> void:
	close_popup()
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	var id := str(offer.id)
	column.add_child(_label(_offer_level(offer),12,UITheme.MUTED))
	column.add_child(_label(_offer_summary(id),13))
	column.add_child(_label(_offer_description(offer),13,UITheme.GOLD))
	if not _offer_owned(offer) and str(offer.get("numeric_error","")).is_empty():
		column.add_child(_label(L10n.format("%s parts",[str(offer.price_text)]),12,UITheme.MINT if offer.can_afford else Color("eea291")))
	var hint := _offer_hint(offer)
	if not hint.is_empty(): column.add_child(_label(hint,12,UITheme.MUTED))
	if catalog.skills.has(id):
		column.add_child(_label("Passives trigger from effective Blasts. Each active can be used once per sortie while battery remains. Skills use no battery.",11,UITheme.MUTED))
		if journey.progression.skill_slots(journey.profile)<2:
			var region_name := L10n.text(str(catalog.region(1).get("name","")))
			column.add_child(_label(L10n.format("Open %s to unlock a second passive slot and a second active slot.",[region_name]),11,UITheme.MUTED))
		if int(offer.level)>0: _skill_equip_controls(column,id)
	else:
		column.add_child(_label("Upgrades apply next sortie. Save parts or spend them here.",11,UITheme.MUTED))
	var popup := OfferPopup.new()
	popup.configure(_offer_name(offer),column)
	_offer_popup = popup
	popup.closed.connect(func():
		if _offer_popup == popup: _offer_popup = null)
	app.view.add_child(popup)

func _offer_purchase(offer: Dictionary) -> Button:
	var owned := _offer_owned(offer)
	var locked := _offer_locked(offer)
	var numeric_limit := not str(offer.get("numeric_error","")).is_empty()
	var can_buy := not owned and not numeric_limit and bool(offer.available) and bool(offer.can_afford)
	var price := L10n.text("Locked") if locked else L10n.text("Owned") if owned else L10n.text("Unavailable") if numeric_limit else L10n.text("FREE") if str(offer.cost)=="0" else str(offer.price_text)
	var expected := {"revision":journey.profile.revision,"cost":offer.cost,"level":offer.level}
	var button := _button(price,func(): app.buy_offer(offer.id,expected),not can_buy)
	button.add_theme_font_size_override("font_size",11)
	button.clip_text = true
	button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var inactive := owned or locked or numeric_limit
	var ink := UITheme.MUTED if inactive else Color("a6d7a2") if can_buy else Color("eea291")
	var fill := UITheme.PANEL if inactive else Color("233a31") if can_buy else Color("30252a")
	for state in ["normal","hover","pressed","disabled"]:
		button.add_theme_stylebox_override(state,UITheme.box(fill.lightened(0.08) if state=="hover" and can_buy else fill,ink,1,6))
	for state in ["font_color","font_hover_color","font_pressed_color","font_disabled_color"]:
		button.add_theme_color_override(state,ink)
	var action := L10n.text("Learn") if int(offer.level)==0 and (catalog.skills.has(offer.id) or offer.id=="blackhole") else L10n.text("Upgrade")
	button.tooltip_text = price if inactive else action+" · "+L10n.format("%s parts",[str(offer.price_text)])
	if not can_buy:
		button.focus_mode = Control.FOCUS_NONE
		button.mouse_default_cursor_shape = Control.CURSOR_ARROW
	return button

func _offer_card(offer: Dictionary) -> PanelContainer:
	var locked := _offer_locked(offer)
	var card := PanelContainer.new()
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	card.add_theme_stylebox_override("panel",UITheme.box(UITheme.PANEL,UITheme.BORDER,1,8))
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",4)
	card.add_child(column)
	var heading := HBoxContainer.new()
	heading.add_theme_constant_override("separation",4)
	heading.custom_minimum_size.y = 44
	column.add_child(heading)
	var name_label := _label(_offer_name(offer),12,UITheme.MUTED if locked else UITheme.TEXT)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	name_label.clip_text = true
	name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	heading.add_child(name_label)
	if not locked:
		var info := _button("",func(): _show_offer_details(offer))
		info.custom_minimum_size = Vector2(44,44)
		info.tooltip_text = L10n.text("Details")
		for style in ["normal","hover","pressed","disabled"]:
			info.add_theme_stylebox_override(style,StyleBoxEmpty.new())
		# Keep the full touch target; only the visible info badge is smaller.
		var badge := PanelContainer.new()
		badge.mouse_filter = Control.MOUSE_FILTER_IGNORE
		badge.add_theme_stylebox_override("panel",UITheme.box(UITheme.PANEL,UITheme.GOLD,1,0))
		_place(info,badge,Rect2(13,13,18,18))
		var mark := _label("i",12,UITheme.GOLD)
		mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		mark.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		badge.add_child(mark)
		heading.add_child(info)
	var level_row := HBoxContainer.new()
	level_row.add_theme_constant_override("separation",4)
	column.add_child(level_row)
	var icon_key: String = _skill_icon(str(offer.id)) if catalog.skills.has(offer.id) else "hud-battery" if offer.id=="battery" else "hud-recovery" if offer.id in ["debrisProcessing","salvageYield"] else "tool-blast" if str(offer.id).begins_with("blast") else "tool-blackhole"
	var icon := _hud_icon(icon_key,UITheme.MUTED if locked else UITheme.GOLD)
	icon.custom_minimum_size = Vector2(16,16)
	level_row.add_child(icon)
	var state := _offer_level(offer)
	var equipped: Array = journey.profile.equipped.get(str(offer.kind),[])
	var current_slot := equipped.find(str(offer.id))
	if current_slot >= 0: state += " · "+L10n.format("Slot %d",[current_slot+1])
	var level_label := _label(state,10,UITheme.MINT if current_slot>=0 else UITheme.MUTED)
	level_label.autowrap_mode = TextServer.AUTOWRAP_OFF
	level_label.clip_text = true
	level_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	level_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	level_row.add_child(level_label)
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation",4)
	column.add_child(actions)
	actions.add_child(_offer_purchase(offer))
	if not locked and catalog.skills.has(offer.id) and int(offer.level)>0:
		var equip := _button("Unequip" if current_slot>=0 else "Equip",func():
			if current_slot>=0: app.unequip_skill(offer.id)
			elif equipped.size()<journey.progression.skill_slots(journey.profile,str(offer.kind)): app.equip_skill(offer.id)
			else: _show_offer_details(offer))
		equip.add_theme_font_size_override("font_size",10)
		equip.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		for style in ["normal","hover","pressed","disabled"]:
			equip.add_theme_stylebox_override(style,UITheme.box(UITheme.PANEL,UITheme.BORDER,1,6))
		actions.add_child(equip)
	return card

func _workshop(payload: Dictionary) -> Control:
	_tab = str(payload.get("tab",_tab))
	var page := _page("Upgrades","FIELD WORKSHOP","home",72.0)
	page.heading.text = L10n.format("Upgrades · %s parts",[_number(journey.profile.parts)])
	page.heading.add_theme_font_size_override("font_size",20)
	page.heading.autowrap_mode = TextServer.AUTOWRAP_OFF
	page.heading.clip_text = true
	page.heading.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	page.heading.tooltip_text = page.heading.text
	page.heading.mouse_filter = Control.MOUSE_FILTER_PASS
	var content: VBoxContainer = page.content
	if journey.profile.tutorial == "upgrade":
		content.add_child(_label("FIRST UPGRADE · Spend your first 300 parts to improve Blast.",11,UITheme.GOLD))
		content.add_child(_button("Skip upgrade guide",func(): app.skip_tutorial()))
	var tabs := HBoxContainer.new()
	content.add_child(tabs)
	var available_tabs := [["weapons","Weapons"]]
	if journey.profile.tutorial not in ["upgrade","next"]:
		available_tabs.append(["skills","Skills"])
		available_tabs.append(["utility","Utility"])
	if not available_tabs.any(func(tab): return tab[0] == _tab): _tab = "weapons"
	var current_tab := _tab
	var saved_scroll := int(_workshop_scroll.get(current_tab,0))
	var scroll: ScrollContainer = page.scroll
	scroll.get_v_scroll_bar().value_changed.connect(func(value): _workshop_scroll[current_tab] = int(value))
	page.root.ready.connect(func(): scroll.set_deferred("scroll_vertical",saved_scroll))
	for tab in available_tabs:
		var tab_button := _button(tab[1],func(): app.navigate("workshop",{"tab":tab[0]}),false,tab[0]==_tab)
		tab_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tabs.add_child(tab_button)
	var groups := [{"tab":"weapons","title":"Shockwave","ids":["blastForce","blastRadius","blastReach"]},{"tab":"weapons","title":"Black Hole","ids":["blackhole","wellPull","wellReach","wellDuration","mix","wear"]},{"tab":"utility","title":"Battery & Recovery","ids":["battery","debrisProcessing","salvageYield"]},{"tab":"skills","title":"Passive skills","ids":["aftershock","relay","slam","expand","wave"]},{"tab":"skills","title":"Active skills","ids":["orbital","seismic","gravity","sonic","recharge"]}]
	var offers: Array = journey.offers()
	if _tab == "skills":
		_skill_loadout_summary(content)
	for group in groups:
		if group.tab != _tab: continue
		content.add_child(_label(group.title,14))
		var grid := GridContainer.new()
		grid.columns = 2
		content.add_child(grid)
		for id in group.ids:
			for offer in offers:
				if offer.id != id: continue
				var card := _offer_card(offer)
				card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
				grid.add_child(card)
	var footer := PanelContainer.new()
	var footer_style := UITheme.box(UITheme.BG,UITheme.BORDER,1,0)
	footer_style.border_width_left = 0
	footer_style.border_width_right = 0
	footer_style.border_width_bottom = 0
	footer_style.content_margin_left = 22
	footer_style.content_margin_right = 22
	footer_style.content_margin_top = 10
	footer_style.content_margin_bottom = 14
	footer.add_theme_stylebox_override("panel",footer_style)
	page.root.add_child(footer)
	footer.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	footer.offset_top = -72
	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation",8)
	footer.add_child(actions)
	var choose := _button("Choose a site",func(): app.navigate("maps"),false,true)
	var retry := _button("Retry this map",func(): app.start_run("retry"),journey.last_run_site==null)
	for button in [choose,retry]:
		button.custom_minimum_size.y = 48
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size",12)
		button.clip_text = true
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		actions.add_child(button)
	return page.root

func _receipt(payload: Dictionary) -> Control:
	var title := L10n.text("100% · ALL CLEAR") if payload.get("allClear",false) else L10n.format("%d%% · CLEARED",[floori(float(payload.get("recovered",0))*100.0/maxi(1,int(payload.get("total",1))))]) if payload.get("qualified",false) else L10n.format("%s pixels recovered",[_number(int(payload.get("recovered",0)))])
	var page := _page(title,"SORTIE COMPLETE","workshop")
	if int(payload.get("collectionTier",0))>=70: page.heading.add_theme_color_override("font_color",UITheme.GOLD)
	page.content.add_child(_label(str(payload.get("siteName","")),19,UITheme.GOLD))
	if int(payload.get("regionIndex", 0)) <= 0:
		var illustration := EnvironmentReceipt.new()
		illustration.setup(float(payload.get("ratio", 0.0)))
		page.content.add_child(illustration)
	page.content.add_child(_label(L10n.format("%s recovered · %s parts",[_percent(float(payload.get("ratio",0))),_number(payload.get("reward",0))]),15))
	if str(payload.get("bonus",0))!="0":
		page.content.add_child(_label(L10n.format("First clear bonus: %s parts" if payload.get("firstClear",false) else "Repeat clear bonus: %s parts",[_number(payload.bonus)]),13,UITheme.MINT))
	_refinement_receipt(page.content,payload)
	page.content.add_child(_label("Keep every recovered pixel. Upgrades apply next sortie.",12,UITheme.MUTED))
	page.content.add_child(_button("Upgrade equipment →",func(): app.navigate("workshop"),false,true))
	page.content.add_child(_button("Retry this map",func(): app.start_run("retry")))
	page.content.add_child(_button("Back to planet",func(): app.navigate("home")))
	if app.web_bridge.available(): page.content.add_child(_button("Feedback",func(): app.open_feedback()))
	return page.root

func _refinement_receipt(content: VBoxContainer, payload: Dictionary) -> void:
	if str(payload.get("refinementBonus",0))!="0":
		content.add_child(_label(L10n.format("Resource refining: +%s parts",[_number(payload.refinementBonus)]),13,UITheme.GOLD))

func _chapter(payload: Dictionary) -> Control:
	var index := int(payload.get("regionIndex",app.selected_region))
	var region: Dictionary = catalog.region(index)
	var region_complete: bool = journey.region_progress(index).get("complete", false)
	var page := _page(L10n.format("%s · ALL CLEAR" if region_complete else "%s · CLEARED",[L10n.text(str(region.get("name","")))]),"REGION COMPLETE","workshop")
	if int(payload.get("collectionTier",0))>=70: page.heading.add_theme_color_override("font_color",UITheme.GOLD)
	page.content.add_child(_label(L10n.format("%s recovered · %s parts",[_percent(float(payload.get("ratio",0))),_number(payload.get("reward",0))]),13,UITheme.GOLD))
	if str(payload.get("bonus",0))!="0":
		page.content.add_child(_label(L10n.format("First clear bonus: %s parts" if payload.get("firstClear",false) else "Repeat clear bonus: %s parts",[_number(payload.bonus)]),13,UITheme.MINT))
	_refinement_receipt(page.content,payload)
	var next = payload.get("nextRegion")
	page.content.add_child(_label(L10n.format("%s · Planet %s",[_region_status(index),_percent(journey.planet_progress())]),15,UITheme.MINT))
	page.content.add_child(_label("Next region unlocked! Your parts, tools and upgrades carry over. You can return here for 100% at any time." if next!=null else "You have cleared all six regions of this planet! Replay any region for 100% All Clear.",13))
	if next != null:
		var next_region: Dictionary = catalog.region(int(next))
		page.content.add_child(_label(L10n.format("%s → %s",[L10n.text(region.name),L10n.text(next_region.name)]),18,UITheme.GOLD))
		page.content.add_child(_button(L10n.format("Go to %s →",[L10n.text(next_region.name)]),func():
			app.select_region(int(next))
			app.navigate("maps"),false,true))
	else: page.content.add_child(_button("Back to planet",func(): app.navigate("home"),false,true))
	page.content.add_child(_button("Stay & upgrade",func(): app.navigate("workshop")))
	if app.web_bridge.available(): page.content.add_child(_button("Feedback",func(): app.open_feedback()))
	return page.root

func _audio_options(content: VBoxContainer) -> void:
	content.add_child(_label("Audio & Vibration",16,UITheme.GOLD))
	for entry in [["music","Music"],["effects","Sound effects"],["haptics","Vibration"]]:
		var key: String = entry[0]
		var enabled: bool = feedback.settings.get(key,true)
		var native_vibration: bool = OS.has_feature("ios") or OS.has_feature("android")
		content.add_child(_button(L10n.format("%s · %s",[L10n.text(entry[1]),L10n.text("app only" if key == "haptics" and not native_vibration else "ON" if enabled else "OFF")]),func(): app.set_audio(key,not enabled),key == "haptics" and not native_vibration))
		if key == "haptics": continue
		var volume_key := key+"Volume"
		content.add_child(_label(L10n.format("%s volume",[L10n.text(entry[1])]),12,UITheme.MUTED))
		var line := HBoxContainer.new()
		var slider := HSlider.new()
		slider.min_value = 0
		slider.max_value = 100
		slider.step = 5
		slider.value = float(feedback.settings.get(volume_key,1))*100
		slider.custom_minimum_size.y = 44
		slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var value_label := _label("%d%%" % int(slider.value),12)
		value_label.custom_minimum_size.x = 42
		slider.value_changed.connect(func(value):
			value_label.text = "%d%%" % int(value)
			app.set_audio(volume_key,value/100.0))
		line.add_child(slider)
		line.add_child(value_label)
		content.add_child(line)
	content.add_child(_label({"playing":"Playing · Journey","waiting":"Music starts after your first tap","off":"Music off","paused":"Music paused","unavailable":"Music unavailable · tap to retry"}.get(feedback.status,"Music paused"),11,UITheme.MUTED))

func _settings(payload: Dictionary) -> Control:
	_settings_from = str(payload.get("from","home"))
	var page := _page("Options","SYSTEM · SETUP",_settings_from)
	page.content.add_child(_label("언어 / Language",16,UITheme.GOLD))
	var languages := HBoxContainer.new()
	for entry in [["ko","한국어"],["en","English"]]:
		var language_button := _button(entry[1],func(): app.set_language(entry[0]),L10n.language()==entry[0],L10n.language()==entry[0])
		language_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		languages.add_child(language_button)
	page.content.add_child(languages)
	page.content.add_child(_label("Game skin",16,UITheme.GOLD))
	var skins := HBoxContainer.new()
	for entry in [[1,"Skin 1 · Original"],[2,"Skin 2 · Bright"]]:
		var selected: bool = GameSkin.bright() == (int(entry[0])==2)
		var skin_button := _button(entry[1],func(): app.set_skin(int(entry[0])),selected or journey.current_run!=null,selected)
		skin_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		skin_button.add_theme_font_size_override("font_size",11)
		skins.add_child(skin_button)
	page.content.add_child(skins)
	if journey.current_run!=null: page.content.add_child(_label("Return to camp to change the skin.",11,UITheme.MUTED))
	_audio_options(page.content)
	var stats: Dictionary = journey.stats()
	page.content.add_child(_label("Your equipment",16,UITheme.GOLD))
	for entry in [["Battery",stats.capacity],["Blast radius",stats.bombRadius]]:
		page.content.add_child(_label(L10n.format("%s · %s",[L10n.text(entry[0]),snappedf(float(entry[1]),0.01)]),12))
	page.content.add_child(_label(L10n.format("Debris Processing · %s×",[snappedf(float(stats.debrisProcessing),0.01)]),12))
	page.content.add_child(_label(L10n.format("Resource Refining · +%s%% parts",[snappedf(float(stats.salvageYield)*100.0,0.01)]),12))
	page.content.add_child(_label("Tap to attack. Two fingers move and zoom. On PC, right-drag to move and scroll to zoom.",11,UITheme.MUTED))
	page.content.add_child(_button("Tutorial ↗",func(): app.start_run("training"),journey.current_run!=null))
	page.content.add_child(_button("Import profile",func(): app.import_profile(),journey.current_run!=null))
	page.content.add_child(_button("Export records",func(): app.export_profile()))
	page.content.add_child(_label("Play records are saved on this device only.",10,UITheme.MUTED))
	page.content.add_child(_button("Reset progress",func(): app.show_reset_confirm(),journey.current_run!=null))
	page.content.add_child(_button("Build information",func(): app.navigate("build_info")))
	if app.web_bridge.available(): page.content.add_child(_button("Feedback",func(): app.open_feedback()))
	return page.root

func _pause() -> Control:
	var run = journey.current_run
	var finishing: bool = run!=null and run.phase=="finishing"
	var page := _page(str(run.site.name) if run!=null else "Paused","PAUSE","play")
	page.content.add_child(_label("Reach 70% recovery. Time and battery pause while this menu is open.",13))
	page.content.add_child(_button("Resume recovery" if finishing else "Resume cleanup",func(): app.resume_run(),false,true))
	if not finishing:
		page.content.add_child(_button("Fit map / close view",func():
			if app.play_view!=null: app.play_view.toggle_fit()
			app.resume_run()))
		page.content.add_child(_button("Collect & return · upgrade equipment",func(): app.finish_run()))
	_audio_options(page.content)
	if app.web_bridge.available(): page.content.add_child(_button("Feedback",func(): app.open_feedback()))
	return page.root

func _reset() -> Control:
	var page := _page("Reset your progress?","RESET PROGRESS","settings")
	page.content.add_child(_label("Reset all regions, parts, upgrades and skills. Your progress starts again from the first tutorial. This cannot be undone.",14))
	page.content.add_child(_label("Sound settings, original app saves and other game saves are kept.",12,UITheme.MUTED))
	page.content.add_child(_button("Cancel · keep playing",func(): app.show_settings("home"),false,true))
	page.content.add_child(_button("Reset and start over",func(): app.reset_progress()))
	return page.root

func _import_confirm(payload: Dictionary) -> Control:
	var page := _page("Import profile","SAVE TRANSFER","settings")
	var preview: Dictionary = payload.get("preview",{})
	page.content.add_child(_label("Review this profile before replacing your Godot progress. Your current Godot save will be backed up first.",13))
	var names := {"parts":"Parts","runCount":"Sorties","revision":"Save revision","resetCount":"Resets"}
	for key in ["parts","runCount","revision","resetCount"]:
		page.content.add_child(_label(L10n.format("%s · %s",[L10n.text(names[key]),_number(preview.get(key,0))]),13))
	page.content.add_child(_label(L10n.format("Planet · %s",[_percent(float(preview.get("planetProgress",0)))]),13,UITheme.MINT))
	page.content.add_child(_button("Import this profile",func(): app.import_profile(),false,true))
	page.content.add_child(_button("Cancel",func(): app.show_settings("home")))
	return page.root

func _error(payload: Dictionary) -> Control:
	var page := _page("Could not continue","CONTENT / SAVE NOTICE")
	page.content.add_child(_label(str(payload.get("message",app.notice if not app.notice.is_empty() else "Required content could not be read. Your saved progress has been kept.")),14))
	page.content.add_child(_button("Back to planet",func(): app.navigate("home")))
	page.content.add_child(_button("Export records",func(): app.export_profile()))
	return page.root

func _build_info() -> Control:
	var page := _page("Build information","PLANET PATCHUP · GODOT","settings")
	page.content.add_child(_label(L10n.format("Planet Patchup · 0.5.41\nGodot 4.6.2 · Compatibility\n6 regions · 42 maps + tutorial\n%d upgrade tracks · %d skills",[catalog.tracks.size(),catalog.skills.size()]),14))
	page.content.add_child(_label("Content source hashes are included with this build. Gameplay and device confirmation are recorded separately.",12,UITheme.MUTED))
	page.content.add_child(_button("Export records",func(): app.export_profile()))
	return page.root

func _diagnostic_tap() -> void:
	var now := Time.get_ticks_msec()
	while not _diagnostic_taps.is_empty() and now - _diagnostic_taps[0] > 3000:
		_diagnostic_taps.pop_front()
	_diagnostic_taps.append(now)
	if _diagnostic_taps.size() == 5:
		_diagnostic_taps.clear()
		_apply_diagnostics_toggle.call_deferred()

func _apply_diagnostics_toggle() -> void:
	var enabled := not Diagnostics.is_enabled()
	Diagnostics.set_enabled(enabled)
	if is_instance_valid(app.play_view) and is_instance_valid(app.play_view.world):
		app.play_view.world.perf.set_enabled(enabled)
	if is_instance_valid(_hud.get("performance_panel")):
		_hud.performance_panel.visible = enabled
		_hud.performance.text = "성능 진단 · 측정 대기"
		_performance_updated = 0
		_hud.layout.call()

func _play_hud() -> Control:
	_diagnostic_taps.clear()
	var bright := GameSkin.bright()
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var top := ColorRect.new()
	top.color = GameSkin.hud("cream")
	top.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(top)
	var control_strip := ColorRect.new()
	control_strip.color = GameSkin.hud("sand")
	control_strip.mouse_filter = Control.MOUSE_FILTER_STOP
	root.add_child(control_strip)
	var battery_icon := _hud_icon("hud-battery",UITheme.HUD_INK)
	var recovery_icon := _hud_icon("hud-recovery",UITheme.HUD_INK)
	root.add_child(battery_icon)
	root.add_child(recovery_icon)
	var recovery := _label("0%",17,UITheme.HUD_INK)
	var metric := _label("PIXELIZED",8,UITheme.HUD_INK)
	metric.autowrap_mode = TextServer.AUTOWRAP_OFF
	root.add_child(metric)
	var battery := _label("100%",17,UITheme.HUD_INK)
	recovery.autowrap_mode = TextServer.AUTOWRAP_OFF
	battery.autowrap_mode = TextServer.AUTOWRAP_OFF
	root.add_child(recovery)
	root.add_child(battery)
	var diagnostic_button := Button.new()
	diagnostic_button.flat = true
	diagnostic_button.focus_mode = Control.FOCUS_NONE
	diagnostic_button.mouse_filter = Control.MOUSE_FILTER_STOP
	for state in ["normal", "hover", "pressed", "focus"]:
		diagnostic_button.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	diagnostic_button.pressed.connect(_diagnostic_tap)
	root.add_child(diagnostic_button)
	var recovery_bar := ProgressBar.new()
	recovery_bar.show_percentage = false
	recovery_bar.visible = false
	root.add_child(recovery_bar)
	var battery_bar := ProgressBar.new()
	battery_bar.show_percentage = false
	battery_bar.visible = false
	root.add_child(battery_bar)
	var pause := _flat(_button("Ⅱ",func(): app.pause_run()),UITheme.HUD_INK)
	pause.add_theme_font_size_override("font_size",20)
	root.add_child(pause)
	var minimap := TextureRect.new()
	minimap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	minimap.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	minimap.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var fit := _button("",func():
		if app.play_view!=null: app.play_view.toggle_fit())
	fit.tooltip_text = L10n.text("Fit map / close view")
	fit.modulate.a = 0.8
	for state in ["normal","hover","pressed","disabled"]:
		fit.add_theme_stylebox_override(state,UITheme.box(Color.TRANSPARENT if bright else Color("e8e2c8"),GameSkin.hud("ink") if bright else Color("899479"),1,0))
	if bright:
		fit.modulate.a = 1.0
	root.add_child(fit)
	_place(fit,minimap,Rect2(4,3,64,44))
	var notice_panel := PanelContainer.new()
	notice_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	notice_panel.add_theme_stylebox_override("panel",UITheme.box(Color("162b31"),Color("bb9d62"),1,8))
	var notice_scroll := ScrollContainer.new()
	notice_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	notice_scroll.follow_focus = true
	notice_panel.add_child(notice_scroll)
	var notice_label := _label("",11,Color("f6e4b8"))
	notice_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	notice_scroll.add_child(notice_label)
	notice_panel.visible = false
	root.add_child(notice_panel)
	var performance_panel := PanelContainer.new()
	performance_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	performance_panel.add_theme_stylebox_override("panel",UITheme.box(Color(0.035,0.065,0.09,0.94),Color("bca367"),1,6))
	var performance := _label("성능 진단 Godot v34 · 측정 대기",11,Color("fff0cd"))
	performance.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	performance_panel.add_child(performance)
	performance_panel.visible = Diagnostics.is_enabled()
	root.add_child(performance_panel)
	_performance_updated = 0
	var tool_ids := ["blast"]
	if is_instance_valid(app.play_view) and app.play_view.profile.owned.has("blackhole"):
		tool_ids.append("blackhole")
	var tools: Array[Dictionary] = []
	for id: String in tool_ids:
		var button := _button("",func():
			if is_instance_valid(app.play_view):
				app.play_view.select_tool(id)
				update_hud(app.play_view))
		button.toggle_mode = true
		UITheme.hud_button(button)
		var selected := UITheme.box(Color("e9d5a5"),Color("a16a20"),2,0)
		button.add_theme_stylebox_override("pressed",selected)
		button.add_theme_stylebox_override("hover_pressed",selected)
		root.add_child(button)
		var icon := _hud_icon("tool-blackhole" if id=="blackhole" else "tool-blast",Color("a16a20"))
		_place(button,icon,Rect2(14,8,28,28))
		var label := _label("Black Hole" if id=="blackhole" else "Shockwave",9,GameSkin.hud("ink"))
		label.autowrap_mode = TextServer.AUTOWRAP_OFF
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.clip_text = true
		_place(button,label,Rect2(0,39,56,12))
		button.tooltip_text = label.text
		tools.append({"id":id,"button":button,"icon":icon,"label":label})
	var passive_slots: Array = []
	for slot in range(2):
		var panel := PanelContainer.new()
		panel.mouse_filter = Control.MOUSE_FILTER_PASS
		panel.add_theme_stylebox_override("panel",UITheme.box(Color("f5ebd0") if bright else Color(0.208,0.263,0.204,0.92),Color("b2b393") if bright else Color("859075"),1 if bright else 2,4))
		panel.visible = false
		root.add_child(panel)
		var column := VBoxContainer.new()
		column.mouse_filter = Control.MOUSE_FILTER_IGNORE
		column.add_theme_constant_override("separation",4)
		panel.add_child(column)
		var row := HBoxContainer.new()
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.size_flags_vertical = Control.SIZE_EXPAND_FILL
		row.add_theme_constant_override("separation",4)
		column.add_child(row)
		var icon := _hud_icon("passive-aftershock",Color("be861f") if bright else UITheme.HUD_PALE)
		icon.custom_minimum_size = Vector2(22,22)
		row.add_child(icon)
		var counter := _label("0/3",11,GameSkin.hud("ink") if bright else UITheme.HUD_PALE)
		counter.autowrap_mode = TextServer.AUTOWRAP_OFF
		counter.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		row.add_child(counter)
		var meter := ProgressBar.new()
		meter.mouse_filter = Control.MOUSE_FILTER_IGNORE
		meter.show_percentage = false
		meter.custom_minimum_size.y = 3
		if bright:
			meter.add_theme_stylebox_override("background",UITheme.box(Color("d6cfb5"),Color.TRANSPARENT,0,0))
			meter.add_theme_stylebox_override("fill",UITheme.box(Color("d1a346"),Color.TRANSPARENT,0,0))
		column.add_child(meter)
		passive_slots.append({"panel":panel,"icon":icon,"counter":counter,"meter":meter})
	var active_slots: Array = []
	for slot in range(2):
		var button := _button("",func():
			if app.play_view!=null and _hud.has("actives"):
				var id := str(_hud.actives[slot].id)
				if not id.is_empty(): app.play_view.activate_skill(id))
		UITheme.hud_button(button)
		button.visible = false
		root.add_child(button)
		var icon := _hud_icon("active-orbital-drop",UITheme.HUD_INK)
		_place(button,icon,Rect2(10,10,28,28))
		active_slots.append({"id":"","button":button,"icon":icon})
	var tutorial := _label("",12,UITheme.GOLD)
	root.add_child(tutorial)
	var skip := _button("Skip guide",func(): app.skip_run_guide())
	skip.add_theme_font_size_override("font_size",10)
	skip.visible = false
	root.add_child(skip)
	var tip_panel := PanelContainer.new()
	tip_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tip_panel.add_theme_stylebox_override("panel",UITheme.box(GameSkin.hud("sand"),Color.TRANSPARENT if bright else Color("b3b592"),0 if bright else 1,2 if bright else 7))
	var tip := _label("Tap without moving to attack",11,UITheme.HUD_INK)
	if bright:
		tip.autowrap_mode = TextServer.AUTOWRAP_OFF
		tip.clip_text = true
		tip.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tip_panel.add_child(tip)
	root.add_child(tip_panel)
	var skip_wait := _button("Skip now",func():
		if journey.current_run != null and journey.current_run.skip_collection_wait() and _hud.has("skip_wait"):
			_hud.skip_wait.hide(),false,true)
	skip_wait.visible = false
	skip_wait.tooltip_text = L10n.text("Start pixel recovery")
	root.add_child(skip_wait)
	var layout := func():
		var width: float = root.size.x
		var height: float = root.size.y
		top.position = Vector2.ZERO
		top.size = Vector2(width,PlayLayout.TOP)
		var finishing: bool = journey.current_run!=null and journey.current_run.phase=="finishing"
		var controls_height := PlayLayout.controls_height(root.size,finishing)
		var controls_top := height-controls_height
		skip_wait.size = Vector2(minf(180,width-32),48)
		skip_wait.position = Vector2((width-skip_wait.size.x)/2.0,(PlayLayout.TOP+controls_top-skip_wait.size.y)/2.0)
		control_strip.position = Vector2(0,controls_top)
		control_strip.size = Vector2(width,controls_height)
		battery_icon.position = Vector2(12,15)
		battery_icon.size = Vector2(24,24)
		battery.position = Vector2(43,13)
		battery.size = Vector2(72,28)
		diagnostic_button.position = Vector2(36,5)
		diagnostic_button.size = Vector2(79,44)
		recovery_icon.position = Vector2(width-171,15)
		recovery_icon.size = Vector2(24,24)
		recovery.position = Vector2(width-140,6)
		recovery.size = Vector2(72,28)
		metric.position = Vector2(width-140,34)
		metric.size = Vector2(80,14)
		pause.position = Vector2(width-56,10)
		pause.size = Vector2(44,44)
		performance_panel.position = Vector2(8,PlayLayout.TOP+4)
		performance_panel.size = Vector2(width-16,184)
		var diagnostic_height := performance_panel.size.y+4 if performance_panel.visible else 0.0
		fit.position = Vector2(width-80,62+diagnostic_height)
		fit.size = Vector2(72,50)
		notice_panel.position = Vector2(16,64+diagnostic_height)
		notice_panel.size = Vector2(minf(245,maxf(120,width-145)),68)
		var tip_height := 24.0 if bright else clampf(tip.get_minimum_size().y+16,30,maxf(30,controls_height-76))
		tip_panel.position = Vector2(8,height-8-tip_height)
		tip_panel.size = Vector2(width-16,tip_height)
		var narrow := width < 390
		var margin := 8.0 if narrow else 16.0
		var gap := 4.0 if narrow else 8.0
		var tool_width := 48.0 if narrow else 56.0
		var left := margin
		for control in tools:
			control.button.position = Vector2(left,controls_top+8)
			control.button.size = Vector2(tool_width,56)
			control.icon.position.x = (tool_width-28)/2.0
			control.label.size.x = tool_width
			left += tool_width+gap
		var passive_count := 0
		var active_count := 0
		for slot in passive_slots:
			passive_count += int(slot.panel.visible)
		for slot in active_slots:
			active_count += int(slot.button.visible)
		var active_width := 44.0 if narrow else 48.0
		var available := width-left-margin-active_count*active_width-gap*maxi(0,passive_count+active_count-1)
		var passive_width := minf(100.0,maxf(0.0,available/maxi(1,passive_count)))
		for slot in passive_slots:
			if not slot.panel.visible: continue
			var icon_size := 16.0 if passive_width<56 else 22.0
			slot.icon.custom_minimum_size = Vector2(icon_size,icon_size)
			slot.panel.position = Vector2(left,controls_top+8)
			slot.panel.size = Vector2(passive_width,56)
			left += passive_width+gap
		for slot in active_slots:
			if not slot.button.visible: continue
			slot.button.position = Vector2(left,controls_top+12)
			slot.button.size = Vector2(active_width,48)
			slot.icon.position.x = (active_width-28)/2.0
			left += active_width+gap
		var tutorial_y := 72.0 if width > height else 164.0
		if performance_panel.visible:
			tutorial_y = maxf(tutorial_y,PlayLayout.TOP+diagnostic_height+12)
		if notice_panel.visible:
			tutorial_y = maxf(tutorial_y,144+diagnostic_height)
		tutorial.position = Vector2(16,tutorial_y)
		var skip_x := minf(240,maxf(160,width-150))
		tutorial.size = Vector2(skip_x-28 if skip.visible else minf(350,width-32),78)
		skip.position = Vector2(skip_x,tutorial_y+14)
		skip.size = Vector2(120,44)
	root.resized.connect(layout)
	root.ready.connect(layout)
	_hud["performance"] = performance
	_hud["performance_panel"] = performance_panel
	_hud.merge({"recovery":recovery,"metric":metric,"battery":battery,"recovery_bar":recovery_bar,"battery_bar":battery_bar,"tools":tools,"passives":passive_slots,"actives":active_slots,"tutorial":tutorial,"minimap":minimap,"fit":fit,"tip":tip,"notice":notice_label,"notice_panel":notice_panel,"skip_guide":skip,"skip_wait":skip_wait,"layout":layout})
	return root

func update_hud(play_view) -> void:
	if play_view == null or not is_instance_valid(play_view.world):
		return
	var probe = play_view.world.perf
	probe.begin(probe.HUD)
	_update_hud_unprofiled(play_view)
	probe.end()

func _update_hud_unprofiled(play_view) -> void:
	if _hud.is_empty() or play_view==null or play_view.world==null or not is_instance_valid(_hud.get("recovery")):
		return
	var world = play_view.world
	if world.perf.enabled and Time.get_ticks_msec() - _performance_updated >= 250:
		_performance_updated = Time.get_ticks_msec()
		_hud.performance.text = world.perf.report()
	var run = play_view.run
	var finishing: bool = run!=null and run.phase=="finishing"
	var preparing: bool = finishing and not run.collection_started()
	_hud.skip_wait.visible = preparing and run.can_skip_collection_wait()
	var pixel_count: int = run.recovered() if finishing else run.pixelized() if run!=null else 0
	var pixel_total: int = maxi(1,run.total()) if run!=null else 1
	var progress := float(pixel_count)/pixel_total
	_hud.recovery.text = "" if preparing else "%d%%" % clampi(floori(float(pixel_count)*100.0/pixel_total),0,100)
	_hud.metric.text = L10n.text("Settling debris" if preparing else "RECOVERED" if finishing else "PIXELIZED")
	_hud.fit.visible = not finishing
	_hud.battery.text = "%d%%" % ceili(float(world.charge)/maxf(1,float(world.stats.capacity))*100)
	_hud.recovery_bar.value = progress*100
	_hud.battery_bar.value = float(world.charge)/maxf(1,float(world.stats.capacity))*100
	var tools_disabled: bool = run==null or run.paused or run.finish_ready or run.phase!="working"
	for control in _hud.tools:
		control.button.visible = not finishing
		control.button.disabled = tools_disabled
		control.button.set_pressed_no_signal(play_view.tool == control.id)
		control.button.modulate.a = 0.6 if tools_disabled else 1.0
	var state: Dictionary = run.skill_state() if run!=null else {}
	var passives: Array = state.get("passives",[])
	for slot in range(_hud.passives.size()):
		var chip: Dictionary = _hud.passives[slot]
		chip.panel.visible = not finishing and slot < passives.size()
		if slot >= passives.size(): continue
		var passive: Dictionary = passives[slot]
		var id := str(passive.get("id",""))
		var count := int(passive.get("count",0))
		var threshold := int(passive.get("threshold",0))
		var name := L10n.text(str(catalog.skills.get(id,{}).get("name","")))
		chip.icon.texture = catalog.texture(_skill_icon(id))
		chip.counter.text = "%d/%d" % [count,threshold]
		chip.meter.value = float(count)/maxi(1,threshold)*100.0
		chip.panel.tooltip_text = L10n.format("%s · %d/%d effective Blasts",[name,count,threshold])
	var actives: Array = state.get("actives",[])
	for slot in range(_hud.actives.size()):
		var control: Dictionary = _hud.actives[slot]
		control.button.visible = not finishing and slot < actives.size()
		control.id = ""
		if slot >= actives.size(): continue
		var active: Dictionary = actives[slot]
		var id := str(active.get("id",""))
		control.id = id
		control.icon.texture = catalog.texture(_skill_icon(id))
		control.button.disabled = not active.get("available",false)
		var used := int(active.get("used",0))>0
		var status := L10n.text("Used" if used else "Ready" if active.get("available",false) else "Unavailable")
		var name := L10n.text(str(catalog.skills.get(id,{}).get("name","")))
		control.button.tooltip_text = L10n.format("%s · %s",[name,status])
		control.button.modulate.a = 0.45 if used else 0.6 if control.button.disabled else 1.0
	if not finishing: _hud.minimap.texture = play_view.minimap_texture()
	var warnings: PackedStringArray = []
	if not app.notice.is_empty():
		warnings.append(L10n.text(app.notice))
	if not journey.journal.warning.is_empty():
		warnings.append(L10n.text(journey.journal.warning))
	_hud.notice.text = "\n".join(warnings)
	_hud.notice_panel.visible = not warnings.is_empty()
	_hud.tutorial.text = ""
	_hud.skip_guide.visible = false
	if run!=null and run.guide!=null:
		var stage: String = run.guide.stage
		_hud.skip_guide.visible = stage not in ["work","done"]
		_hud.tutorial.text = L10n.text({"aim":"1 · Blast a column\nTap and release without moving. Two fingers move and zoom.","collapse":"2 · Watch it collapse\nWeak columns cannot carry the weight above.","collect":"3 · Use the remaining battery\nLoose pixels gather automatically when it runs out.","work":"Keep breaking fragments\nMore mint pixels means more parts to recover."}.get(stage,""))
	var complete: bool = run!=null and run.finish_ready
	_hud.tutorial.visible = not finishing and not complete
	if finishing or complete: _hud.skip_guide.visible = false
	if complete:
		_hud.tip.text = L10n.text("Collection complete · Returning to camp…")
	elif finishing:
		_hud.tip.text = L10n.text("Recovering pixels" if run.collection_started() else "Settling debris")
	elif run!=null:
		var tips: Array = BRIGHT_PLAY_TIPS if GameSkin.bright() else PLAY_TIPS
		var index := floori(float(run.work_ms)/5000.0)%tips.size()
		_hud.tip.text = L10n.text(tips[index])
	_hud.layout.call()
