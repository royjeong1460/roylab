extends RefCounted

const UITheme = preload("res://app/ui_theme.gd")
const L10n = preload("res://app/localization.gd")
const Money = preload("res://campaign/money.gd")
const OfferPopup = preload("res://app/offer_popup.gd")
const TOOL_TRACKS := {"blast":["blastForce","blastRadius","blastReach"],"blackhole":["wellPull","wellReach","wellDuration","mix","wear"]}
const SKILLS := {"passive":["aftershock","relay","slam","expand","wave"],"active":["orbital","seismic","gravity","sonic","recharge"]}

var host
var _tab := "weapons"
var _tool := "blast"
var _kind := "passive"
var _payload: Dictionary = {}
var _scroll_positions: Dictionary = {}
var _offers: Dictionary = {}

func setup(source_host) -> void:
	host = source_host

func build(payload: Dictionary) -> Control:
	_payload = payload.duplicate(true)
	_tab = str(payload.get("tab",_tab))
	_tool = str(payload.get("tool",_tool))
	_kind = str(payload.get("kind",_kind))
	if not TOOL_TRACKS.has(_tool): _tool = "blast"
	if not SKILLS.has(_kind): _kind = "passive"
	var tutorial: String = str(host.journey.profile.tutorial) if host.app.selected_region == 0 else ""
	var tabs: Array = [["weapons","Weapons"]]
	if tutorial not in ["upgrade","next"] or host.journey.progression.gear_available(host.journey.profile,"aftershock"):
		tabs.append(["skills","Skills"])
		tabs.append(["utility","Utility"])
	if not tabs.any(func(item): return str(item[0]) == _tab): _tab = "weapons"
	if tutorial == "upgrade":
		_tab = "weapons"
		_tool = "blast"
	_offers.clear()
	var offers: Array = host.journey.offers()
	for offer: Dictionary in offers:
		_offers[str(offer.id)] = offer
	var from_result := bool(payload.get("from_result",false))
	var receipt: Dictionary = payload.get("receipt",{}) if from_result else {}
	var footer_height := 128.0 if from_result else 72.0
	var page: Dictionary = host._page("Upgrades","","maps" if from_result else "home",footer_height,true)
	host._workshop_header(page,receipt)
	var pinned := _column(12)
	page.fixed.add_child(pinned)
	var tab_row := HBoxContainer.new()
	tab_row.add_theme_constant_override("separation",0)
	pinned.add_child(tab_row)
	for tab: Array in tabs:
		var tab_id := str(tab[0])
		var button: Button = host._button(str(tab[1]),func(): _navigate(tab_id),false,tab_id == _tab)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size",13)
		tab_row.add_child(button)
	var content: VBoxContainer = page.content
	if tutorial == "upgrade":
		content.add_child(_label("FIRST UPGRADE · Spend your first 300 scrap to improve Blast.",12,UITheme.GOLD))
		content.add_child(host._button("Skip upgrade guide",func(): host.app.skip_tutorial()))
	match _tab:
		"weapons":
			_build_tools(pinned,content)
		"skills":
			_build_skills(pinned,content)
		"utility":
			content.add_child(_label("Battery & Recovery",14,UITheme.GOLD))
			for id: String in ["battery","debrisProcessing","salvageYield"]:
				if _offers.has(id): content.add_child(_metric_card(_offers[id]))
			content.add_child(_label("Upgrades apply next sortie",12,UITheme.MUTED))
	var footer := _footer(from_result,receipt)
	page.fixed.add_child(footer)
	var scroll: ScrollContainer = page.scroll
	var scroll_key := _tab + ":" + (_tool if _tab == "weapons" else _kind if _tab == "skills" else "")
	var saved_scroll := 0 if tutorial == "upgrade" else int(_scroll_positions.get(scroll_key,0))
	scroll.get_v_scroll_bar().value_changed.connect(func(value: float): _scroll_positions[scroll_key] = int(value))
	var layout := func():
		var fixed: Control = page.fixed
		pinned.position = Vector2(22,76)
		pinned.size = Vector2(fixed.size.x-44,pinned.get_combined_minimum_size().y)
		var top := pinned.position.y+pinned.size.y+12
		scroll.position = Vector2(22,top)
		scroll.size = Vector2(fixed.size.x-44,maxf(0,fixed.size.y-footer_height-12-top))
		footer.position = Vector2(0,fixed.size.y-footer_height)
		footer.size = Vector2(fixed.size.x,footer_height)
	page.root.resized.connect(layout)
	page.fixed.resized.connect(layout)
	pinned.minimum_size_changed.connect(layout)
	page.root.ready.connect(layout)
	page.root.ready.connect(func(): scroll.set_deferred("scroll_vertical",saved_scroll))
	return page.root

