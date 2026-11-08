extends RefCounted

const ROW_LIMIT := 512
const EVENT_LIMIT := 2048
var enabled := bool(ProjectSettings.get_setting("diagnostics/attack_trace", false))
var rows: Array = []
var conversions: Array = []
var dropped_rows := 0
var dropped_events := 0
var sequence := 0
var primary_sequence := 0
var latest: Dictionary = {}
var previous: Dictionary = {}
var _scopes: Array = []

func reset() -> void:
	rows.clear()
	conversions.clear()
	_scopes.clear()
	latest = {}
	previous = {}
	sequence = 0
	primary_sequence = 0
	dropped_rows = 0
	dropped_events = 0

func _row() -> Dictionary:
	for index in range(_scopes.size() - 1, -1, -1):
		if _scopes[index].has("row"):
			return _scopes[index].row
	return {}

func push(source: String) -> void:
	if enabled:
		_scopes.append({"source": source})

func pop() -> void:
	if enabled:
		_scopes.pop_back()

func begin_blast(bomb: Dictionary, point: Vector2, radius: float, power: float, time: float, pixelized: int) -> void:
	if not enabled:
		return
	sequence += 1
	var secondary: bool = bomb.get("secondary", false) or bomb.get("ideaSecondary", false)
	if not secondary:
		primary_sequence += 1
	var row := {"id": sequence, "primaryNumber": primary_sequence, "secondary": secondary,
		"kind": str(bomb.get("kind", "secondary" if secondary else "primary")),
		"time": time, "wallTicksMs": Time.get_ticks_msec(), "center": [point.x, point.y],
		"radius": radius, "power": power, "haloScopeRadius": float(bomb.get("scope_radius", -1.0)), "direct": 0, "directMaxDistance": -1.0,
		"directOutsideRadiusFound": false, "extra": 0, "extraByPhase": {}, "extraByMechanism": {},
		"laterObserved": 0, "laterByPhase": {}, "beforePixelized": pixelized, "nestedNew": 0}
	rows.append(row)
	if rows.size() > ROW_LIMIT:
		rows.pop_front()
		dropped_rows += 1
	if not secondary:
		previous = latest
		latest = row
	_scopes.append({"row": row, "source": "blast-cut"})

func direct(count: int, max_distance: float) -> void:
	if not enabled:
		return
	var row := _row()
	if row.is_empty():
		return
	row.direct += count
	row.directMaxDistance = maxf(float(row.directMaxDistance), max_distance)
	# Candidates are sorted by distance by the existing native cut kernel.
	row.directOutsideRadiusFound = max_distance > float(row.radius) + 0.00001

func halo(reach: float, strength: float, changed_bonds: int) -> void:
	if not enabled:
		return
	var row := _row()
	if not row.is_empty():
		row.haloRadius = reach
		row.haloStrength = strength
		row.haloChangedBonds = changed_bonds

func pixels(mechanism: String, count: int, time: float) -> void:
	if not enabled or count <= 0:
		return
	var row := _row()
	var during_blast := not row.is_empty()
	var source := str(_scopes[-1].source) if not _scopes.is_empty() else "outside-blast"
	var event := {"time": time, "count": count, "mechanism": mechanism, "phase": source,
		"blastId": int(row.get("id", 0)), "observedAfterPrimary": int(latest.get("id", 0)),
		"relation": "during-blast" if during_blast else "temporal-only"}
	conversions.append(event)
	if conversions.size() > EVENT_LIMIT:
		conversions.pop_front()
		dropped_events += 1
	if during_blast:
		row.extra += count
		row.extraByPhase[source] = int(row.extraByPhase.get(source, 0)) + count
		row.extraByMechanism[mechanism] = int(row.extraByMechanism.get(mechanism, 0)) + count
	elif not latest.is_empty():
		# A later fall/skill is an observation window, never an assumed causal link.
		latest.laterObserved += count
		latest.laterByPhase[source] = int(latest.laterByPhase.get(source, 0)) + count

func finish_blast(pixelized: int, bodies: int, passives: Dictionary) -> void:
	if not enabled:
		return
	var row := _row()
	row.observedNew = pixelized - int(row.beforePixelized)
	row.unclassified = int(row.observedNew) - int(row.direct) - int(row.extra) - int(row.nestedNew)
	row.bodyCountAfter = bodies
	row.passiveCountsAfter = passives.duplicate()
	_scopes.pop_back()
	var parent := _row()
	if not parent.is_empty():
		parent.nestedNew += int(row.observedNew)

func export_data() -> Dictionary:
	return {"schemaVersion": 1, "build": "0.5.56(66)", "units": "logical-cells/pixels",
		"laterAttribution": "temporal observation after primary, not proven causality",
		"detonations": rows.duplicate(true), "conversions": conversions.duplicate(true),
		"droppedDetonations": dropped_rows, "droppedConversions": dropped_events,
		"limits": {"detonations": ROW_LIMIT, "conversions": EVENT_LIMIT}}

func hud_text() -> String:
	if latest.is_empty():
		return "폭파 진단 g56 · 공격 대기\n실제 반경 / 직접 제거 / 추가 픽셀화\n공격 후 낙하·스킬은 ‘이후’로 별도 기록"
	var row := latest
	var types: Dictionary = row.extraByMechanism
	var small := int(types.get("small-fragment", 0))
	var limit := int(types.get("body-limit", 0))
	var later: Dictionary = row.laterByPhase
	var distance := "—" if float(row.directMaxDistance) < 0 else "%.2f" % float(row.directMaxDistance)
	var lines := [
		"#%d · %.2fs · 실제 반경 %.2f칸%s" % [row.primaryNumber, row.time, row.radius, " !범위밖" if row.directOutsideRadiusFound else ""],
		"직접 %d개 · 추가 %d개 · 미분류 %d" % [row.direct, row.extra, row.get("unclassified", 0)],
		"추가: 작은조각 %d / 한도 %d / 기타 %d" % [small, limit, int(row.extra) - small - limit],
		"주변균열 %.2f칸 · 직접 최장 %s칸" % [row.get("haloRadius", 0.0), distance],
		"이후 +%d (압력 %d · 낙하 %d · 연쇄 %d)" % [row.laterObserved, later.get("pressure", 0), later.get("fall", 0), later.get("chain", 0)]]
	if not previous.is_empty():
		lines.append("직전 #%d R%.2f · 직접%d / 추가%d" % [previous.primaryNumber, previous.radius, previous.direct, previous.extra])
	return "\n".join(lines)
