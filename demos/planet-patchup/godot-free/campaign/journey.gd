extends RefCounted

signal browser_event(kind: String, payload: Dictionary)
const FreeWebBridge = preload("res://platform/free_web_bridge.gd")

const FreeEdition = preload("res://campaign/free_edition.gd")
const Progression = preload("res://campaign/progression.gd")
const Economy = preload("res://campaign/economy.gd")
const Schema = preload("res://campaign/profile_schema.gd")
const Store = preload("res://campaign/profile_store.gd")
const RunSession = preload("res://campaign/run_session.gd")
const Journal = preload("res://campaign/run_journal.gd")
const Legacy = preload("res://platform/legacy_profile.gd")
const Money = preload("res://campaign/money.gd")
var catalog
var profile: Dictionary = {}
var current_run
var notice := ""
var busy := false
var persistent := true
var last_run_site: Variant = null
var progression := Progression.new()
var economy := Economy.new()
var schema := Schema.new()
var store := Store.new()
var journal := Journal.new()

func setup(source) -> Error:
	catalog = source
	progression.setup(catalog)
	economy.setup(catalog, progression)
	schema.setup(catalog, economy, progression)
	store.setup(schema)
	var read := store.read()
	if not read.ok:
		profile = schema.fresh()
		notice = store.warning
		persistent = false
	else:
		profile = read.profile
		notice = store.warning
		persistent = not store.blocked
	last_run_site = profile.get("lastSite")
	journal.setup()
	return OK if read.ok else ERR_FILE_CORRUPT

func _result(ok: bool, reason := "", details: Dictionary = {}) -> Dictionary:
	var result := {"ok": ok, "reason": reason}
	result.merge(details)
	return result

func _begin() -> Dictionary:
	if busy:
		return _result(false, "busy")
	busy = true
	var disk := store.read()
	if not disk.ok or store.blocked:
		notice = store.warning
		persistent = false
		busy = false
		return _result(false, "storage")
	profile = disk.profile
	persistent = true
	return _result(true)

func _done(result: Dictionary) -> Dictionary:
	busy = false
	return result

func _commit(next: Dictionary) -> Dictionary:
	if int(next.revision) >= schema.MAX_SAFE_INTEGER:
		return _result(false, "revision-overflow")
	next.revision = int(profile.revision) + 1
	var saved := store.save(next)
	if saved.ok:
		profile = saved.profile
		notice = ""
	else:
		notice = "저장에 실패했습니다. 다시 시도하세요. (" + str(saved.reason) + ")"
	return saved

func stats() -> Dictionary:
	return economy.stats(profile)

func offers() -> Array:
	return economy.offers(profile)

func stage_open(id: String) -> bool:
	return progression.stage_open(profile, id)

func region_open(index: int) -> bool:
	return progression.region_open(profile, index)

func region_progress(index: int) -> Dictionary:
	return progression.region_progress(profile, index)

func planet_progress() -> float:
	return progression.planet_progress(profile)

func selected_region() -> int:
	return progression.selected_region(profile)

func skill_state() -> Dictionary:
	return {"skills": profile.skills.duplicate(), "equipped": profile.equipped.duplicate(true), "slots": progression.skill_slots(profile), "clears": progression.distinct_clears(profile), "offers": offers().filter(func(offer): return catalog.skills.has(offer.id))}

func _tutorial_id() -> String:
	return str(catalog.tutorial_id)