func _navigate(tab: String, tool := "", kind := "") -> void:
	var next := _payload.duplicate(true)
	next.tab = tab
	next.tool = _tool if tool.is_empty() else tool
	next.kind = _kind if kind.is_empty() else kind
	host.app.navigate("workshop",next)

func _label(text: String, font_size := 12, color := UITheme.TEXT) -> Label:
	var label: Label = host._label(text,font_size,color)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	label.clip_text = false
	return label

func _column(separation := 4) -> VBoxContainer:
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation",separation)
	column.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return column

func _card(column: VBoxContainer, equipped := false) -> PanelContainer:
	var card := PanelContainer.new()
	card.mouse_filter = Control.MOUSE_FILTER_PASS
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel",UITheme.box(Color("2b433f") if equipped else UITheme.MENU_PANEL,UITheme.MINT if equipped else UITheme.MENU_BORDER,1,10))
	card.add_child(column)
	return card

func _body_button(body: Control, callback: Callable, primary := false, minimum_height := 44.0) -> Button:
	var button: Button = host._button("",callback,false,primary)
	button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	button.mouse_filter = Control.MOUSE_FILTER_PASS
	var margin := MarginContainer.new()
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	button.add_child(margin)
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left","top","right","bottom"]:
		margin.add_theme_constant_override("margin_"+side,6)
	margin.add_child(body)
	body.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var fit := func(): button.custom_minimum_size.y = maxf(minimum_height,margin.get_combined_minimum_size().y)
	margin.minimum_size_changed.connect(fit)
	button.ready.connect(fit)
	fit.call()
	return button

func _icon(key: String, color: Color, extent := 28.0) -> TextureRect:
	var icon: TextureRect = host._hud_icon(key,color)
	icon.custom_minimum_size = Vector2(extent,extent)
	return icon

func _check(color: Color, fill := Color.TRANSPARENT) -> Control:
	var mark := Control.new()
	mark.custom_minimum_size = Vector2(12,12)
	mark.size = Vector2(12,12)
	mark.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	mark.draw.connect(func():
		if fill.a > 0: mark.draw_rect(Rect2(0,0,12,12),fill)
		mark.draw_line(Vector2(2,6),Vector2(5,9),color,2)
		mark.draw_line(Vector2(5,9),Vector2(10,3),color,2))
	return mark

