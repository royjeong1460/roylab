extends RefCounted

const UITheme = preload("res://app/ui_theme.gd")
const PlanetHome = preload("res://presentation/planet_home.gd")
const TutorialIntro = preload("res://presentation/tutorial_intro.gd")
const StorySequence = preload("res://presentation/story_sequence.gd")
const EnvironmentReceipt = preload("res://presentation/environment_receipt.gd")
const L10n = preload("res://app/localization.gd")
const GameSkin = preload("res://app/skin.gd")
const PlayLayout = preload("res://app/play_layout.gd")
const Diagnostics = preload("res://platform/diagnostics.gd")
const OfferPopup = preload("res://app/offer_popup.gd")
const RestorationGallery = preload("res://app/restoration_gallery.gd")
const WorkshopMenu = preload("res://app/workshop_menu.gd")
const MenuPages = preload("res://app/menu_pages.gd")
const PLAY_TIPS := [
	"Tap and release without moving to attack. Two fingers move and zoom.",
	"Mint-colored scrap is recovered when the battery runs out.",
	"Use two fingers to move and zoom. On PC, right-drag and use the mouse wheel.",
	"Spend recovered scrap on upgrades before your next sortie.",
	"When the battery runs out, all loose scrap gathers at the center.",
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
var _workshop_menu := WorkshopMenu.new()
var _menu_pages := MenuPages.new()
var _offer_popup: Control
var _art_popup: Control
var _art_gallery: Control
var _menu_theme: Theme
var _settings_from := "home"
var _performance_updated := 0
var _attack_trace_updated := 0
var _diagnostic_taps: Array[int] = []

func setup(application, source_catalog, source_journey, source_feedback) -> void:
	app = application
	catalog = source_catalog
	journey = source_journey
	feedback = source_feedback
	_menu_theme = UITheme.make(catalog,true)
	_workshop_menu.setup(self)
	_menu_pages.setup(self)

func close_popup() -> bool:
	if is_instance_valid(_art_popup):
		if _art_popup.close_popup(): return true
		_art_popup.close()
		_art_popup = null
		return true
	if is_instance_valid(_art_gallery) and _art_gallery.close_popup():
		return true
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

func _composition(home := false, teal := false) -> Dictionary:
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if teal: root.theme = _menu_theme
	var background := ColorRect.new()
	background.color = UITheme.MENU_BG if teal else UITheme.BG
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
		var factor := maxf(0.01,minf(1.0,root.size.x / 390.0))
		fixed.size = Vector2(390,clampf(root.size.y / factor,540,844))
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

func _page(title: String, _kicker := "", back := "home", footer_height := 0.0, teal := false) -> Dictionary:
	var page := _composition(false,teal)
	var fixed: Control = page.fixed
	var heading := _label(title,20)
	heading.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	heading.autowrap_mode = TextServer.AUTOWRAP_OFF
	heading.clip_text = true
	heading.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	var close := _flat(_button("‹", func():
		if back == "play": app.resume_run()
		else: app.navigate(back)))
	close.add_theme_font_size_override("font_size",26)
	close.tooltip_text = L10n.text("Back")
	_place(fixed,close,Rect2(12,16,44,44))
	_place(fixed,heading,Rect2(66,16,302,44))
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.scroll_deadzone = 8
	scroll.follow_focus = true
	_place(fixed,scroll,Rect2(22,84,346,730))
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation",12)
	scroll.add_child(content)
	var fit_scroll := func():
		scroll.size = Vector2(346,maxf(0,fixed.size.y-scroll.position.y-maxf(18,footer_height+12)))
	fixed.resized.connect(fit_scroll)
	page.root.ready.connect(fit_scroll)
	page.root.ready.connect(func():
		for button in content.find_children("*","Button",true,false):
			button.mouse_filter = Control.MOUSE_FILTER_PASS)
	page.content = content
	page.scroll = scroll
	page.heading = heading
	page.back_button = close
	if not app.notice.is_empty(): content.add_child(_label(app.notice,12,Color("f1ce88")))
	if not journey.journal.warning.is_empty(): content.add_child(_label(journey.journal.warning,12,Color("f1ce88")))
	return page

func _percent(ratio: float) -> String:
	return String.num(floorf(ratio * 1000.0 + 0.00000001) / 10.0,1)+"%"

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
		"restoration": return _restoration(payload)
		"tutorial_intro": return _tutorial_intro()
		"presentation_preview": return _presentation_preview()
		"presentation_sequence": return _presentation_sequence(payload)
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

func _tutorial_intro() -> Control:
	var intro := TutorialIntro.new()
	intro.setup(catalog, app.lifecycle)
	intro.finished.connect(app.complete_tutorial_intro)
	return intro

func _presentation_preview() -> Control:
	var page := _page("Presentation preview", "", "home", 0.0, true)
	page.content.add_child(_label("Preview only · Progress is unchanged.", 12, UITheme.MUTED))
	page.content.add_child(_button("Ending · 15 seconds", func(): app.show_presentation("ending"), false, true))
	page.content.add_child(_label("Region transitions · 3 seconds", 16, UITheme.GOLD))
	for index in range(5):
		var from := L10n.text(str(catalog.region(index).name))
		var to := L10n.text(str(catalog.region(index + 1).name))
		page.content.add_child(_button(from + " → " + to, func(): app.show_presentation("transition", index)))
		page.content.add_child(_label(StorySequence.TRANSITIONS[index], 13, UITheme.MUTED))
	return page.root

func _presentation_sequence(payload: Dictionary) -> Control:
	var sequence := StorySequence.new()
	sequence.setup(catalog, app.lifecycle, str(payload.get("kind", "ending")), int(payload.get("region", 0)))
	sequence.finished.connect(func(): app.navigate("presentation_preview"))
	return sequence

func _home() -> Control:
	var page := _composition(true,true)
	var fixed: Control = page.fixed
	var planet := PlanetHome.new()
	_place(fixed, planet, Rect2(0,0,390,844))
	planet.setup(catalog)
	planet.update_profile(journey.profile)
	planet.set_selected(app.selected_region)
	planet.region_selected.connect(func(index): app.select_region(index))
	var home_wallet := HBoxContainer.new()
	home_wallet.alignment = BoxContainer.ALIGNMENT_BEGIN
	var money_icon := _hud_icon("hud-recovery",UITheme.GOLD)
	money_icon.custom_minimum_size = Vector2(16,16)
	home_wallet.add_child(money_icon)
	var held := _label(_number(journey.profile.parts),14,UITheme.GOLD)
	held.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	held.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	held.autowrap_mode = TextServer.AUTOWRAP_OFF
	held.clip_text = true
	held.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	held.tooltip_text = held.text
	home_wallet.add_child(held)
	_place(fixed,home_wallet,Rect2(24,18,240,44))
	var options := _flat(_button("▦",func(): app.show_settings("home")),Color("a9beb7"))
	_place(fixed,options,Rect2(326,18,44,44))
	var subtitle := _label("Save the planet!",13,Color("b5c4b9"))
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_place(fixed, subtitle, Rect2(0,80,390,24))
	var title := _label("PLANET\nPATCHUP",30,UITheme.TEXT)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
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
	var name_label := _label(str(region.get("name","")) if journey.region_open(app.selected_region) else "Undiscovered",14,Color("f4dfaf"))
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
	var summary := _label(region_status,12,Color("bfcdc2"))
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
		if app.selected_region == 0 and journey.profile.tutorial == "intro": app.start_run("tutorial")
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
	var achievements := _flat(_button("Achievements",func(): app.navigate("restoration")),Color("bdcdc0"))
	var menu := HBoxContainer.new()
	menu.add_theme_constant_override("separation",8)
	menu.custom_minimum_size.y = 44
	footer.add_child(menu)
	for button in [upgrades,regions,achievements]:
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.clip_text = true
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.tooltip_text = button.text
		button.add_theme_font_size_override("font_size",13)
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
		subtitle.position.y = 148 if compact else 160
		subtitle.size.x = width
		title.position.y = 76 if compact else 84
		title.size = Vector2(width,66 if compact else 72)
		title.add_theme_font_size_override("font_size",26 if compact else 30)
		# One measured stack owns the footer; no overlapping absolute child positions.
		var margin := 16.0 if width < 350 else 24.0
		footer.position = Vector2(margin,height-246)
		footer.size = Vector2(maxf(1,width-margin*2),230)
		name_label.add_theme_font_size_override("font_size",13 if width < 350 else 14)
		summary.add_theme_font_size_override("font_size",12)
		if home_notice != null:
			home_notice.position.y = 180 if compact else 207
			home_notice.size.x = width-48
	fixed.resized.connect(layout_home)
	page.root.ready.connect(layout_home)
	return page.root

func _regions() -> Control:
	return _menu_pages.regions()

func _maps() -> Control:
	return _menu_pages.maps()

func _offer_description(offer: Dictionary, show_next := true) -> String:
	var id := str(offer.id)
	var level := int(offer.level)
	if offer.has("description_key"):
		var args: Array = offer.get("description_args",[]).duplicate()
		for index in args.size():
			if args[index] is String: args[index] = L10n.text(args[index])
		var effect := L10n.format(str(offer.description_key),args)
		# Track descriptions already contain their current → next values and units.
		if not show_next or catalog.tracks.has(id) or id=="blackhole": return effect
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

func _gear_unlock_hint(id: String) -> String:
	var unlock: Dictionary = journey.progression.gear_unlock_info(id)
	var needed := int(unlock.get("clears",0))
	var region_name := L10n.text(str(unlock.get("region_name","")))
	if needed == 0:
		return L10n.format("Open %s to unlock.",[region_name])
	var cleared: int = journey.progression.normal_clears(journey.profile,int(unlock.get("region",0)))
	return L10n.format("%s · %d/%d normal sites at 70%%",[region_name,mini(cleared,needed),needed])

func _skill_equip_controls(column: VBoxContainer, id: String) -> void:
	var kind := str(catalog.skills[id].kind)
	var equipped: Array = journey.profile.equipped.get(kind,[])
	if id in equipped:
		column.add_child(_label("Equipped",12,UITheme.MINT))
		column.add_child(_button("Unequip",func(): app.unequip_skill(id)))
	else:
		column.add_child(_button("Equip",func(): _workshop_menu.show_equip(id)))

func _offer_name(offer: Dictionary) -> String:
	return L10n.text(str({"blastForce":"Impact Power","blastRadius":"Break Radius","blastReach":"Shock Reach","wellPull":"Pull","wellReach":"Pull Range","wellDuration":"Duration","mix":"Core Mixing","wear":"Grinding","battery":"Battery","debrisProcessing":"Debris Processing","salvageYield":"Resource Refining"}.get(str(offer.id),offer.name)))

func _offer_hint(offer: Dictionary) -> String:
	if _offer_owned(offer): return ""
	if not str(offer.get("numeric_error","")).is_empty():
		return L10n.text("Unable to calculate the next upgrade safely. Your scrap is unchanged.")
	if (catalog.skills.has(offer.id) or offer.id=="blackhole") and not journey.progression.gear_available(journey.profile,str(offer.id)):
		return _gear_unlock_hint(str(offer.id))
	if not offer.available and not _offer_owned(offer):
		return L10n.text("Learn Black Hole first.")
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
		"blastRadius":"Widens the central area that breaks scrap loose directly.",
		"blastReach":"Carries the impact farther from the center to nearby fragments.",
		"blackhole":"Pulls loose material inward, then grinds pieces through sustained contact.",
		"wellPull":"Pulls nearby pieces toward the black hole more strongly.",
		"wellReach":"Widens the area affected by the black hole.",
		"wellDuration":"Keeps the black hole active longer.",
		"mix":"Stirs pieces more strongly inside the black hole.",
		"wear":"Raises the maximum grinding strength during sustained contact.",
		"battery":"Increases the energy available for each sortie.",
		"debrisProcessing":"Helps fragments break into scrap on impact. Does not change direct attacks or falling speed.",
		"salvageYield":"Increases the scrap reward based on recovery. Recovery rate and boss bonuses stay the same."
	}.get(id,"")))

