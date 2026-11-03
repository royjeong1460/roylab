extends RefCounted

const Diagnostics = preload("res://platform/diagnostics.gd")

enum { OTHER, SKILL, EXPAND, DAMAGE, FRACTURE, CONNECT, SUPPORT, BODY, GRAINS, EFFECTS, HUD, DRAW,
	SECTION, GEOMETRY, TOPOLOGY, CACHE, CONTACT, GROUND, JOINT, REST, HINGE, STATIC,
	GRID, DISPLACE, SETTLED, FLYING, SAND, WORLD, COORDS, FR_GRAPH, FR_WAVE, CUT_GRAPH, CUT_CHECK, COLLISION, MINIMAP, SIZE }
const SUPPORT_DETAILS := [SECTION, GEOMETRY, TOPOLOGY, CACHE, CONTACT, GROUND, JOINT, REST, HINGE, STATIC]
const WINDOW_USEC := 500000
const NAMES := {OTHER: "앱/루프", SKILL: "스킬 처리", EXPAND: "압력 확산", DAMAGE: "폭파/손상",
	FRACTURE: "파괴 판정", CONNECT: "연결 묶음", SUPPORT: "지지 계산", BODY: "몸체 생성",
	GRAINS: "잔해 기타", EFFECTS: "효과/소리", HUD: "화면 UI", DRAW: "잔해 그리기",
	GRID: "격자 갱신", DISPLACE: "잔해 밀림", SETTLED: "잔해 목록", FLYING: "잔해 낙하", SAND: "모래",
	WORLD: "월드 기타", COORDS: "픽셀 좌표", FR_GRAPH: "균열 생성", FR_WAVE: "균열 전파",
	CUT_GRAPH: "절단 준비", CUT_CHECK: "절단 연결검사", COLLISION: "몸체 물리", MINIMAP: "미니맵"}
var enabled := Diagnostics.is_enabled()
var peak: Dictionary = {}
var recent: Dictionary = {}
var pulses := 0
var created := 0
var shapes := 0
var physics_steps := 0
var topology_reuses := 0
var grid_reuses := 0
var body_grid_reuses := 0
var roster_reuses := 0
var grid_rebuilds := 0
var projected_pixels := 0
var _times := PackedInt64Array()
var _inclusive := PackedInt64Array()
var _calls := PackedInt32Array()
var _longest := PackedInt64Array()
var _stack: Array[int] = []
var _started: Array[int] = []
var _last_scope := 0
var _last_frame := 0
var _last_input := 0
var _last_blasts := 0
var _window_times := PackedInt64Array()
var _window_frames := 0
var _window_usec := 0
var _window_steps := 0
var _window_world_usec := 0
var _window_blasts := 0
var _window_created := 0
var _window_shapes := 0
var _window_grid_rebuilds := 0
var _window_projected_pixels := 0
var _window_details: Dictionary = {}
var _window_detail_calls: Dictionary = {}
var _render_viewport: WeakRef

# Secondary inclusive intervals; never added to the exclusive code totals.
func note_detail(name: String, usec: int) -> void:
	if enabled:
		_window_details[name] = int(_window_details.get(name, 0)) + usec
		_window_detail_calls[name] = int(_window_detail_calls.get(name, 0)) + 1

func _disable_render_probe() -> void:
	if _render_viewport != null:
		var viewport = _render_viewport.get_ref()
		if is_instance_valid(viewport):
			RenderingServer.viewport_set_measure_render_time(viewport.get_viewport_rid(), false)
	_render_viewport = null

func _sync_render_probe(world) -> void:
	var viewport: Viewport = world.get_viewport()
	if _render_viewport == null or _render_viewport.get_ref() != viewport:
		_disable_render_probe()
		_render_viewport = weakref(viewport)
		RenderingServer.viewport_set_measure_render_time(viewport.get_viewport_rid(), true)

func _engine_snapshot(world) -> Dictionary:
	var viewport: Viewport = world.get_viewport()
	var rid: RID = viewport.get_viewport_rid()
	return {"physics_ms": Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0,
		"active": int(Performance.get_monitor(Performance.PHYSICS_2D_ACTIVE_OBJECTS)),
		"pairs": int(Performance.get_monitor(Performance.PHYSICS_2D_COLLISION_PAIRS)),
		"draw_calls": RenderingServer.viewport_get_render_info(rid, RenderingServer.VIEWPORT_RENDER_INFO_TYPE_CANVAS, RenderingServer.VIEWPORT_RENDER_INFO_DRAW_CALLS_IN_FRAME),
		"render_setup_ms": RenderingServer.get_frame_setup_time_cpu(),
		"render_cpu_ms": RenderingServer.viewport_get_measured_render_time_cpu(rid),
		"render_gpu_ms": RenderingServer.viewport_get_measured_render_time_gpu(rid)}