func _build_tools(pinned: VBoxContainer, content: VBoxContainer) -> void:
	var choices := HBoxContainer.new()
	choices.add_theme_constant_override("separation",8)
	pinned.add_child(choices)
	for tool: String in ["blast","blackhole"]:
		var name := "Shockwave" if tool == "blast" else "Black Hole"
		var ink := Color("172028") if tool == _tool else UITheme.GOLD
		var body := HBoxContainer.new()
		body.add_theme_constant_override("separation",8)
		body.add_child(_icon("tool-blast" if tool == "blast" else "tool-blackhole",ink,24))
		var text := _label(name,13,ink)
		text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body.add_child(text)
		var button := _body_button(body,func(): _navigate("weapons",tool),tool == _tool)
		button.disabled = tool == "blackhole" and str(host.journey.profile.tutorial) == "upgrade" and host.app.selected_region == 0
		choices.add_child(button)
	var caption := HBoxContainer.new()
	caption.add_theme_constant_override("separation",12)
	caption.add_child(_icon("tool-blast" if _tool == "blast" else "tool-blackhole",UITheme.GOLD,32))
	var copy := _column()
	copy.add_child(_label("Shockwave" if _tool == "blast" else "Black Hole",14))
	copy.add_child(_label("Pushes fragments harder and strengthens nearby cracks." if _tool == "blast" else "Pulls loose material inward, then grinds pieces through sustained contact.",12,UITheme.MUTED))
	caption.add_child(copy)
	pinned.add_child(caption)
	if _tool == "blackhole" and _offers.has("blackhole") and int(_offers.blackhole.level) == 0:
		var offer: Dictionary = _offers.blackhole
		var unlock := _column(10)
		unlock.add_child(_icon("tool-blackhole",UITheme.GOLD,44))
		unlock.add_child(_label("Black Hole",14,UITheme.GOLD))
		unlock.add_child(_label(str(host._offer_summary("blackhole")),12,UITheme.MUTED))
		var hint: String = host._offer_hint(offer)
		if not hint.is_empty(): unlock.add_child(_label(hint,12,UITheme.MUTED))
		unlock.add_child(_purchase(offer,true))
		_add_shortage(unlock,offer)
		content.add_child(_card(unlock))
		return
	for id: String in TOOL_TRACKS[_tool]:
		if _offers.has(id): content.add_child(_metric_card(_offers[id]))

func _metric_card(offer: Dictionary) -> PanelContainer:
	var column := _column(8)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation",10)
	var copy := _column(6)
	copy.add_child(_label(str(host._offer_name(offer)),14))
	copy.add_child(_label(str(host._offer_level(offer)),12,UITheme.MUTED))
	copy.add_child(_label(_track_comparison(offer),16,UITheme.MINT))
	var inspect := _body_button(copy,func(): host._show_offer_details(offer))
	for state in ["normal","hover","pressed"]: inspect.add_theme_stylebox_override(state,StyleBoxEmpty.new())
	inspect.tooltip_text = str(host._offer_name(offer))+" · "+L10n.text("Details")
	row.add_child(inspect)
	row.add_child(_purchase(offer))
	column.add_child(row)
	var hint: String = host._offer_hint(offer)
	if not hint.is_empty(): column.add_child(_label(hint,12,UITheme.MUTED))
	_add_shortage(column,offer)
	return _card(column)

func _track_comparison(offer: Dictionary) -> String:
	var id := str(offer.id)
	var level := int(offer.level)
	var track: Dictionary = host.catalog.tracks[id]
	if id in ["blastRadius","blastReach","wellReach","wellDuration"] and level >= int(track.cap):
		return str(host._offer_description(offer,false))
	var current: float = host.journey.economy.track_value(id,level)
	if not str(offer.get("numeric_error","")).is_empty(): return _track_value(id,current)
	var future: float = host.journey.economy.track_value(id,level+1)
	return _track_value(id,current)+" → "+_track_value(id,future)

func _track_value(id: String, value: float) -> String:
	if id == "salvageYield": return "+"+String.num(value*100.0,2)+"%"
	var result := String.num(value,2)
	if id in ["blastRadius","blastReach","wellReach"]: return result+" "+L10n.text("cells")
	if id == "wellDuration": return result+" "+L10n.text("seconds")
	if id != "battery": return "×"+result
	return result