func open_unlock_intro(id: String) -> void:
	for offer in journey.offers():
		if offer.id == id and journey.progression.gear_available(journey.profile,id):
			_show_offer_details(offer,true)
			return

func _show_offer_details(offer: Dictionary, intro := false) -> void:
	close_popup()
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	var id := str(offer.id)
	if not intro:
		column.add_child(_label(_offer_level(offer),12,UITheme.MUTED))
	column.add_child(_label(_offer_summary(id),13))
	column.add_child(_label(_offer_description(offer,not intro),13,UITheme.GOLD))
	if not intro and not _offer_owned(offer) and str(offer.get("numeric_error","")).is_empty():
		column.add_child(_label(L10n.format("%s scrap",[str(offer.price_text)]),12,UITheme.MINT if offer.can_afford else Color("eea291")))
	var hint := _offer_hint(offer)
	if not hint.is_empty(): column.add_child(_label(hint,12,UITheme.MUTED))
	if not intro and not _offer_owned(offer):
		column.add_child(_offer_purchase(offer,true))
	if catalog.skills.has(id):
		var usage := "Passives trigger from effective Blasts. Each active can be used once per sortie while battery remains. Skills use no battery."
		if intro:
			usage = "Equip this skill. It triggers automatically when its Blast counter fills." if offer.kind=="passive" else "Equip this skill, then tap its button in the field once per sortie while battery remains."
		column.add_child(_label(usage,11,UITheme.MUTED))
		if not intro and journey.progression.skill_slots(journey.profile)<2:
			var region_name := L10n.text(str(catalog.region(1).get("name","")))
			column.add_child(_label(L10n.format("Open %s to unlock a second passive slot and a second active slot.",[region_name]),11,UITheme.MUTED))
		if int(offer.level)>0: _skill_equip_controls(column,id)
	elif not intro:
		column.add_child(_label("Upgrades apply next sortie. Save scrap or spend it here.",11,UITheme.MUTED))
	if intro:
		if id=="blackhole":
			column.add_child(_label("Select Black Hole in the field, then aim where you want to pull debris.",11,UITheme.MUTED))
		if int(offer.level)==0:
			column.add_child(_offer_purchase(offer,true))
			if not offer.can_afford:
				column.add_child(_label("Not enough scrap.",11,UITheme.MUTED))
		elif _offer_owned(offer) or id in journey.profile.equipped.get(offer.kind,[]):
			column.add_child(_button("Try on this site →",func(): app.start_run("retry"),false,true))
		var tab := "weapons" if id=="blackhole" else "skills"
		column.add_child(_button("Open weapons tab →" if id=="blackhole" else "Open skills tab →",
			func(): app.navigate("workshop",{"from_result":true,"tab":tab})))
	var popup := OfferPopup.new()
	popup.configure(_offer_name(offer),column)
	_offer_popup = popup
	popup.closed.connect(func():
		if _offer_popup == popup: _offer_popup = null)
	app.view.add_child(popup)

