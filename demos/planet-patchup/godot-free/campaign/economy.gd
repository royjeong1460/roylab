extends RefCounted

const Money = preload("res://campaign/money.gd")
const RETIRED_TRACKS := ["suction", "range", "collectBatch", "collectInterval"]
const RANGE_TRACKS := ["blastRadius", "blastReach", "wellReach", "wellDuration"]
const SHOCKWAVE_TRACKS := ["blastForce", "blastRadius", "blastReach"]
const SHOCKWAVE_ORIGINAL_PRICES := 5
const SHOCKWAVE_LATE_GROWTH := 1.10
var catalog
var progression
var _price_cache := {}

func setup(source, progress) -> void:
	catalog = source
	progression = progress

func money_text(value: Variant) -> String:
	return Money.text(value)

func legacy_upgrade_cost(id: String, level: int) -> int:
	var track: Dictionary = catalog.legacy_tracks[id]
	return ceili(float(track.base) * pow(float(track.growth), level) / 10.0) * 10

func _shockwave_cost(id: String, level: int) -> int:
	if level < SHOCKWAVE_ORIGINAL_PRICES:
		return legacy_upgrade_cost(id, level)
	var track: Dictionary = catalog.legacy_tracks[id]
	var last_original := SHOCKWAVE_ORIGINAL_PRICES - 1
	var anchor := float(track.base) * pow(float(track.growth), last_original)
	return ceili(anchor * pow(SHOCKWAVE_LATE_GROWTH, level - last_original) / 10.0) * 10

func upgrade_cost(id: String, level: int) -> Variant:
	if level < 0 or level >= Money.MAX_SAFE_INTEGER:
		return null
	var track: Dictionary = catalog.tracks[id]
	if catalog.legacy_tracks.has(id) and level < int(track.cap):
		return _shockwave_cost(id, level) if id in SHOCKWAVE_TRACKS else legacy_upgrade_cost(id, level)
	var key := id + ":" + str(level)
	if _price_cache.has(key):
		return _price_cache[key]
	var cost: Variant
	if track.has("sqrt_step"):
		cost = Money.polynomial_cost(int(track.base), level, 20)
	else:
		var base := int(upgrade_cost(id, int(track.cap) - 1))
		cost = Money.polynomial_cost(base, level - int(track.cap) + 1, 25)
	return _cache_cost(key, cost)

func _cache_cost(key: String, cost: Variant) -> Variant:
	if _price_cache.size() >= 64:
		_price_cache.erase(_price_cache.keys()[0])
	_price_cache[key] = cost
	return cost

func skill_prices(skill: Dictionary) -> Array:
	if skill.has("prices"):
		return skill.prices
	return catalog.balance.get("skill_prices", {}).get(skill.kind,
		[600, 1800, 6000, 18000] if skill.kind == "passive" else [1200, 4000, 12000, 36000])

func skill_cost(id: String, level: int) -> Variant:
	if level < 0 or level >= Money.MAX_SAFE_INTEGER:
		return null
	var skill: Dictionary = catalog.skills[id]
	if level == 0:
		return int(skill.learn)
	var prices := skill_prices(skill)
	if level <= prices.size():
		return int(prices[level - 1])
	var key := id + ":" + str(level)
	if _price_cache.has(key):
		return _price_cache[key]
	var base := 3000 if prices.is_empty() else int(prices.back())
	return _cache_cost(key, Money.polynomial_cost(base, level - int(skill.get("max", 5)) + 1, 25))

func legacy_track_spent(id: String, level: int) -> int:
	var total := 0
	for previous in range(level):
		total += legacy_upgrade_cost(id, previous)
	return total

func legacy_skill_spent(id: String, level: int) -> int:
	if level == 0:
		return 0
	var skill: Dictionary = catalog.skills[id]
	var total := int(skill.learn)
	var prices := skill_prices(skill)
	for previous in range(level - 1):
		total += int(prices[previous])
	return total

func legacy_total_spent(p: Dictionary) -> int:
	var total := 2000 if "blackhole" in p.owned else 0
	for id in catalog.legacy_tracks:
		total += legacy_track_spent(id, int(p.upgrades.get(id, 0)))
	for id in catalog.skills:
		total += legacy_skill_spent(id, int(p.skills.get(id, 0)))
	return total