func _purchase(offer: Dictionary, details := false) -> Button:
	var locked: bool = host._offer_locked(offer)
	var owned: bool = host._offer_owned(offer)
	var numeric_error := not str(offer.get("numeric_error","")).is_empty()
	var can_buy := not locked and not owned and not numeric_error and bool(offer.available) and bool(offer.can_afford)
	var action := "Learn" if int(offer.level) == 0 and (host.catalog.skills.has(str(offer.id)) or str(offer.id) == "blackhole") else "Upgrade"
	var price := L10n.text("FREE") if str(offer.cost) == "0" else str(offer.price_text)
	if locked or owned or numeric_error:
		action = "Locked" if locked else "Owned" if owned else "Unavailable"
		price = ""
	var body := _column(2)
	var action_label := _label(action,13,Color("172028") if can_buy else UITheme.MUTED)
	action_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body.add_child(action_label)
	if not price.is_empty():
		var price_label := _label(price,12,Color("172028") if can_buy else Color("d7a39b"))
		price_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body.add_child(price_label)
	var expected := {"revision":host.journey.profile.revision,"cost":offer.cost,"level":offer.level}
	var button := _body_button(body,func():
		if details: host._show_offer_details(offer)
		else: host.app.buy_offer(str(offer.id),expected),can_buy,60)
	button.custom_minimum_size.x = 86
	button.size_flags_horizontal = Control.SIZE_SHRINK_END
	button.disabled = not can_buy
	button.tooltip_text = L10n.text(action)+(" · "+str(offer.price_text) if not price.is_empty() else "")
	return button

func _add_shortage(column: VBoxContainer, offer: Dictionary) -> void:
	if bool(offer.can_afford) or bool(host._offer_locked(offer)) or bool(host._offer_owned(offer)) or not str(offer.get("numeric_error","")).is_empty(): return
	var shortage: Variant = Money.subtract(offer.cost,host.journey.profile.parts)
	var text := L10n.format("%s scrap short",[Money.text(shortage)]) if shortage != null else L10n.text("Not enough scrap.")
	var label := _label(text,12,Color("e3aaa0"))
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	column.add_child(label)

func _build_skills(pinned: VBoxContainer, content: VBoxContainer) -> void:
	var loadout := HBoxContainer.new()
	loadout.add_theme_constant_override("separation",12)
	pinned.add_child(loadout)
	for kind: String in ["passive","active"]:
		var group := _column(6)
		group.add_child(_label("Passive" if kind == "passive" else "Active",12,UITheme.MUTED))
		var pair := HBoxContainer.new()
		pair.add_theme_constant_override("separation",6)
		group.add_child(pair)
		var equipped: Array = host.journey.profile.equipped.get(kind,[])
		var slots: int = host.journey.progression.skill_slots(host.journey.profile,kind)
		for slot in range(2):
			var id := str(equipped[slot]) if slot < equipped.size() else ""
			pair.add_child(_slot(kind,id,slot >= slots))
		loadout.add_child(group)
	var kinds := HBoxContainer.new()
	kinds.add_theme_constant_override("separation",8)
	pinned.add_child(kinds)
	for kind: String in ["passive","active"]:
		var button: Button = host._button("Passive" if kind == "passive" else "Active",func(): _navigate("skills","",kind),false,kind == _kind)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size",13)
		kinds.add_child(button)
	for id: String in SKILLS[_kind]:
		if _offers.has(id): content.add_child(_skill_card(_offers[id]))