func start(mode := "stage", site_id := "") -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	if current_run != null:
		return _done(_result(false, "active"))
	if mode not in ["random", "stage", "retry", "boss", "tutorial", "training"]:
		return _done(_result(false, "mode"))
	var id := site_id
	if mode in ["tutorial", "training"]:
		id = _tutorial_id()
	elif mode == "boss":
		id = progression.boss_site(profile)
	elif mode == "retry":
		id = str(last_run_site) if last_run_site != null else ""
	elif mode == "random" or id.is_empty():
		id = progression.next_site(profile)
	if id.is_empty():
		return _done(_result(false, "no-previous-site"))
	var tutorial := id == _tutorial_id()
	if not FreeEdition.allows_site(id) or (not tutorial and not stage_open(id)):
		return _done(_result(false, "locked"))
	var site: Dictionary = catalog.site(id)
	if site.is_empty():
		return _done(_result(false, "site-data"))
	var next := profile.duplicate(true)
	next.lastSite = id
	if next.tutorial == "next":
		next.tutorial = "done"
	var saved := _commit(next)
	if not saved.ok:
		return _done(saved)
	var actual_mode := "boss" if site.get("boss", false) else "tutorial" if tutorial else "retry" if mode == "retry" else "stage"
	current_run = RunSession.new()
	current_run.setup(site, profile, actual_mode)
	last_run_site = id
	return _done(_result(true, "", {"site": site, "profile": profile.duplicate(true), "mode": actual_mode, "run": current_run}))

func attach_world(world) -> void:
	if current_run == null:
		return
	current_run.attach_world(world)
	current_run.journal = journal
	journal.start(current_run)
	browser_event.emit("run_started", FreeWebBridge.run_payload(current_run))

func buy(id: String, expected: Dictionary = {}) -> Dictionary:
	if not catalog.tracks.has(id) and not FreeEdition.allows_skill(id) and id != "blackhole":
		return _result(false, "unavailable")
	var ready := _begin()
	if not ready.ok:
		return ready
	if current_run != null:
		return _done(_result(false, "active"))
	if expected.has("revision") and expected.revision != profile.revision:
		return _done(_result(false, "stale"))
	var found: Array = offers().filter(func(offer): return offer.id == id)
	if found.is_empty():
		return _done(_result(false, "unknown"))
	var offer: Dictionary = found[0]
	if (expected.has("level") and expected.level != offer.level) or (expected.has("cost") and (not Money.valid(expected.cost) or not Money.valid(offer.cost) or Money.compare(expected.cost, offer.cost) != 0)):
		return _done(_result(false, "stale"))
	if not str(offer.get("numeric_error", "")).is_empty():
		return _done(_result(false, "numeric-limit"))
	if not offer.available:
		return _done(_result(false, "unavailable"))
	if Money.compare(profile.parts, offer.cost) < 0:
		return _done(_result(false, "insufficient"))
	var next := profile.duplicate(true)
	next.parts = Money.subtract(next.parts, offer.cost)
	next.spent = Money.add(next.spent, offer.cost)
	next.purchaseTotals[id] = Money.add(next.purchaseTotals[id], offer.cost)
	if catalog.tracks.has(id):
		next.upgrades[id] += 1
	elif catalog.skills.has(id):
		next.skills[id] += 1
		var kind: String = catalog.skills[id].kind
		if offer.level == 0 and id not in next.equipped[kind] and next.equipped[kind].size() < progression.skill_slots(next, kind):
			next.equipped[kind].append(id)
	else:
		next.owned.append(id)
	if next.tutorial == "upgrade":
		next.tutorial = "next"
	next.purchases.append({"id": id, "cost": offer.cost, "workMs": profile.workMs, "balanceVersion": schema.BALANCE_VERSION})
	next.purchases = next.purchases.slice(maxi(0, next.purchases.size() - 100))
	var saved: Dictionary = _commit(next)
	if saved.ok:
		browser_event.emit("purchase", {"id": id, "level": offer.level, "cost": offer.cost})
	return _done(saved)

func equip_skill(id: String, slot := -1) -> Dictionary:
	if not FreeEdition.allows_skill(id):
		return _result(false, "unavailable")
	var ready := _begin()
	if not ready.ok:
		return ready
	if current_run != null:
		return _done(_result(false, "active"))
	if not catalog.skills.has(id) or int(profile.skills.get(id, 0)) == 0:
		return _done(_result(false, "unowned"))
	var kind: String = catalog.skills[id].kind
	var equipped: Array = profile.equipped[kind]
	var capacity: int = progression.skill_slots(profile, kind)
	if slot < -1 or slot >= capacity or slot > equipped.size():
		return _done(_result(false, "slot"))
	if id in equipped:
		return _done(_result(true)) if slot == -1 or (slot < equipped.size() and equipped[slot] == id) else _done(_result(false, "duplicate-skill"))
	if slot == -1:
		if equipped.size() >= capacity:
			return _done(_result(false, "slots-full"))
		slot = equipped.size()
	var next := profile.duplicate(true)
	if slot == equipped.size():
		next.equipped[kind].append(id)
	else:
		next.equipped[kind][slot] = id
	return _done(_commit(next))