func _offer_purchase(offer: Dictionary, show_action := false) -> Button:
	var owned := _offer_owned(offer)
	var locked := _offer_locked(offer)
	var numeric_limit := not str(offer.get("numeric_error","")).is_empty()
	var can_buy := not owned and not numeric_limit and bool(offer.available) and bool(offer.can_afford)
	var inactive := owned or locked or numeric_limit
	var price := L10n.text("Locked") if locked else L10n.text("Owned") if owned else L10n.text("Unavailable") if numeric_limit else L10n.text("FREE") if str(offer.cost)=="0" else str(offer.price_text)
	var full_price := price if str(offer.cost)=="0" else L10n.format("%s scrap",[str(offer.price_text)])
	var action_name := "Learn · %s" if int(offer.level)==0 and (catalog.skills.has(offer.id) or offer.id=="blackhole") else "Upgrade · %s"
	var label := L10n.format(action_name,[full_price]) if show_action and not inactive else price
	var expected := {"revision":journey.profile.revision,"cost":offer.cost,"level":offer.level}
	var button := _button(label,func(): app.buy_offer(offer.id,expected),not can_buy)
	button.add_theme_font_size_override("font_size",11)
	button.clip_text = true
	button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var ink := UITheme.MUTED if inactive else UITheme.BG if can_buy else Color("eea291")
	var fill := UITheme.MENU_BG if inactive else UITheme.GOLD if can_buy else Color("30252a")
	for state in ["normal","hover","pressed","disabled"]:
		button.add_theme_stylebox_override(state,UITheme.box(fill.lightened(0.08) if state=="hover" and can_buy else fill,ink,1,6))
	for state in ["font_color","font_hover_color","font_pressed_color","font_disabled_color"]:
		button.add_theme_color_override(state,ink)
	var action := L10n.text("Learn") if int(offer.level)==0 and (catalog.skills.has(offer.id) or offer.id=="blackhole") else L10n.text("Upgrade")
	button.tooltip_text = price if inactive else action+" · "+full_price
	if not can_buy:
		button.focus_mode = Control.FOCUS_NONE
		button.mouse_default_cursor_shape = Control.CURSOR_ARROW
	return button

