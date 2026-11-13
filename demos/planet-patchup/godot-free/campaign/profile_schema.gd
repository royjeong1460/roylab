extends RefCounted

const Money = preload("res://campaign/money.gd")
const BALANCE_VERSION := "paid-final-collection-v1"
const SAVE_BALANCE_VERSION := BALANCE_VERSION
const WEB_V4_BALANCE_VERSION := "free-final-collection-v1"
const PREVIOUS_BALANCE_VERSION := "paid-skill-expansion-v1"
const LEGACY_BALANCE_VERSIONS := ["paid-eave-collection-v2", "arch-campaign-v0.2.2", "arch-campaign-v0.2.3"]
const LEGACY_SKILLS := ["aftershock", "relay", "orbital"]
const ADDED_SKILLS := ["slam", "expand", "wave", "seismic", "gravity", "sonic", "recharge"]
const RETIRED_TRACKS := ["suction", "range", "collectBatch", "collectInterval"]
const MAX_SAFE_INTEGER := 9007199254740991
var catalog
var economy
var progression

func setup(source, shop, progress) -> void:
	catalog = source
	economy = shop
	progression = progress

func fresh() -> Dictionary:
	var upgrades := {}
	var skills := {}
	for id in catalog.tracks:
		upgrades[id] = 0
	for id in catalog.skills:
		skills[id] = 0
	var p := {"version": 4, "campaign": "arch", "balanceVersion": BALANCE_VERSION,
		"revision": 0, "resetCount": 0, "tutorial": "intro", "parts": 0, "earned": 0, "spent": 0, "refunded": 0,
		"collectionMigration": "fresh-v4", "legacyCollection": {}, "purchaseTotals": {}, "lastSettlement": null,
		"owned": ["bomb"], "patterns": ["dot"], "upgrades": upgrades, "skills": skills,
		"equipped": {"passive": [], "active": []}, "stageRecords": {}, "bossCleared": false,
		"bossRewards": {}, "artworkAwards": {}, "selectedRegion": 0, "lastSite": null, "runCount": 0, "bossAttempts": 0,
		"workMs": 0, "firstClearMs": null, "history": [], "purchases": []}
	p.purchaseTotals = economy.initial_purchase_totals(p)
	return p

static func uint(value: Variant) -> bool:
	if typeof(value) not in [TYPE_INT, TYPE_FLOAT]:
		return false
	return is_finite(float(value)) and value >= 0 and value <= MAX_SAFE_INTEGER and float(value) == floor(float(value))

func normalize(data: Variant) -> Dictionary:
	if not data is Dictionary:
		return {"ok": false, "reason": "profile-object"}
	var p: Dictionary = data.duplicate(true)
	var source_version: Variant = p.get("version")
	var source_balance: Variant = p.get("balanceVersion")
	if p.get("version") == 1:
		if p.get("balanceVersion") not in ["arch-campaign-v0.2", "arch-campaign-v0.2.1"] or not p.get("upgrades") is Dictionary:
			return {"ok": false, "reason": "legacy-version"}
		if p.upgrades.size() != catalog.legacy_tracks.size() - 2 or p.upgrades.has("suction") or p.upgrades.has("range"):
			return {"ok": false, "reason": "legacy-upgrades"}
		p.version = 2
		p.balanceVersion = "paid-eave-collection-v2"
		p.upgrades.suction = 0
		p.upgrades.range = 0
	if p.get("version") == 2:
		if p.get("balanceVersion") not in LEGACY_BALANCE_VERSIONS:
			return {"ok": false, "reason": "legacy-version"}
		if not p.get("skills") is Dictionary or p.skills.size() != LEGACY_SKILLS.size():
			return {"ok": false, "reason": "legacy-skills"}
		for id in LEGACY_SKILLS:
			if not p.skills.has(id):
				return {"ok": false, "reason": "legacy-skills"}
		if not p.get("equipped") is Dictionary:
			return {"ok": false, "reason": "legacy-equipped"}
		for kind in ["passive", "active"]:
			if not p.equipped.has(kind):
				return {"ok": false, "reason": "legacy-equipped-" + kind}
			var equipped = p.equipped[kind]
			if equipped != null and (not equipped is String or equipped not in LEGACY_SKILLS):
				return {"ok": false, "reason": "legacy-equipped-" + kind}
			p.equipped[kind] = [] if equipped == null else [equipped]
		for id in ADDED_SKILLS:
			p.skills[id] = 0
		p.version = 3
		p.balanceVersion = PREVIOUS_BALANCE_VERSION
	if p.get("version") == 3:
		# Validate the complete original price/ownership ledger before any refund or new levels.
		var legacy_reason := _validate_legacy(p)
		if not legacy_reason.is_empty():
			return {"ok": false, "reason": legacy_reason}
		p = _migrate_collection(p, int(source_version), str(source_balance))
	if p.get("version") == 4 and p.get("edition") == "free-web" and p.get("balanceVersion") == WEB_V4_BALANCE_VERSION:
		if not _expand_web_profile(p):
			return {"ok": false, "reason": "previous-web-profile"}
	var reason := validate(p)
	if not reason.is_empty():
		return {"ok": false, "reason": reason}
	if not p.has("selectedRegion"):
		p.selectedRegion = 0
	if not p.has("bossRewards"):
		p.bossRewards = {}
	if not p.has("artworkAwards"):
		p.artworkAwards = {}
	return {"ok": true, "reason": "", "profile": p}