func initial_purchase_totals(p: Dictionary) -> Dictionary:
	var totals := {"blackhole": 2000 if "blackhole" in p.owned else 0}
	for id in catalog.tracks:
		totals[id] = legacy_track_spent(id, int(p.upgrades.get(id, 0))) if catalog.legacy_tracks.has(id) else 0
	for id in catalog.skills:
		totals[id] = legacy_skill_spent(id, int(p.skills.get(id, 0)))
	return totals

func total_spent(p: Dictionary) -> Variant:
	if int(p.get("version", 0)) < 4:
		return legacy_total_spent(p)
	var total: Variant = p.legacyCollection.get("totalSpent", 0)
	for amount in p.purchaseTotals.values():
		total = Money.add(total, amount)
	return total

func validate_purchase_totals(p: Dictionary) -> String:
	if not p.get("purchaseTotals") is Dictionary or p.purchaseTotals.size() != catalog.tracks.size() + catalog.skills.size() + 1:
		return "purchase-totals"
	if not Money.valid(p.purchaseTotals.get("blackhole")) or Money.compare(p.purchaseTotals.blackhole, 2000 if "blackhole" in p.owned else 0) != 0:
		return "purchase-blackhole"
	for id in catalog.tracks.keys() + catalog.skills.keys():
		var amount: Variant = p.purchaseTotals.get(id)
		if not Money.valid(amount):
			return "purchase-" + str(id)
		var is_skill: bool = catalog.skills.has(id)
		var level := int(p.skills[id] if is_skill else p.upgrades[id])
		var maximum := int(catalog.skills[id].get("max", 5)) if is_skill else int(catalog.tracks[id].get("cap", 0))
		var prefix := legacy_skill_spent(id, mini(level, maximum)) if is_skill else legacy_track_spent(id, mini(level, maximum)) if maximum > 0 else 0
		if id in SHOCKWAVE_TRACKS:
			if not _valid_shockwave_total(id, amount, level, maximum, prefix):
				return "purchase-" + str(id)
			continue
		if level <= maximum:
			if Money.compare(amount, prefix) != 0:
				return "purchase-" + str(id)
		else:
			# New intervals use the persisted transaction totals, bounded without iterating levels.
			var first: Variant = skill_cost(id, maximum) if is_skill else upgrade_cost(id, maximum)
			var last: Variant = skill_cost(id, level - 1) if is_skill else upgrade_cost(id, level - 1)
			var count := str(level - maximum)
			var minimum: Variant = Money.add(prefix, Money.multiply(first, count))
			var maximum_cost: Variant = Money.add(prefix, Money.multiply(last, count))
			if Money.compare(amount, minimum) < 0 or Money.compare(amount, maximum_cost) > 0:
				return "purchase-" + str(id)
	return ""

func _valid_shockwave_total(id: String, amount: Variant, level: int, cap: int, original_prefix: int) -> bool:
	# Old purchases may form any prefix, followed by purchases at the new prices.
	var prefix := original_prefix
	if level <= cap and Money.compare(amount, prefix) == 0:
		return true
	for previous in range(mini(level, cap) - 1, SHOCKWAVE_ORIGINAL_PRICES - 1, -1):
		prefix += _shockwave_cost(id, previous) - legacy_upgrade_cost(id, previous)
		if level <= cap and Money.compare(amount, prefix) == 0:
			return true
	if level <= cap:
		return false
	# Beyond the original cap, keep the ledger bounded without iterating unlimited levels.
	var count := str(level - cap)
	var first: Variant = upgrade_cost(id, cap)
	var old_last: Variant = Money.polynomial_cost(legacy_upgrade_cost(id, cap - 1), level - cap, 25)
	var minimum: Variant = Money.add(prefix, Money.multiply(first, count))
	var maximum: Variant = Money.add(original_prefix, Money.multiply(old_last, count))
	return Money.compare(amount, minimum) >= 0 and Money.compare(amount, maximum) <= 0

func _tail(level: int, maximum: int) -> float:
	return 1.0 + 0.08 * sqrt(float(maxi(0, level - maximum)))