func unequip_skill(id: String) -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	if current_run != null:
		return _done(_result(false, "active"))
	if not catalog.skills.has(id):
		return _done(_result(false, "unknown"))
	var kind: String = catalog.skills[id].kind
	if id not in profile.equipped[kind]:
		return _done(_result(true))
	var next := profile.duplicate(true)
	next.equipped[kind].erase(id)
	return _done(_commit(next))

func select_region(index: int) -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	if current_run != null:
		return _done(_result(false, "active"))
	if not region_open(index):
		return _done(_result(false, "locked"))
	if profile.get("selectedRegion", 0) == index:
		return _done(_result(true))
	var next := profile.duplicate(true)
	next.selectedRegion = index
	return _done(_commit(next))

func checkpoint_stage() -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	var run = current_run
	if run == null or run.world == null or run.settling:
		return _done(_result(false, "no-run"))
	if run.profile.resetCount != profile.resetCount:
		_abort_reset(run)
		return _done(_result(false, "reset"))
	if run.mode == "tutorial":
		return _done(_result(false, "tutorial"))
	if not run.qualified():
		return _done(_result(false, "not-qualified"))
	var next := profile.duplicate(true)
	progression.remember(next, run.site.id, run.recovered(), run.total())
	progression.grant_skills(next)
	if next.stageRecords == profile.stageRecords and next.skills == profile.skills:
		return _done(_result(true))
	return _done(_commit(next))

func _abort_reset(run) -> void:
	browser_event.emit("run_abandoned", {"run": FreeWebBridge.run_payload(run), "reason": "progress-reset"})
	run.seal()
	journal.abandon(run, "progress-reset")
	current_run = null

func finish() -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	var run = current_run
	if run == null or run.world == null:
		return _done(_result(false, "no-run"))
	if run.profile.resetCount != profile.resetCount:
		_abort_reset(run)
		return _done(_result(false, "reset"))
	if profile.lastSettlement != null and profile.lastSettlement.runId == run.id:
		var previous: Dictionary = profile.lastSettlement.receipt.duplicate(true)
		run.seal()
		current_run = null
		return _done(previous)
	run.settling = true
	run.pause(true)
	run.secure_loose()
	var recovered: int = run.recovered()
	var total: int = run.total()
	var work_ms := roundi(run.work_ms)
	if recovered < 0 or recovered > total or total <= 0:
		return _done(_result(false, "invalid-recovery"))
	var qualified: bool = run.qualified()
	var boss: bool = run.mode == "boss"
	var first_clear: bool = boss and qualified and not progression.boss_rewarded(profile, run.site.id)
	var bonus := (4000 if first_clear else 1000) if boss and qualified else 0
	var refinement: Variant = Money.refinement_bonus(recovered, int(run.profile.upgrades.get("salvageYield", 0)))
	var reward: Variant = Money.add(Money.add(recovered, refinement), bonus)
	var next := profile.duplicate(true)
	if run.mode != "tutorial":
		progression.remember(next, run.site.id, recovered, total)
	next.parts = Money.add(next.parts, reward)
	next.earned = Money.add(next.earned, reward)
	next.workMs += work_ms
	next.runCount += 1
	next.bossAttempts += int(boss)
	next.lastSite = run.site.id
	if first_clear:
		next.bossRewards[run.site.id] = true
		if progression.site_region(run.site.id) == 0:
			next.bossCleared = true
			if next.firstClearMs == null:
				next.firstClearMs = next.workMs
	progression.grant_skills(next)
	if run.mode == "tutorial" and profile.tutorial == "intro" and Money.compare(next.parts, 300) >= 0:
		next.tutorial = "upgrade"
	var snapshot: Dictionary = run.snapshot()
	next.history.append({"runId": run.id, "site": run.site.id, "mode": run.mode, "workMs": work_ms, "recovered": recovered,
		"total": total, "reward": reward, "refinementBonus": refinement, "bonus": bonus,
		"collectionTier": snapshot.get("collectionTier", 0), "cleanupDurationMs": snapshot.get("cleanupDurationMs", 0),
		"finishReason": snapshot.get("finishReason", ""), "balanceVersion": schema.BALANCE_VERSION,
		"batteryUsed": snapshot.energyUsed, "tools": run.used_tools.duplicate()})
	next.history = next.history.slice(maxi(0, next.history.size() - 100))
	var region: int = progression.site_region(run.site.id)
	var receipt := _result(true, "", {"recovered": recovered, "total": total, "reward": reward, "bonus": bonus, "refinementBonus": refinement,
		"collectionTier": snapshot.get("collectionTier", 0), "cleanupDurationMs": snapshot.get("cleanupDurationMs", 0),
		"finishReason": snapshot.get("finishReason", ""), "balanceVersion": schema.BALANCE_VERSION,
		"qualified": qualified, "firstClear": first_clear, "bossCleared": next.bossCleared,
		"mode": run.mode, "siteName": run.site.name, "siteId": run.site.id, "regionIndex": region,
		"nextRegion": region + 1 if boss and qualified and progression.region_open(next, region + 1) else null,
		"nextStage": null, "allClear": recovered == total, "ratio": float(recovered) / total, "workMs": work_ms})
	next.lastSettlement = {"runId": run.id, "receipt": receipt.duplicate(true)}
	var result := _commit(next)
	if not result.ok:
		# The frozen run remains retryable; its ID and reward are committed together exactly once.
		return _done(result)
	browser_event.emit("run_finished", {"run": FreeWebBridge.run_payload(run), "result": receipt.duplicate(true)})
	journal.finish(run, receipt, profile)
	run.seal()
	last_run_site = run.site.id
	current_run = null
	return _done(receipt)