func _workshop(payload: Dictionary) -> Control:
	return _workshop_menu.build(payload)

func _restoration(payload: Dictionary) -> Control:
	var previous := str(payload.get("from","home"))
	if previous not in ["home","receipt","chapter","workshop"]: previous = "home"
	var receipt: Dictionary = payload.get("receipt",{})
	_art_gallery = RestorationGallery.new()
	_art_gallery.setup(catalog,journey,"gallery",0,func(): app.navigate(previous,receipt))
	return _art_gallery

func close_restoration() -> void:
	if is_instance_valid(_art_gallery): _art_gallery.close()
	else: app.navigate("home")

func show_artwork_reward(index: int) -> void:
	if index < 0 or index >= catalog.regions.size() or not journey.artwork_state(index).unlocked:
		return
	close_popup()
	var previous: String = app.current_screen
	var receipt: Dictionary = app.payload.duplicate(true)
	_art_popup = RestorationGallery.new()
	_art_popup.setup(catalog,journey,"reward",index,Callable(),func():
		app.navigate("restoration",{"from":previous,"receipt":receipt}))
	_art_popup.z_index = 20
	app.safe_root.add_child(_art_popup)

func _receipt(payload: Dictionary) -> Control:
	return _workshop({"from_result":true,"receipt":payload,"tab":"weapons"})