func track_value(id: String, level: int) -> float:
	var track: Dictionary = catalog.tracks[id]
	if track.has("sqrt_step"):
		return float(track.start) + float(track.sqrt_step) * sqrt(float(level))
	var maximum := int(track.cap)
	var value := float(track.start) + float(track.step) * mini(level, maximum)
	if level <= maximum or id in RANGE_TRACKS:
		return value
	if id == "battery":
		return value + 10.0 * (sqrt(1.0 + level - maximum) - 1.0)
	return value * _tail(level, maximum)

func track_pressure(id: String, level: int) -> float:
	return _tail(level, int(catalog.tracks[id].cap)) if id in RANGE_TRACKS else 1.0

func stats(p: Dictionary) -> Dictionary:
	var values := {}
	for id in catalog.tracks:
		values[id] = track_value(id, int(p.upgrades.get(id, 0)))
	var blast_pressure := track_pressure("blastRadius", int(p.upgrades.blastRadius)) * track_pressure("blastReach", int(p.upgrades.blastReach))
	var well_pressure := track_pressure("wellReach", int(p.upgrades.wellReach)) * track_pressure("wellDuration", int(p.upgrades.wellDuration))
	well_pressure *= _tail(int(p.upgrades.mix), int(catalog.legacy_tracks.mix.cap))
	var core_mix := track_value("mix", mini(int(p.upgrades.mix), int(catalog.legacy_tracks.mix.cap)))
	values.merge({"capacity": values.battery, "bombRadius": values.blastRadius,
		"bombPower": values.blastForce * blast_pressure, "bombPressureMultiplier": blast_pressure,
		"blastFractureEfficiency": blast_pressure * _tail(int(p.upgrades.blastForce), int(catalog.legacy_tracks.blastForce.cap)),
		"bombCost": 12.0, "gravityCost": 24.0, "gravityPower": 0.2 * values.wellPull * well_pressure,
		"gravityPressureMultiplier": well_pressure, "gravityRadius": values.wellReach,
		"gravityDuration": values.wellDuration, "coreMix": core_mix, "wearSpeed": values.wear,
		"autoCollect": false, "suctionRate": 0.0, "suctionRadius": 12.0, "autoCollectRate": 0.0,
		"suction": 0.0, "range": 12.0, "collectBatch": 0.0, "collectInterval": 0.25})
	return values

func _value_text(value: float) -> String:
	return String.num(value, 2)

func _upgrade_description(id: String, level: int) -> Dictionary:
	var track: Dictionary = catalog.tracks[id]
	var value := track_value(id, level)
	var future := track_value(id, level + 1)
	if id == "debrisProcessing":
		return {"key": "Fragment collision processing · %s× → %s×", "args": [_value_text(value), _value_text(future)]}
	if id == "salvageYield":
		return {"key": "Refinement bonus · %s%% → %s%%", "args": [_value_text(value * 100.0), _value_text(future * 100.0)]}
	if id in RANGE_TRACKS and level >= int(track.cap):
		return {"key": "Fixed %s %s · pressure %s× → %s×", "args": [_value_text(value), track.unit, _value_text(track_pressure(id, level)), _value_text(track_pressure(id, level + 1))]}
	return {"key": "%s → %s %s", "args": [_value_text(value), _value_text(future), track.get("unit", "")]}

func _numeric_error(id: String, level: int, cost: Variant) -> String:
	if level >= Money.MAX_SAFE_INTEGER or not Money.valid(cost):
		return "numeric-limit"
	if catalog.skills.has(id):
		if level == 0:
			return ""
		var key := "recharge_fraction" if id == "recharge" else "power" if id == "aftershock" else "gain"
		if catalog.effect_stats(id, level + 1)[key] <= catalog.effect_stats(id, level)[key] and level >= int(catalog.skills[id].get("max", 5)):
			return "numeric-limit"
	else:
		var current := track_pressure(id, level) if id in RANGE_TRACKS and level >= int(catalog.tracks[id].cap) else track_value(id, level)
		var future := track_pressure(id, level + 1) if id in RANGE_TRACKS and level >= int(catalog.tracks[id].cap) else track_value(id, level + 1)
		if future <= current:
			return "numeric-limit"
	return ""