func _slot(kind: String, id: String, locked: bool) -> Button:
	var body := _column(4)
	body.alignment = BoxContainer.ALIGNMENT_CENTER
	var filled := not id.is_empty() and not locked
	if filled:
		body.add_child(_icon(str(host._skill_icon(id)),UITheme.GOLD,24))
		var name := _label(str(host.catalog.skills.get(id,{}).get("name","")),12)
		name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body.add_child(name)
	else:
		var mark := _label("Locked" if locked else "+",12 if locked else 24,UITheme.MUTED if locked else UITheme.GOLD)
		mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body.add_child(mark)
		var text: String = L10n.text(str(host.catalog.region(1).get("name",""))) if locked else L10n.text("Equip")
		var helper := _label(text,12,UITheme.MUTED)
		helper.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		body.add_child(helper)
	var button := _body_button(body,func():
		if filled and _offers.has(id): host._show_offer_details(_offers[id])
		else: _navigate("skills","",kind),false,80)
	button.disabled = locked
	button.tooltip_text = L10n.text(str(host.catalog.skills.get(id,{}).get("name",""))) if filled else L10n.text("Locked" if locked else "Equip")
	if filled:
		for state in ["normal","hover","pressed"]:
			button.add_theme_stylebox_override(state,UITheme.box(Color("344b43"),UITheme.MINT,1,0))
		var check := _check(UITheme.MENU_BG,UITheme.MINT)
		button.add_child(check)
		button.resized.connect(func(): check.position = Vector2(button.size.x-15,3))
	return button

func _skill_card(offer: Dictionary) -> PanelContainer:
	var id := str(offer.id)
	var owned := int(offer.level) > 0
	var locked: bool = host._offer_locked(offer)
	var equipped: Array = host.journey.profile.equipped.get(str(offer.kind),[])
	var selected := id in equipped
	var column := _column(4)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation",8)
	column.add_child(top)
	var title := HBoxContainer.new()
	title.add_theme_constant_override("separation",10)
	title.add_child(_icon(str(host._skill_icon(id)),UITheme.MUTED if locked else UITheme.GOLD,28))
	var copy := _column(3)
	copy.add_child(_label(str(host._offer_name(offer)),14,UITheme.MUTED if locked else UITheme.TEXT))
	copy.add_child(_label(L10n.format("Lv %s",[str(host._number(offer.level))]) if owned else L10n.text("Locked" if locked else "Not owned"),12,UITheme.MUTED))
	title.add_child(copy)
	var inspect := _body_button(title,func(): host._show_offer_details(offer))
	for state in ["normal","hover","pressed"]: inspect.add_theme_stylebox_override(state,StyleBoxEmpty.new())
	top.add_child(inspect)
	var equip_action := func():
		if owned and not selected: show_equip(id)
		else: host._show_offer_details(offer)
	var equip: Button
	if selected:
		var equipped_body := HBoxContainer.new()
		equipped_body.add_theme_constant_override("separation",4)
		equipped_body.add_child(_check(Color("172028")))
		var equipped_label := _label("Equipped",12,Color("172028"))
		equipped_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		equipped_body.add_child(equipped_label)
		equip = _body_button(equipped_body,equip_action)
	else:
		equip = host._button("Equip" if owned else "Locked" if locked else "Learn",equip_action)
	equip.custom_minimum_size.x = 86
	equip.size_flags_horizontal = Control.SIZE_SHRINK_END
	equip.add_theme_font_size_override("font_size",12)
	if selected:
		for state in ["normal","hover","pressed"]: equip.add_theme_stylebox_override(state,UITheme.box(UITheme.MINT,UITheme.MINT,1,6))
		for state in ["font_color","font_hover_color","font_pressed_color"]: equip.add_theme_color_override(state,Color("172028"))
	top.add_child(equip)
	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation",10)
	column.add_child(bottom)
	var helper: String = str(host._offer_hint(offer)) if locked else _skill_use(offer) if owned else L10n.text("Learn before equipping")
	var summary := _label(helper,12,UITheme.MUTED)
	summary.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	bottom.add_child(summary)
	if not locked: bottom.add_child(_purchase(offer,true))
	_add_shortage(column,offer)
	return _card(column,selected)

func _skill_use(offer: Dictionary) -> String:
	if str(offer.kind) == "active": return L10n.text("Once per sortie")
	var effect: Dictionary = host.catalog.effect_stats(str(offer.id),maxi(1,int(offer.level)))
	return L10n.format("Every %d effective Blasts",[int(effect.get("threshold",0))])