func _init() -> void:
	_times.resize(SIZE)
	_inclusive.resize(SIZE)
	_calls.resize(SIZE)
	_longest.resize(SIZE)
	_window_times.resize(SIZE)
	_clear()
	_clear_window()

func set_enabled(value: bool) -> void:
	if enabled == value:
		return
	# Called deferred between frames: scopes must never span a toggle.
	enabled = value
	_stack.clear()
	_started.clear()
	_last_scope = 0
	_last_input = 0
	peak.clear()
	suspend()

func begin(stage: int) -> void:
	if not enabled:
		return
	var now := Time.get_ticks_usec()
	if not _stack.is_empty():
		_times[_stack.back()] += now - _last_scope
	_stack.append(stage)
	_started.append(now)
	_calls[stage] += 1
	_last_scope = now

func end() -> void:
	if not enabled:
		return
	var now := Time.get_ticks_usec()
	var stage: int = _stack.pop_back()
	_times[stage] += now - _last_scope
	var duration := now - int(_started.pop_back())
	_inclusive[stage] += duration
	_longest[stage] = maxi(_longest[stage], duration)
	_last_scope = now

func _clear() -> void:
	_times.fill(0)
	_inclusive.fill(0)
	_calls.fill(0)
	_longest.fill(0)
	pulses = 0
	created = 0
	shapes = 0
	physics_steps = 0
	topology_reuses = 0
	grid_reuses = 0
	body_grid_reuses = 0
	roster_reuses = 0
	grid_rebuilds = 0
	projected_pixels = 0

func _clear_window() -> void:
	_window_times.fill(0)
	_window_frames = 0
	_window_usec = 0
	_window_steps = 0
	_window_world_usec = 0
	_window_blasts = 0
	_window_created = 0
	_window_shapes = 0
	_window_grid_rebuilds = 0
	_window_projected_pixels = 0
	_window_details.clear()
	_window_detail_calls.clear()

func note_input() -> void:
	if enabled:
		_last_input = Time.get_ticks_usec()

func suspend() -> void:
	_disable_render_probe()
	_last_frame = 0
	_clear()
	_clear_window()
	recent.clear()

func frame(world) -> void:
	if not enabled:
		return
	_sync_render_probe(world)
	var now := Time.get_ticks_usec()
	if _last_frame != 0:
		var gap := now - _last_frame
		var measured := 0
		for stage in range(SIZE):
			measured += _times[stage]
			_window_times[stage] += _times[stage]
		if peak.is_empty() or gap > int(peak.gap):
			peak = {"gap": gap, "time": world.elapsed, "phase": "회수" if world.final_collection_active else "파괴",
				"times": _times.duplicate(), "physics_steps": physics_steps, "measured": measured,
				"bodies": world.pieces.size(), "grains": world.grains.size(), "created": created, "shapes": shapes}
		_window_frames += 1
		_window_usec += gap
		_window_steps += physics_steps
		_window_world_usec += _inclusive[WORLD]
		_window_blasts += maxi(0, int(world.blasts) - _last_blasts)
		_window_created += created
		_window_shapes += shapes
		_window_grid_rebuilds += grid_rebuilds
		_window_projected_pixels += projected_pixels
		if _window_usec >= WINDOW_USEC:
			recent = {"times": _window_times.duplicate(), "frames": _window_frames, "usec": _window_usec,
				"steps": _window_steps, "world_usec": _window_world_usec, "blasts": _window_blasts,
				"created": _window_created, "shapes": _window_shapes,
				"grid_rebuilds": _window_grid_rebuilds, "projected_pixels": _window_projected_pixels,
				"bodies": world.pieces.size(), "grains": world.grains.size(),
				"flying": world.grain_physics._flying.size(), "sand": world.grain_physics.settled.size(),
				"sleeping": world.grain_physics._blocked.size(), "surface": world.grain_physics.surface.size(),
				"tiny_fragments": world.sand_fragment_count,
				"input_age": -1.0 if _last_input == 0 else (now - _last_input) / 1000000.0}
			recent.details = _window_details.duplicate()
			recent.detail_calls = _window_detail_calls.duplicate()
			recent.engine = _engine_snapshot(world)
			recent.roster_full = world.grain_physics.roster_full_rebuilds
			recent.roster_added = world.grain_physics.roster_added
			recent.roster_removed = world.grain_physics.roster_removed
			recent.render_full = world._grain_surface._native.full_rebuilds
			recent.render_cached = int(world._grain_surface._native.cached_grains) if not world.final_collection_active else 0
			recent.render_moving = int(world._grain_surface._native.moving_grains) if not world.final_collection_active else 0
			recent.render_chunks = int(world._grain_surface._native.chunk_count) if not world.final_collection_active else 0
			recent.chunk_uploads = int(world._grain_surface._native.chunk_uploads)
			_clear_window()
	_last_frame = now
	_last_blasts = int(world.blasts)
	_clear()

