extends RefCounted

const V2_KEYS := ["pixel-demolition-arch-v2-a", "pixel-demolition-arch-v2-b"]
const V1_KEYS := ["pixel-demolition-arch-v1-a", "pixel-demolition-arch-v1-b"]
const JOURNAL_PREFIX := "pixel-demolition-arch-journal-v1:run:"
const MAX_IMPORT_BYTES := 16 * 1024 * 1024

static func decode_export(data: Variant, schema) -> Dictionary:
	var value = data
	if value is String:
		if value.to_utf8_buffer().size() > MAX_IMPORT_BYTES:
			return {"ok": false, "reason": "import-size"}
		var json := JSON.new()
		if json.parse(value) != OK:
			return {"ok": false, "reason": "import-json", "line": json.get_error_line(), "message": json.get_error_message()}
		value = json.data
	if not value is Dictionary:
		return {"ok": false, "reason": "import-object"}
	var source := "profile"
	if value.has("currentProfile"):
		if value.get("campaign", "arch") != "arch" or (value.has("edition") and value.edition != "free-web"):
			return {"ok": false, "reason": "import-campaign"}
		if value.has("balanceVersion") and value.balanceVersion not in ["arch-campaign-v0.2", "arch-campaign-v0.2.1", "arch-campaign-v0.2.2", "arch-campaign-v0.2.3", schema.WEB_V4_BALANCE_VERSION, schema.BALANCE_VERSION]:
			return {"ok": false, "reason": "import-campaign"}
		value = value.currentProfile
		source = "currentProfile"
	var result: Dictionary = schema.normalize(value)
	if result.ok:
		result.source = source
	return result

static func read_export(path: String, schema) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return {"ok": false, "reason": "import-open", "error": FileAccess.get_open_error()}
	if file.get_length() > MAX_IMPORT_BYTES:
		file.close()
		return {"ok": false, "reason": "import-size"}
	var text := file.get_as_text()
	file.close()
	return decode_export(text, schema)

static func select_free_slots(slots: Dictionary, schema) -> Dictionary:
	for key in slots:
		if key not in V2_KEYS + V1_KEYS or not slots[key] is String:
			return {"ok": false, "reason": "legacy-key"}
	var keys: Array = V2_KEYS if V2_KEYS.any(func(key): return slots.has(key)) else V1_KEYS
	var valid: Array = []
	var originals: Array = []
	for key in keys:
		if not slots.has(key):
			continue
		var raw: String = slots[key]
		var parsed: Dictionary = decode_export(raw, schema)
		if not parsed.ok:
			return {"ok": false, "reason": "legacy-corrupt", "key": key, "detail": parsed.reason}
		# A legacy slot can contain a newer profile or an export accepted by decode_export.
		valid.append(parsed.profile)
		originals.append(JSON.parse_string(raw))
	if valid.is_empty():
		return {"ok": false, "reason": "legacy-empty"}
	# Compare raw parsed source objects too: normalization must not hide a conflict.
	if valid.size() == 2 and valid[0].revision == valid[1].revision and JSON.stringify(originals[0], "", true) != JSON.stringify(originals[1], "", true):
		return {"ok": false, "reason": "legacy-conflict"}
	valid.sort_custom(func(a, b): return a.revision > b.revision)
	return {"ok": true, "reason": "", "profile": valid[0], "source": "free-localStorage"}