func _result_reward(content: VBoxContainer, payload: Dictionary) -> void:
	var panel := PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel",UITheme.box(Color("304850"),UITheme.MENU_BORDER,1,14))
	content.add_child(panel)
	var metrics := HBoxContainer.new()
	metrics.mouse_filter = Control.MOUSE_FILTER_IGNORE
	metrics.add_theme_constant_override("separation",16)
	panel.add_child(metrics)
	for stat in [["Recovery rate",_percent(float(payload.get("ratio",0))),Color("d4ecdc")],
			["Scrap earned",_number(payload.get("reward",0)),Color("ffe1a1")]]:
		var column := VBoxContainer.new()
		column.mouse_filter = Control.MOUSE_FILTER_IGNORE
		column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		column.add_theme_constant_override("separation",4)
		metrics.add_child(column)
		column.add_child(_label(stat[0],11,UITheme.TEXT))
		column.add_child(_label(stat[1],22,stat[2]))
	if str(payload.get("bonus",0))!="0":
		content.add_child(_label(L10n.format("First clear bonus: %s scrap" if payload.get("firstClear",false) else "Repeat clear bonus: %s scrap",[_number(payload.bonus)]),13,UITheme.MINT))
	if str(payload.get("refinementBonus",0))!="0":
		content.add_child(_label(L10n.format("Resource refining: +%s scrap",[_number(payload.refinementBonus)]),13,UITheme.GOLD))

func _result_unlocks(content: VBoxContainer, payload: Dictionary) -> void:
	var ids = payload.get("newUnlocks",[])
	if not ids is Array or ids.is_empty():
		return
	for offer in journey.offers():
		if offer.id in ids:
			content.add_child(_button(L10n.format("%s unlocked →",[_offer_name(offer)]),
				func(): open_unlock_intro(offer.id),false,true))

func _result_actions(content: VBoxContainer, upgrade_primary := true) -> void:
	content.add_child(_button("Upgrade equipment →",func(): app.navigate("workshop",{"from_result":true}),false,upgrade_primary))
	content.add_child(_button("Restoration records",func(): app.navigate("restoration",{"from":app.current_screen,"receipt":app.payload.duplicate(true)})))
	content.add_child(_button("Retry this map",func(): app.start_run("retry")))
	content.add_child(_button("Back to site list",func(): app.navigate("maps")))

func _chapter(payload: Dictionary) -> Control:
	return _workshop({"from_result":true,"receipt":payload,"tab":"weapons"})

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
	return _menu_pages.settings(payload)

func _pause() -> Control:
	return _menu_pages.pause()

func _reset() -> Control:
	var page := _page("Reset your progress?","RESET PROGRESS","settings")
	page.content.add_child(_label("Reset all regions, scrap, upgrades and skills. Your progress starts again from the first tutorial. This cannot be undone.",14))
	page.content.add_child(_label("Sound settings, original app saves and other game saves are kept.",12,UITheme.MUTED))
	page.content.add_child(_button("Cancel · keep playing",func(): app.show_settings("home"),false,true))
	page.content.add_child(_button("Reset and start over",func(): app.reset_progress()))
	return page.root