func show_equip(id: String) -> void:
	if not host.catalog.skills.has(id) or int(host.journey.profile.skills.get(id,0)) < 1: return
	var kind := str(host.catalog.skills[id].kind)
	var equipped: Array = host.journey.profile.equipped.get(kind,[])
	if id in equipped:
		if _offers.has(id): host._show_offer_details(_offers[id])
		return
	var slots: int = host.journey.progression.skill_slots(host.journey.profile,kind)
	host.close_popup()
	if equipped.size() < slots:
		host.app.equip_skill(id)
		return
	var column := _column(12)
	column.add_child(_label("Current skill",12,UITheme.MUTED))
	for slot in range(mini(slots,equipped.size())):
		var old_id := str(equipped[slot])
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation",12)
		row.add_child(_icon(str(host._skill_icon(old_id)),UITheme.GOLD,28))
		var copy := _column(4)
		copy.add_child(_label(str(host.catalog.skills.get(old_id,{}).get("name","")),14))
		copy.add_child(_label(L10n.format("Equipped · slot %d",[slot+1]),12,UITheme.MUTED))
		row.add_child(copy)
		row.add_child(_label("→",16,UITheme.GOLD))
		var replacement := _body_button(row,func():
			host.close_popup()
			host.app.equip_skill(id,slot),false,64)
		column.add_child(replacement)
	column.add_child(_label("Incoming skill",12,UITheme.MUTED))
	var incoming := HBoxContainer.new()
	incoming.add_theme_constant_override("separation",12)
	incoming.add_child(_icon(str(host._skill_icon(id)),UITheme.MINT,32))
	incoming.add_child(_label(str(host.catalog.skills[id].name),14,UITheme.MINT))
	column.add_child(incoming)
	column.add_child(host._button("Cancel",func(): host.close_popup()))
	var popup := OfferPopup.new()
	popup.configure(L10n.text("Choose a slot to replace"),column)
	host._offer_popup = popup
	popup.closed.connect(func():
		if host._offer_popup == popup: host._offer_popup = null)
	host.app.safe_root.add_child(popup)

func _footer(from_result: bool, receipt: Dictionary) -> PanelContainer:
	var footer := PanelContainer.new()
	var style := UITheme.box(UITheme.MENU_BG,UITheme.MENU_BORDER,1,0)
	style.border_width_left = 0
	style.border_width_right = 0
	style.border_width_bottom = 0
	style.content_margin_left = 22
	style.content_margin_right = 22
	style.content_margin_top = 10
	style.content_margin_bottom = 14
	footer.add_theme_stylebox_override("panel",style)
	var column := _column(8)
	footer.add_child(column)
	var destination: Dictionary = host.app.result_destination(receipt) if from_result else {}
	if from_result:
		var departure_text := _label(str(destination.get("label","Retry this map"))+" →",14,Color("172028"))
		departure_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		departure_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		var departure := _body_button(departure_text,func(): host.app.depart_after_result(receipt),true,48)
		column.add_child(departure)
	var pair := HBoxContainer.new()
	pair.add_theme_constant_override("separation",8)
	column.add_child(pair)
	var choose: Button = host._button("Choose a site",func(): host.app.navigate("maps"),false,not from_result)
	var repeats_site := from_result and (str(destination.get("screen","")) == "workshop" or (str(destination.get("screen","")) == "play" and str(destination.get("siteId","")) == str(receipt.get("siteId",""))))
	var secondary: Button
	if repeats_site:
		secondary = host._button("Back to planet",func(): host.app.navigate("home"))
	else:
		secondary = host._button("Retry this map",func():
			if from_result: host.app.retry_after_result(receipt)
			else: host.app.start_run("retry"),not from_result and host.journey.last_run_site == null)
	var buttons: Array = [choose,secondary] if repeats_site or not from_result else [secondary,choose]
	for button: Button in buttons:
		button.custom_minimum_size.y = 44 if from_result else 48
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size",12)
		pair.add_child(button)
	return footer
