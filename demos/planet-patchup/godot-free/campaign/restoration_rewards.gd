extends RefCounted

const MAX_SAFE_INTEGER := 9007199254740991

# A restored culture requires six distinct normal sites and its distinct boss.
static func state(profile: Dictionary, catalog, index: int) -> Dictionary:
	var result := {"status": "locked", "perfect": 0, "unlocked": false, "regionId": ""}
	if index < 0 or index >= catalog.regions.size():
		return result
	var region: Dictionary = catalog.region(index)
	var region_id := str(region.get("id", ""))
	result.regionId = region_id
	var ledger: Variant = profile.get("artworkAwards", {})
	var awarded: bool = ledger is Dictionary and typeof(ledger.get(region_id)) == TYPE_BOOL and ledger.get(region_id) == true
	var required := _required_sites(catalog, region)
	var preview := false
	var records: Variant = profile.get("stageRecords", {})
	if records is Dictionary:
		for id in required:
			var record: Variant = records.get(id)
			if not record is Dictionary:
				continue
			var recovered: Variant = record.get("recovered")
			var total: Variant = record.get("total")
			if not _integer(recovered) or not _integer(total) or total <= 0 or recovered > total:
				continue
			if recovered == total:
				result.perfect += 1
			if float(recovered) / float(total) >= 0.7:
				preview = true
	result.unlocked = awarded or (required.size() == 7 and result.perfect == 7)
	result.status = "restored" if result.unlocked else "preview" if preview else "locked"
	return result

static func award(profile: Dictionary, catalog, index: int) -> bool:
	var artwork := state(profile, catalog, index)
	if not artwork.unlocked or artwork.regionId.is_empty():
		return false
	var ledger: Variant = profile.get("artworkAwards", {})
	if not ledger is Dictionary or ledger.get(artwork.regionId) == true:
		return false
	if not profile.has("artworkAwards"):
		profile.artworkAwards = ledger
	ledger[artwork.regionId] = true
	return true

static func _integer(value: Variant) -> bool:
	return typeof(value) in [TYPE_INT, TYPE_FLOAT] and is_finite(float(value)) and value >= 0 and value <= MAX_SAFE_INTEGER and float(value) == floor(float(value))

static func _required_sites(catalog, region: Dictionary) -> Array:
	var ids: Variant = region.get("sites")
	if not ids is Array or ids.size() != 7:
		return []
	var required := []
	var bosses := 0
	for id in ids:
		if not id is String or id.is_empty() or id == catalog.tutorial_id or id in required:
			return []
		var meta: Dictionary = catalog.metadata(id)
		if meta.is_empty() or meta.get("id") != id or typeof(meta.get("boss")) != TYPE_BOOL:
			return []
		bosses += int(meta.boss)
		required.append(id)
	return required if bosses == 1 else []