func _import_confirm(payload: Dictionary) -> Control:
	var page := _page("Import profile","SAVE TRANSFER","settings")
	var preview: Dictionary = payload.get("preview",{})
	page.content.add_child(_label("Review this profile before replacing your Godot progress. Your current Godot save will be backed up first.",13))
	var names := {"parts":"Scrap","runCount":"Sorties","revision":"Save revision","resetCount":"Resets"}
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
	page.content.add_child(_label(L10n.format("Planet Patchup · %s\nGodot 4.6.2 · Compatibility\n6 regions · 42 maps + tutorial\n%d upgrade tracks · %d skills",[str(ProjectSettings.get_setting("application/config/version","")),catalog.tracks.size(),catalog.skills.size()]),14))
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
	root.add_child(battery_icon)
	var battery := _label("100%",17,UITheme.HUD_INK)
	battery.autowrap_mode = TextServer.AUTOWRAP_OFF
	battery.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	root.add_child(battery)
	var diagnostic_button := Button.new()
	diagnostic_button.flat = true
	diagnostic_button.focus_mode = Control.FOCUS_NONE
	diagnostic_button.mouse_filter = Control.MOUSE_FILTER_STOP
	for state in ["normal", "hover", "pressed", "focus"]:
		diagnostic_button.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	diagnostic_button.pressed.connect(_diagnostic_tap)
	root.add_child(diagnostic_button)
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
	var attack_panel := PanelContainer.new()
	attack_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	attack_panel.add_theme_stylebox_override("panel",UITheme.box(Color(0.035,0.065,0.09,0.94),Color("bca367"),1,6))
	var attack_label := _label("폭파 진단 · 공격 대기",12,Color("fff0cd"))
	attack_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	attack_panel.add_child(attack_label)
	attack_panel.visible = bool(ProjectSettings.get_setting("diagnostics/attack_trace",false))
	root.add_child(attack_panel)
	_attack_trace_updated = 0
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
	var tutorial_panel := PanelContainer.new()
	tutorial_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	tutorial_panel.add_theme_stylebox_override("panel",UITheme.box(Color("162b31"),Color("bb9d62"),1,10))
	tutorial_panel.hide()
	root.add_child(tutorial_panel)
	var guide_content := VBoxContainer.new()
	guide_content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	guide_content.add_theme_constant_override("separation",6)
	tutorial_panel.add_child(guide_content)
	var tutorial_title := _label("",17,Color("ffdb92"))
	var tutorial_copy := _label("",14,Color("fff4da"))
	guide_content.add_child(tutorial_title)
	guide_content.add_child(tutorial_copy)
	var skip := _button("Skip guide",func(): app.skip_run_guide())
	skip.add_theme_font_size_override("font_size",12)
	skip.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
	guide_content.add_child(skip)
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
	var skip_wait := _button("Recover now",func():
		if journey.current_run != null and journey.current_run.skip_collection_wait() and _hud.has("skip_wait"):
			_hud.skip_wait.hide())
	UITheme.hud_button(skip_wait)
	for state in ["normal","hover","pressed","focus"]:
		var style := skip_wait.get_theme_stylebox(state)
		style.content_margin_left = 10
		style.content_margin_right = 10
		skip_wait.add_theme_color_override("font_color" if state=="normal" else "font_%s_color" % state,UITheme.HUD_INK)
	skip_wait.icon = catalog.texture("hud-recovery")
	skip_wait.expand_icon = true
	skip_wait.add_theme_constant_override("icon_max_width",18)
	skip_wait.visible = false
	skip_wait.tooltip_text = L10n.text("Start scrap recovery")
	root.add_child(skip_wait)
	var layout := func():
		var width: float = root.size.x
		var height: float = root.size.y
		top.position = Vector2.ZERO
		top.size = Vector2(width,PlayLayout.TOP)
		var finishing: bool = journey.current_run!=null and journey.current_run.phase=="finishing"
		var controls_height := PlayLayout.controls_height(root.size,finishing)
		var controls_top := height-controls_height
		control_strip.position = Vector2(0,controls_top)
		control_strip.size = Vector2(width,controls_height)
		var header_center := PlayLayout.TOP/2.0
		battery_icon.position = Vector2(12,header_center-12)
		battery_icon.size = Vector2(24,24)
		battery.position = Vector2(42,0)
		battery.size = Vector2(72,PlayLayout.TOP)
		diagnostic_button.position = Vector2(36,header_center-22)
		diagnostic_button.size = Vector2(79,44)
		pause.position = Vector2(width-56,header_center-22)
		pause.size = Vector2(44,44)
		attack_panel.position = Vector2(8,PlayLayout.TOP+4)
		attack_panel.size = Vector2(width-16,126)
		var attack_height := attack_panel.size.y+4 if attack_panel.visible else 0.0
		performance_panel.position = Vector2(8,PlayLayout.TOP+4+attack_height)
		performance_panel.size = Vector2(width-16,184)
		var diagnostic_height := attack_height + (performance_panel.size.y+4 if performance_panel.visible else 0.0)
		fit.position = Vector2(width-80,62+diagnostic_height)
		fit.size = Vector2(72,50)
		notice_panel.position = Vector2(16,64+diagnostic_height)
		notice_panel.size = Vector2(minf(245,maxf(120,width-145)),68)
		var tip_height := 24.0 if bright else clampf(tip.get_minimum_size().y+16,30,maxf(30,controls_height-76))
		if finishing:
			tip_height = maxf(24.0,tip_panel.get_combined_minimum_size().y)
		tip_panel.position = Vector2(8,height-8-tip_height)
		tip_panel.size = Vector2(width-16,tip_height)
		tip_panel.visible = not tip.text.is_empty()
		tip.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if bright or finishing else HORIZONTAL_ALIGNMENT_LEFT
		if finishing:
			var footer_center := controls_top+controls_height/2.0
			tip_panel.position.y = footer_center-tip_height/2.0
			if skip_wait.visible:
				var button_width := minf(128.0,width-16.0)
				skip_wait.position = Vector2((width-button_width)/2.0,footer_center-22.0)
				skip_wait.size = Vector2(button_width,44)
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
		var tutorial_y := PlayLayout.TOP+10+diagnostic_height
		if notice_panel.visible:
			tutorial_y = notice_panel.position.y+notice_panel.size.y+8
		tutorial_panel.position = Vector2(16,tutorial_y)
		tutorial_panel.size = Vector2(minf(320,maxf(0,width-104)),0)
	root.resized.connect(layout)
	root.ready.connect(layout)
	_hud["attack_trace"] = attack_label
	_hud["performance"] = performance
	_hud["performance_panel"] = performance_panel
	_hud.merge({"battery":battery,"tools":tools,"passives":passive_slots,"actives":active_slots,"tutorial_panel":tutorial_panel,"tutorial_title":tutorial_title,"tutorial_copy":tutorial_copy,"minimap":minimap,"fit":fit,"tip":tip,"notice":notice_label,"notice_panel":notice_panel,"skip_guide":skip,"skip_wait":skip_wait,"layout":layout})
	return root