# Every exclusive microsecond appears exactly once; tiny support subscopes are one row.
func _ranked(times: PackedInt64Array) -> Array:
	var result: Array = []
	for stage in NAMES:
		var duration: int = times[stage]
		if stage == SUPPORT:
			for detail in SUPPORT_DETAILS:
				duration += times[detail]
		result.append({"stage": stage, "usec": duration})
	result.sort_custom(func(a, b): return a.usec > b.usec if a.usec != b.usec else a.stage < b.stage)
	return result

func report() -> String:
	if recent.is_empty():
		return "Godot C++/g40 · 최근 FPS/계산 측정 중…\n0.5초 이상 모아서 같은 구간끼리 비교해요."
	var frames := float(recent.frames)
	var seconds: float = recent.usec / 1000000.0
	var ranked := _ranked(recent.times)
	var measured := 0
	for item in ranked:
		measured += int(item.usec)
	var lines: Array[String] = [
		"Godot C++/g40 · 최근 %.1fs · FPS %.1f · %.1fms/화면" % [seconds, frames / seconds, recent.usec / frames / 1000.0],
		"코드 %.1fms · 미계측 %.1fms" % [measured / frames / 1000.0, maxf(0.0, recent.usec - measured) / frames / 1000.0],
		"물리 %.1f회/화면 · 월드1회 %.1fms" % [recent.steps / frames, recent.world_usec / float(maxi(1, recent.steps)) / 1000.0],
	]
	var shown := 0
	for index in range(3):
		var item: Dictionary = ranked[index]
		shown += int(item.usec)
		lines.append("%d. %s %.1fms" % [index + 1, NAMES[item.stage], item.usec / frames / 1000.0])
	var details: Dictionary = recent.get("details", {})
	lines.append("압력상세/화면(중복포함): 후보 %.1f · 탐색 %.1f" % [float(details.get("pressure_candidates", 0)) / frames / 1000.0, float(details.get("pressure_nearest", 0)) / frames / 1000.0])
	lines.append("압력상세: 손상 %.1f · 밀기 %.1f ms" % [float(details.get("pressure_apply", 0)) / frames / 1000.0, float(details.get("pressure_kick", 0)) / frames / 1000.0])
	var engine: Dictionary = recent.get("engine", {})
	lines.append("엔진참고 물리/회 %.1fms(코드포함)" % float(engine.get("physics_ms", 0.0)))
	lines.append("활성몸체 %d · 충돌쌍 %d · 드로콜 %d" % [int(engine.get("active", 0)), int(engine.get("pairs", 0)), int(engine.get("draw_calls", 0))])
	var cpu_ms: float = engine.get("render_cpu_ms", 0.0)
	var gpu_ms: float = engine.get("render_gpu_ms", 0.0)
	lines.append("렌더 CPU %s · GPU %s · 준비 %.1fms" % ["%.1fms" % cpu_ms if cpu_ms > 0 else "미제공", "%.1fms" % gpu_ms if gpu_ms > 0 else "미제공", float(engine.get("render_setup_ms", 0.0))])
	lines.append("표시 묶음 %d · 개별 %d · 구역 %d · 갱신누적 %d" % [int(recent.get("render_cached", 0)), int(recent.get("render_moving", 0)), int(recent.get("render_chunks", 0)), int(recent.get("chunk_uploads", 0))])
	var input_age := "공격 전" if recent.input_age < 0 else "공격 뒤 %.1fs" % recent.input_age
	lines.append("%s · 폭발 호출 %d회/구간" % [input_age, recent.blasts])
	lines.append("조각 %d · 잔해 %d · 새조각/충돌체 %d/%d" % [recent.bodies, recent.grains, recent.created, recent.shapes])
	lines.append("낙하 %d · 활동모래 %d · 휴면 %d" % [recent.flying, maxi(0, recent.sand - recent.sleeping), recent.sleeping])
	if not peak.is_empty():
		var worst: Dictionary = _ranked(peak.times)[0]
		lines.append("최악 %.1fms · %s %.1fms · 물리%d회" % [peak.gap / 1000.0, NAMES[worst.stage], worst.usec / 1000.0, peak.physics_steps])
	return "\n".join(lines)