func reset_progress(expected_revision: int) -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	if current_run != null:
		return _done(_result(false, "active"))
	if expected_revision != profile.revision:
		return _done(_result(false, "stale"))
	var next: Dictionary = schema.fresh()
	next.revision = profile.revision
	next.resetCount = profile.resetCount + 1
	var saved := _commit(next)
	if saved.ok:
		last_run_site = null
	return _done(saved)

func skip_tutorial() -> Dictionary:
	var ready := _begin()
	if not ready.ok:
		return ready
	var next := profile.duplicate(true)
	next.tutorial = "done"
	var result := _commit(next)
	if result.ok and current_run != null and current_run.guide != null:
		current_run.guide.skip()
	return _done(result)

func preview_import(data: Variant) -> Dictionary:
	var decoded: Dictionary = Legacy.decode_export(data, schema)
	if not decoded.ok:
		return decoded
	var p: Dictionary = decoded.profile
	return _result(true, "", {"profile": p, "preview": {"parts": p.parts, "runCount": p.runCount,
		"revision": p.revision, "resetCount": p.resetCount, "planetProgress": progression.planet_progress(p),
		"source": decoded.get("source", "currentProfile")}})

func import_profile(data: Variant) -> Dictionary:
	if busy:
		return _result(false, "busy")
	if current_run != null:
		return _result(false, "active")
	var decoded := preview_import(data)
	if not decoded.ok:
		return decoded
	busy = true
	var result: Dictionary = store.import_verified(decoded.profile)
	if result.ok:
		profile = result.profile
		last_run_site = profile.lastSite
		persistent = not store.blocked
		notice = str(result.get("warning", ""))
	else:
		notice = "가져오기에 실패했습니다. 원본 백업은 보존됩니다. (" + str(result.reason) + ")"
	return _done(result)

func export_profile() -> Dictionary:
	if current_run != null:
		journal.checkpoint(current_run)
	return journal.export_data(profile)

func abandon(reason := "abandoned") -> Dictionary:
	if current_run == null:
		return _result(false, "no-run")
	browser_event.emit("run_abandoned", {"run": FreeWebBridge.run_payload(current_run), "reason": reason})
	journal.abandon(current_run, reason)
	current_run.seal()
	current_run = null
	return _result(true)