func update_hud(play_view) -> void:
	if play_view == null or not is_instance_valid(play_view.world):
		return
	var probe = play_view.world.perf
	probe.begin(probe.HUD)
	_update_hud_unprofiled(play_view)
	probe.end()

func _update_hud_unprofiled(play_view) -> void:
	if _hud.is_empty() or play_view==null or play_view.world==null or not is_instance_valid(_hud.get("battery")):
		return
	var world = play_view.world
	if world.blast_trace.enabled and Time.get_ticks_msec() - _attack_trace_updated >= 100:
		_attack_trace_updated = Time.get_ticks_msec()
		_hud.attack_trace.text = world.blast_trace.hud_text()
	if world.perf.enabled and Time.get_ticks_msec() - _performance_updated >= 250:
		_performance_updated = Time.get_ticks_msec()
		_hud.performance.text = world.perf.report()
	var run = play_view.run
	var finishing: bool = run!=null and run.phase=="finishing"
	var preparing: bool = finishing and not run.collection_started()
	_hud.skip_wait.visible = preparing and run.can_skip_collection_wait()
	_hud.fit.visible = not finishing
	_hud.battery.text = "%d%%" % ceili(float(world.charge)/maxf(1,float(world.stats.capacity))*100)
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
	var complete: bool = run!=null and run.finish_ready
	var show_guide: bool = run!=null and run.guide!=null and run.guide.stage!="done" and not finishing and not complete
	_hud.tutorial_panel.visible = show_guide
	if show_guide:
		_hud.tutorial_title.text = run.guide.title()
		_hud.tutorial_copy.text = run.guide.copy()
		_hud.skip_guide.visible = run.guide.stage!="work"
	if complete:
		_hud.tip.text = L10n.text("Collection complete")
	elif finishing:
		_hud.tip.text = "" if preparing else L10n.text("Recovering scrap")
	elif run!=null:
		var tips: Array = BRIGHT_PLAY_TIPS if GameSkin.bright() else PLAY_TIPS
		var index := floori(float(run.work_ms)/5000.0)%tips.size()
		_hud.tip.text = L10n.text(tips[index])
	_hud.layout.call()