func _expand_web_profile(p: Dictionary) -> bool:
	if not p.get("skills") is Dictionary or p.skills.size() != LEGACY_SKILLS.size():
		return false
	if not p.get("purchaseTotals") is Dictionary or p.purchaseTotals.size() != catalog.tracks.size() + LEGACY_SKILLS.size() + 1:
		return false
	for id in LEGACY_SKILLS:
		if not p.skills.has(id) or not p.purchaseTotals.has(id):
			return false
	for id in ADDED_SKILLS:
		if p.purchaseTotals.has(id):
			return false
		p.skills[id] = 0
		p.purchaseTotals[id] = 0
	p.erase("edition")
	p.balanceVersion = BALANCE_VERSION
	var settlement = p.get("lastSettlement")
	if settlement is Dictionary and settlement.get("receipt") is Dictionary:
		if settlement.receipt.get("balanceVersion") == WEB_V4_BALANCE_VERSION:
			settlement.receipt.balanceVersion = BALANCE_VERSION
	return true

func _migrate_collection(p: Dictionary, source_version: int, source_balance: String) -> Dictionary:
	var levels := {}
	var costs := {}
	var refund := 0
	for id in RETIRED_TRACKS:
		levels[id] = int(p.upgrades[id])
		costs[id] = economy.legacy_track_spent(id, levels[id])
		refund += int(costs[id])
	var archive := {"sourceVersion": source_version, "sourceBalanceVersion": source_balance,
		"sourceRevision": p.revision, "originalEarned": p.earned, "originalSpent": p.spent,
		"upgrades": levels, "costs": costs, "totalSpent": refund}
	p.purchaseTotals = economy.initial_purchase_totals(p)
	for id in RETIRED_TRACKS:
		p.upgrades.erase(id)
	p.upgrades.debrisProcessing = 0
	p.upgrades.salvageYield = 0
	p.parts = Money.add(p.parts, refund)
	p.refunded = refund
	p.legacyCollection = archive
	p.collectionMigration = "legacy-collection-refund-v1"
	p.lastSettlement = null
	p.version = 4
	p.balanceVersion = BALANCE_VERSION
	return p

func _validate_legacy(p: Dictionary) -> String:
	if p.get("version") != 3 or p.get("campaign") != "arch" or p.get("balanceVersion") != PREVIOUS_BALANCE_VERSION:
		return "profile-version"
	for key in ["parts", "earned", "spent"]:
		if not uint(p.get(key)):
			return "invalid-" + key
	if int(p.earned) - int(p.spent) != int(p.parts):
		return "parts-ledger"
	var reason := _validate_common(p, true)
	if not reason.is_empty():
		return reason
	if economy.legacy_total_spent(p) != p.spent:
		return "purchase-ledger"
	return ""

