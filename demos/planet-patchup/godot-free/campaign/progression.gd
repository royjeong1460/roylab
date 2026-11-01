extends RefCounted

const FreeEdition = preload("res://campaign/free_edition.gd")
var catalog

func setup(source) -> void:
	catalog = source

func best(p: Dictionary, id: String) -> float:
	var record: Dictionary = p.get("stageRecords", {}).get(id, {})
	return float(record.get("recovered", 0)) / maxi(1, int(record.get("total", 1)))

func region_progress(p: Dictionary, index: int) -> Dictionary:
	var region: Dictionary = catalog.region(index)
	var ids: Array = region.get("sites", [])
	var sum := 0.0
	var clears := 0
	var all_clear := not ids.is_empty()
	for id in ids:
		var value := best(p, str(id))
		sum += value
		clears += int(value >= 0.7)
		all_clear = all_clear and value == 1.0
	var cleared: bool = bool(p.get("bossCleared", false)) if index == 0 else false
	return {"ratio": sum / ids.size() if not ids.is_empty() else 0.0,
		"clears": clears, "cleared": cleared, "complete": all_clear,
		"state": "complete" if all_clear else "cleared" if cleared else "working",
		"restoration": (1.0 if p.get("bossCleared", false) else normal_clears(p, 0) / 7.0) if index == 0 else 0.0}

func region_open(_p: Dictionary, index: int) -> bool:
	return FreeEdition.allows_region(index) and not catalog.region(index).get("sites", []).is_empty()

func site_region(id: String) -> int:
	for i in range(catalog.regions.size()):
		if id in catalog.region(i).get("sites", []):
			return i
	return -1

func selected_region(p: Dictionary) -> int:
	var index := int(p.get("selectedRegion", 0))
	return index if region_open(p, index) else 0

func stage_open(p: Dictionary, id: String) -> bool:
	if not FreeEdition.allows_site(id):
		return false
	var meta: Dictionary = catalog.metadata(id)
	var index := site_region(id)
	if meta.is_empty() or not region_open(p, index):
		return false
	if meta.get("boss", false):
		for other in catalog.region(index).get("sites", []):
			if not catalog.metadata(str(other)).get("boss", false) and best(p, str(other)) < 0.7:
				return false
	return true

func next_site(p: Dictionary) -> String:
	var ids: Array = catalog.region(selected_region(p)).get("sites", [])
	for id in ids:
		if not catalog.metadata(str(id)).get("boss", false) and best(p, str(id)) < 0.7:
			return str(id)
	return str(ids[0]) if not ids.is_empty() else ""

func boss_site(p: Dictionary) -> String:
	for id in catalog.region(selected_region(p)).get("sites", []):
		if catalog.metadata(str(id)).get("boss", false):
			return str(id)
	return ""

func distinct_clears(p: Dictionary) -> int:
	# Paid transforms retain balance.js's six original ARCH_SITES skill milestones.
	return normal_clears(p, 0)

func normal_clears(p: Dictionary, index: int) -> int:
	var count := 0
	for id in catalog.region(index).get("sites", []):
		if not catalog.metadata(str(id)).get("boss", false) and best(p, str(id)) >= 0.7:
			count += 1
	return count

func skill_available(p: Dictionary, id: String) -> bool:
	if not FreeEdition.allows_skill(id) or not catalog.skills.has(id):
		return false
	var skill: Dictionary = catalog.skills[id]
	var index := int(skill.get("region", 0))
	return region_open(p, index) and normal_clears(p, index) >= int(skill.get("clears", 0))

func skill_unlock_info(id: String) -> Dictionary:
	if not FreeEdition.allows_skill(id) or not catalog.skills.has(id):
		return {}
	var skill: Dictionary = catalog.skills[id]
	var index := int(skill.get("region", 0))
	return {"region": index, "clears": int(skill.get("clears", 0)), "region_name": str(catalog.region(index).get("name", ""))}

func skill_slots(p: Dictionary, _kind := "") -> int:
	return 1

func remember(p: Dictionary, id: String, recovered: int, total: int) -> void:
	var meta: Dictionary = catalog.metadata(id)
	if site_region(id) < 0 or meta.is_empty() or recovered < 0 or recovered > total or total < 1:
		return
	if not p.stageRecords.has(id) or float(recovered) / total > best(p, id):
		p.stageRecords[id] = {"recovered": recovered, "total": total, "boss": bool(meta.get("boss", false))}

func boss_rewarded(p: Dictionary, id: String) -> bool:
	return p.get("bossRewards", {}).get(id, false) or (site_region(id) == 0 and p.get("bossCleared", false))

func grant_skills(p: Dictionary) -> void:
	if distinct_clears(p) >= 2 and p.skills.aftershock == 0:
		p.skills.aftershock = 1
		if p.equipped.passive.is_empty():
			p.equipped.passive.append("aftershock")

func planet_progress(p: Dictionary) -> float:
	var sum := 0.0
	for i in range(catalog.regions.size()):
		sum += region_progress(p, i).ratio
	return sum / maxi(1, catalog.regions.size())
