extends RefCounted

const FIELDS := ["cells", "roles", "colors", "module_of"]
const ENCODING := "occupied-runs-v1"

static func _integer(value: Variant, minimum: int, maximum: int) -> bool:
	return typeof(value) in [TYPE_INT, TYPE_FLOAT] and is_finite(float(value)) and value >= minimum and value <= maximum and float(value) == floor(float(value))

static func expand(source: Variant) -> Dictionary:
	if not source is Dictionary:
		return {}
	if source.get("schema_version") == 1:
		return source
	if source.get("schema_version") != 2 or source.get("encoding") != ENCODING:
		return {}
	if not _integer(source.get("width"), 1, 2147483647) or not _integer(source.get("height"), 1, 2147483647):
		return {}
	var size := int(source.width) * int(source.height)
	if size > 2147483647 or not _integer(source.get("initial"), 0, size) or not source.get("modules") is Array:
		return {}
	if not source.get("pixel_runs") is Array or source.pixel_runs.size() % 6 != 0:
		return {}
	if typeof(source.get("omit_initial", false)) != TYPE_BOOL or typeof(source.get("omit_module_of", false)) != TYPE_BOOL:
		return {}
	var omit_modules: bool = source.get("omit_module_of", false)
	for field in FIELDS:
		if source.has(field):
			return {}
	var runs: Array = source.pixel_runs
	var end := 0
	var occupied := 0
	# Validate before allocating grid-sized arrays; corrupted runs never partly load.
	for offset in range(0, runs.size(), 6):
		if not _integer(runs[offset], end, size - 1) or not _integer(runs[offset + 1], 1, size):
			return {}
		end = int(runs[offset]) + int(runs[offset + 1])
		if end > size or not _integer(runs[offset + 2], 1, 255) or not _integer(runs[offset + 3], 1, 3):
			return {}
		if not _integer(runs[offset + 4], 0, 16777215) or not _integer(runs[offset + 5], -1 if omit_modules else 0, -1 if omit_modules else source.modules.size() - 1):
			return {}
		occupied += int(runs[offset + 1])
	if occupied != int(source.initial):
		return {}
	var cells: Array = []
	var roles: Array = []
	var colors: Array = []
	var modules: Array = []
	for grid in [cells, roles, colors, modules]:
		grid.resize(size)
		grid.fill(0)
	modules.fill(-1)
	for offset in range(0, runs.size(), 6):
		var start := int(runs[offset])
		for id in range(start, start + int(runs[offset + 1])):
			cells[id] = runs[offset + 2]
			roles[id] = runs[offset + 3]
			colors[id] = runs[offset + 4]
			modules[id] = runs[offset + 5]
	var result: Dictionary = source.duplicate()
	result.erase("encoding")
	result.erase("pixel_runs")
	if source.get("omit_initial", false):
		result.erase("initial")
	result.erase("omit_initial")
	result.erase("omit_module_of")
	result.schema_version = 1
	result.cells = cells
	result.roles = roles
	result.colors = colors
	if not omit_modules:
		result.module_of = modules
	return result