func validate(p: Dictionary) -> String:
	if p.get("version") != 4 or p.get("campaign") != "arch" or p.get("balanceVersion") != BALANCE_VERSION:
		return "profile-version"
	for key in ["parts", "earned", "spent", "refunded"]:
		if not Money.valid(p.get(key)):
			return "invalid-" + key
	var income: Variant = Money.add(p.earned, p.refunded)
	if Money.compare(income, p.spent) < 0 or Money.compare(Money.subtract(income, p.spent), p.parts) != 0:
		return "parts-ledger"
	var reason := _validate_common(p, false)
	if not reason.is_empty():
		return reason
	reason = _validate_archive(p)
	if not reason.is_empty():
		return reason
	reason = economy.validate_purchase_totals(p)
	if not reason.is_empty():
		return reason
	if Money.compare(economy.total_spent(p), p.spent) != 0:
		return "purchase-ledger"
	if not p.has("lastSettlement"):
		return "settlement"
	if p.lastSettlement != null:
		if not p.lastSettlement is Dictionary or not p.lastSettlement.get("runId") is String or p.lastSettlement.runId.is_empty() or not p.lastSettlement.get("receipt") is Dictionary:
			return "settlement"
		var receipt: Dictionary = p.lastSettlement.receipt
		for key in ["reward", "bonus", "refinementBonus"]:
			if not Money.valid(receipt.get(key)):
				return "settlement-" + key
		if not uint(receipt.get("recovered")) or not uint(receipt.get("total")) or receipt.total < 1 or receipt.recovered > receipt.total:
			return "settlement-recovery"
		if Money.compare(Money.add(Money.add(receipt.recovered, receipt.refinementBonus), receipt.bonus), receipt.reward) != 0:
			return "settlement-reward"
		if receipt.get("ok") != true or receipt.get("balanceVersion") != BALANCE_VERSION or catalog.metadata(str(receipt.get("siteId", ""))).is_empty():
			return "settlement-receipt"
	if p.has("artworkAwards"):
		if not p.artworkAwards is Dictionary:
			return "artwork-awards"
		var region_ids := {}
		for region in catalog.regions:
			region_ids[region.id] = true
		for id in p.artworkAwards:
			if not id is String or not region_ids.has(id) or typeof(p.artworkAwards[id]) != TYPE_BOOL or p.artworkAwards[id] != true:
				return "artwork-award-region"
	return ""

func _validate_archive(p: Dictionary) -> String:
	if not p.get("legacyCollection") is Dictionary:
		return "collection-archive"
	var archive: Dictionary = p.legacyCollection
	if p.get("collectionMigration") == "fresh-v4":
		return "" if archive.is_empty() and Money.compare(p.refunded, 0) == 0 else "collection-archive"
	if p.get("collectionMigration") != "legacy-collection-refund-v1":
		return "collection-migration"
	var version: Variant = archive.get("sourceVersion")
	var valid_versions := {1: ["arch-campaign-v0.2", "arch-campaign-v0.2.1"], 2: LEGACY_BALANCE_VERSIONS, 3: [PREVIOUS_BALANCE_VERSION]}
	if not uint(version) or not valid_versions.has(int(version)) or archive.get("sourceBalanceVersion") not in valid_versions[int(version)]:
		return "collection-source"
	for key in ["sourceRevision", "originalEarned", "originalSpent", "totalSpent"]:
		if not uint(archive.get(key)):
			return "collection-" + key
	if archive.sourceRevision > p.revision or archive.originalSpent > archive.originalEarned or Money.compare(archive.originalSpent, p.spent) > 0 or Money.compare(archive.originalEarned, p.earned) > 0:
		return "collection-original-ledger"
	if not archive.get("upgrades") is Dictionary or archive.upgrades.size() != 4 or not archive.get("costs") is Dictionary or archive.costs.size() != 4:
		return "collection-tracks"
	var total := 0
	for id in RETIRED_TRACKS:
		if not uint(archive.upgrades.get(id)) or archive.upgrades[id] > catalog.legacy_tracks[id].cap or not uint(archive.costs.get(id)):
			return "collection-" + id
		var amount: int = economy.legacy_track_spent(id, int(archive.upgrades[id]))
		if amount != archive.costs[id]:
			return "collection-cost-" + id
		total += amount
	if total != archive.totalSpent or total > archive.originalSpent or Money.compare(total, p.refunded) != 0:
		return "collection-refund"
	return ""