func _workshop_header(page: Dictionary, receipt: Dictionary = {}) -> void:
	var fixed: Control = page.fixed
	var heading: Label = page.heading
	heading.text = L10n.text("Upgrades")
	heading.size.x = 150
	var balance := HBoxContainer.new()
	balance.alignment = BoxContainer.ALIGNMENT_END
	var mark := _hud_icon("hud-recovery",UITheme.GOLD)
	mark.custom_minimum_size = Vector2(16,16)
	balance.add_child(mark)
	var amount := _label(_number(journey.profile.parts),14,UITheme.GOLD)
	amount.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	amount.autowrap_mode = TextServer.AUTOWRAP_OFF
	amount.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	amount.clip_text = true
	amount.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	amount.tooltip_text = _number(journey.profile.parts)
	amount.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	balance.add_child(amount)
	_place(fixed,balance,Rect2(234,16 if receipt.is_empty() else 10,134,44 if receipt.is_empty() else 26))
	if receipt.is_empty(): return
	heading.position.y = 10
	heading.size.y = 30
	var index := int(receipt.get("regionIndex",app.selected_region))
	var region: Dictionary = catalog.region(index)
	var site_id := str(receipt.get("siteId",""))
	var site_index: int = region.get("sites",[]).find(site_id)
	var code := "%d-%s" % [index+1,"B" if site_index==6 else str(site_index+1)] if site_index>=0 else ""
	var summary := _flat(_button(L10n.format("%s · Recovery %s ›",[code,_percent(float(receipt.get("ratio",0)))]),func(): _show_receipt_details(receipt)),UITheme.MUTED)
	summary.add_theme_font_size_override("font_size",12)
	summary.alignment = HORIZONTAL_ALIGNMENT_LEFT
	summary.clip_text = true
	summary.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	summary.tooltip_text = L10n.text("Cleanup result")
	_place(fixed,summary,Rect2(66,30,166,44))
	var gained := _label("+"+_number(receipt.get("reward",0)),12,UITheme.MINT)
	gained.autowrap_mode = TextServer.AUTOWRAP_OFF
	gained.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	gained.clip_text = true
	gained.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	gained.tooltip_text = L10n.text("Scrap earned")
	_place(fixed,gained,Rect2(238,38,130,22))

func _show_receipt_details(receipt: Dictionary) -> void:
	close_popup()
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	column.add_child(_label(str(receipt.get("siteName","")),16,UITheme.GOLD))
	column.add_child(_label("100% · All Clear" if receipt.get("allClear",false) else "CLEARED" if receipt.get("qualified",false) else "Recovery below 70%",13,UITheme.MINT))
	_result_reward(column,receipt)
	_result_unlocks(column,receipt)
	column.add_child(_button("Restoration records",func(): app.navigate("restoration",{"from":"workshop","receipt":app.payload.duplicate(true)})))
	if app.has_method("open_feedback"): column.add_child(_button("Feedback",func(): app.open_feedback()))
	var popup := OfferPopup.new()
	popup.configure(L10n.text("Cleanup result"),column)
	_offer_popup = popup
	popup.closed.connect(func():
		if _offer_popup == popup: _offer_popup = null)
	app.view.add_child(popup)

func show_restart_confirmation() -> void:
	close_popup()
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation",12)
	column.add_child(_label("This attempt's scrap will not be settled. Saved records, equipment and held scrap are kept.",13))
	var popup := OfferPopup.new()
	column.add_child(_button("Cancel",popup.close))
	column.add_child(_button("Restart",func(): app.restart_run(),false,true))
	popup.configure(L10n.text("Restart this site?"),column)
	_offer_popup = popup
	popup.closed.connect(func():
		if _offer_popup == popup: _offer_popup = null)
	app.view.add_child(popup)