func _price_fields(offer: Dictionary, p: Dictionary) -> Dictionary:
	offer.price_text = Money.text(offer.cost) if Money.valid(offer.cost) else "—"
	offer.can_afford = Money.valid(offer.cost) and Money.compare(p.parts, offer.cost) >= 0
	return offer

func offers(p: Dictionary) -> Array:
	var result: Array = []
	for id in catalog.tracks:
		var track: Dictionary = catalog.tracks[id]
		var level := int(p.upgrades[id])
		var cost: Variant = upgrade_cost(id, level)
		var error := _numeric_error(id, level, cost)
		var description := _upgrade_description(id, level)
		result.append(_price_fields({"id": id, "name": track.name, "description": description.key % description.args,
			"description_key": description.key, "description_args": description.args,
			"next_description_key": description.key, "next_description_args": description.args,
			"kind": "upgrade", "level": level, "cost": cost, "numeric_error": error,
			"available": error.is_empty() and (id not in ["wellPull", "wellReach", "wellDuration", "mix", "wear"] or "blackhole" in p.owned)}, p))
	result.append(_price_fields({"id": "blackhole", "name": "Black Hole", "kind": "tool", "description": "24 energy per attack",
		"level": int("blackhole" in p.owned), "max": 1, "cost": 2000, "numeric_error": "", "available": progression.gear_available(p, "blackhole") and "blackhole" not in p.owned}, p))
	for id in catalog.skills:
		var skill: Dictionary = catalog.skills[id]
		var level := int(p.skills[id])
		var cost: Variant = skill_cost(id, level)
		var error := _numeric_error(id, level, cost)
		var effect := skill_effect_description(id, maxi(1, level))
		var next_effect := skill_effect_description(id, level + 1)
		result.append(_price_fields({"id": id, "name": skill.name, "kind": skill.kind, "description": effect.key % effect.args,
			"description_key": effect.key, "description_args": effect.args,
			"next_description_key": next_effect.key, "next_description_args": next_effect.args,
			"unlock": progression.gear_unlock_info(id), "icon": skill.get("icon", ""),
			"level": level, "cost": cost, "numeric_error": error,
			"available": error.is_empty() and progression.gear_available(p, id)}, p))
	return result

func skill_effect_description(id: String, level: int) -> Dictionary:
	var effect: Dictionary = catalog.effect_stats(id, level)
	var strength := _value_text(float(effect.get("gain", 1.0)) * 100.0)
	match id:
		"aftershock":
			return {"key": "Every %d effective Blasts · %d echoes at %s%% primary force", "args": [effect.threshold, effect.echoes, _value_text(float(effect.power) * 100.0)]}
		"relay":
			return {"key": "Every %d effective Blasts · fragment relay at %s%% base strength", "args": [effect.threshold, strength]}
		"slam":
			return {"key": "Every %d effective Blasts · lift then slam at %s%% base strength", "args": [effect.threshold, strength]}
		"expand":
			return {"key": "Every %d effective Blasts · expanding pressure at %s%% base strength", "args": [effect.threshold, strength]}
		"wave":
			return {"key": "Every %d effective Blasts · landing sends %d pulses each way at %s%% strength", "args": [effect.threshold, effect.pulses_per_side, strength]}
		"orbital":
			return {"key": "Once per sortie · %d payloads at %s%% impact strength", "args": [effect.payloads, strength]}
		"seismic":
			return {"key": "Once per sortie · %d foundation strikes at %s%% strength · %d%% coverage · %d%% follow-up", "args": [effect.targets, strength, roundi(float(effect.coverage) * 100.0), roundi(float(effect.followup_power) * 100.0)]}
		"gravity":
			return {"key": "Once per sortie · %.2f s downward load at %s%% strength", "args": [effect.duration, strength]}
		"sonic":
			return {"key": "Once per sortie · %.2f s inward sweep at %s%% strength", "args": [effect.duration, strength]}
		"recharge":
			return {"key": "Once per sortie · restore %s%% maximum battery before it empties", "args": [_value_text(float(effect.recharge_fraction) * 100.0)]}
	return {"key": "%s", "args": [id]}