func _validate_common(p: Dictionary, legacy: bool) -> String:
	for key in ["revision", "resetCount", "runCount", "bossAttempts", "workMs"]:
		if not uint(p.get(key)):
			return "invalid-" + key
	var expected_tracks: Dictionary = catalog.legacy_tracks if legacy else catalog.tracks
	if p.get("tutorial") not in ["intro", "upgrade", "next", "done"]:
		return "tutorial"
	if not p.get("owned") is Array or "bomb" not in p.owned or p.owned.size() > 2:
		return "owned"
	var seen := {}
	for id in p.owned:
		if id not in ["bomb", "blackhole"] or seen.has(id):
			return "owned"
		seen[id] = true
	if p.get("patterns") != ["dot"]:
		return "patterns"
	if not p.get("upgrades") is Dictionary or p.upgrades.size() != expected_tracks.size():
		return "upgrades"
	for id in expected_tracks:
		if not uint(p.upgrades.get(id)) or (legacy and p.upgrades[id] > expected_tracks[id].cap):
			return "upgrade-" + str(id)
	if not p.get("skills") is Dictionary or p.skills.size() != catalog.skills.size():
		return "skills"
	for id in catalog.skills:
		if not uint(p.skills.get(id)) or (legacy and p.skills[id] > catalog.skills[id].get("max", 5)):
			return "skill-" + str(id)
	if not p.get("stageRecords") is Dictionary:
		return "records"
	for id in p.stageRecords:
		var meta: Dictionary = catalog.metadata(str(id))
		var record = p.stageRecords[id]
		if meta.is_empty() or progression.site_region(str(id)) < 0 or not record is Dictionary:
			return "record-site"
		# Authored openings reduce current pixels without invalidating older clears.
		var limit := maxi(20000, maxi(int(meta.get("initial", 0)), int(meta.get("record_total_limit", 0))))
		if not uint(record.get("total")) or record.total < 1 or record.total > limit or not uint(record.get("recovered")) or record.recovered > record.total:
			return "record-total"
	if not p.get("equipped") is Dictionary:
		return "equipped"
	for kind in ["passive", "active"]:
		if not p.equipped.get(kind) is Array or p.equipped[kind].size() > progression.skill_slots(p, kind):
			return "equipped-" + kind
		var equipped_seen := {}
		for id in p.equipped[kind]:
			if not id is String or not catalog.skills.has(id) or catalog.skills[id].kind != kind or p.skills[id] < 1 or equipped_seen.has(id):
				return "equipped-" + kind
			equipped_seen[id] = true
	if typeof(p.get("bossCleared")) != TYPE_BOOL:
		return "boss-cleared"
	if p.has("bossRewards"):
		if not p.bossRewards is Dictionary:
			return "boss-rewards"
		for id in p.bossRewards:
			if p.bossRewards[id] != true or typeof(p.bossRewards[id]) != TYPE_BOOL or not catalog.metadata(str(id)).get("boss", false):
				return "boss-reward-site"
	if p.has("selectedRegion") and (not uint(p.selectedRegion) or p.selectedRegion >= catalog.regions.size()):
		return "region"
	if not p.has("lastSite") or (p.lastSite != null and catalog.metadata(str(p.lastSite)).is_empty()):
		return "last-site"
	if p.get("firstClearMs") != null and not uint(p.firstClearMs):
		return "first-clear-time"
	for key in ["history", "purchases"]:
		if not p.get(key) is Array or p[key].size() > 100:
			return key
		for entry in p[key]:
			if not entry is Dictionary:
				return key + "-entry"
	return ""
