extends RefCounted

const MapData = preload("res://campaign/map_data.gd")
const MAP_CACHE_LIMIT := 2
const RETIRED_TRACKS := ["suction", "range", "collectBatch", "collectInterval"]
var regions: Array = []
var sites: Array = []
var tracks: Dictionary = {}
var legacy_tracks: Dictionary = {}
var skills: Dictionary = {}
var assets: Dictionary = {}
var vfx_sheets: Dictionary = {}
var balance: Dictionary = {}
var tutorial_id: String = ""
var last_error: String = ""
var _metadata: Dictionary = {}
var _maps: Dictionary = {}
var _textures: Dictionary = {}

func _read_dictionary(file_path: String) -> Dictionary:
	if not FileAccess.file_exists(file_path):
		last_error = "Missing content: " + file_path
		return {}
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		last_error = "Cannot read content: " + file_path
		return {}
	var parser := JSON.new()
	var error := parser.parse(file.get_as_text())
	if error != OK or not parser.data is Dictionary:
		last_error = "Invalid content: " + file_path + " " + parser.get_error_message()
		return {}
	return parser.data

func load_catalog() -> Error:
	last_error = ""
	var campaign := _read_dictionary("res://data/campaign.json")
	if campaign.is_empty():
		return ERR_FILE_CORRUPT
	var next_balance := _read_dictionary("res://data/balance.json")
	if next_balance.is_empty():
		return ERR_FILE_CORRUPT
	var expansion := _read_dictionary("res://data/skill_expansion.json")
	if expansion.is_empty():
		return ERR_FILE_CORRUPT
	var collection := _read_dictionary("res://data/collection_upgrades.json")
	if collection.get("schema_version") != 1 or not collection.get("tracks") is Dictionary or collection.tracks.keys().size() != 2 or not collection.tracks.has("debrisProcessing") or not collection.tracks.has("salvageYield"):
		last_error = "Collection upgrades have an invalid schema."
		return ERR_FILE_CORRUPT
	var asset_data := _read_dictionary("res://data/assets.json")
	if asset_data.is_empty():
		return ERR_FILE_CORRUPT
	if not campaign.get("regions") is Array or not campaign.get("sites") is Array or not next_balance.get("tracks") is Dictionary or not next_balance.get("skills") is Dictionary or not asset_data.get("assets") is Dictionary or not asset_data.get("vfx_sheets") is Dictionary:
		last_error = "Content catalog has an invalid schema."
		return ERR_FILE_CORRUPT
	if expansion.get("schema_version") != 1 or not expansion.get("skills") is Dictionary or not expansion.get("legacy_metadata") is Dictionary:
		last_error = "Skill expansion has an invalid schema."
		return ERR_FILE_CORRUPT
	var next_skills: Dictionary = next_balance.skills.duplicate(true)
	for id in expansion.legacy_metadata:
		var meta = expansion.legacy_metadata[id]
		if not next_skills.has(id) or not meta is Dictionary:
			last_error = "Skill expansion references an unknown original skill."
			return ERR_FILE_CORRUPT
		# Existing prices, levels and effects remain the original paid catalog's values.
		next_skills[id].region = int(meta.get("region", 0))
		next_skills[id].icon = str(meta.get("icon", ""))
	for id in expansion.skills:
		var skill = expansion.skills[id]
		if next_skills.has(id) or not skill is Dictionary or skill.get("kind") not in ["passive", "active"] or not skill.get("prices") is Array or skill.prices.size() != int(skill.get("max", 0)) - 1:
			last_error = "Skill expansion contains an invalid or duplicate skill."
			return ERR_FILE_CORRUPT
		next_skills[id] = skill.duplicate(true)
	next_balance.skills = next_skills
	var original_tracks: Dictionary = next_balance.tracks.duplicate(true)
	var next_tracks: Dictionary = original_tracks.duplicate(true)
	for id in RETIRED_TRACKS:
		next_tracks.erase(id)
	for id in collection.tracks:
		next_tracks[id] = collection.tracks[id].duplicate(true)
	next_balance.tracks = next_tracks
	next_balance.balance_version = str(collection.get("balance_version", "paid-final-collection-v1"))
	var next_metadata: Dictionary = {}
	for value in campaign.sites:
		if not value is Dictionary or not value.get("id") is String or next_metadata.has(value.id):
			last_error = "Content catalog has an invalid or duplicate site."
			return ERR_FILE_CORRUPT
		next_metadata[value.id] = value
	var next_tutorial: String = str(campaign.get("tutorial", ""))
	if next_tutorial.is_empty() or not campaign.get("tutorial_metadata") is Dictionary:
		last_error = "Content catalog has no tutorial."
		return ERR_FILE_CORRUPT
	next_metadata[next_tutorial] = campaign.tutorial_metadata
	# Commit only after every catalog file is readable; failed loads never erase state.
	regions = campaign.regions
	sites = campaign.sites
	balance = next_balance
	tracks = balance.tracks
	legacy_tracks = original_tracks
	skills = balance.skills
	assets = asset_data.assets
	vfx_sheets = asset_data.vfx_sheets
	tutorial_id = next_tutorial
	_metadata = next_metadata
	_maps.clear()
	_textures.clear()
	return OK

func metadata(id: String) -> Dictionary:
	return _metadata.get(id, {})

func site(id: String) -> Dictionary:
	if _maps.has(id):
		var cached: Dictionary = _maps[id]
		_maps.erase(id)
		_maps[id] = cached
		return cached
	if not _metadata.has(id):
		last_error = "Unknown site: " + id
		return {}
	var value := _read_dictionary("res://data/maps/" + id + ".json")
	if value.is_empty():
		return {}
	if value.get("width") != _metadata[id].get("width") or value.get("height") != _metadata[id].get("height"):
		last_error = "Site dimensions differ from catalog: " + id
		return {}
	value = MapData.expand(value)
	if value.is_empty():
		last_error = "Invalid map encoding: " + id
		return {}
	var width: int = int(value.get("width", 0))
	var height: int = int(value.get("height", 0))
	if value.get("id") != id or width < 1 or height < 1:
		last_error = "Invalid site dimensions or identity: " + id
		return {}
	for key in ["cells", "roles", "colors"]:
		if not value.get(key) is Array or value[key].size() != width * height:
			last_error = "Invalid " + key + " for site: " + id
			return {}
	# Eviction releases only this cache reference; active run owners keep their map.
	if _maps.size() >= MAP_CACHE_LIMIT:
		_maps.erase(_maps.keys()[0])
	_maps[id] = value
	return value

func region(index: int) -> Dictionary:
	if index < 0 or index >= regions.size():
		return {}
	return regions[index]

static func effect_stats(id: String, owned_level: int) -> Dictionary:
	var maximum := 10 if id == "aftershock" else 1 if id == "recharge" else 5
	var level := clampi(owned_level, 1, maximum)
	var tail := 1.0 + 0.08 * sqrt(float(maxi(0, owned_level - maximum)))
	var gain := 1.0 + 0.1 * (mini(3, level - 1) if id in ["relay", "slam", "expand", "wave"] else level - 1)
	gain *= tail
	var result := {"level": maxi(1, owned_level), "gain": gain}
	match id:
		"aftershock":
			result.merge({"threshold": 3, "echoes": 2 + floori(float(level - 1) / 3.0), "power": [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 1.0][level - 1] * tail})
		"relay":
			result.merge({"threshold": 4 if level == 5 else 5, "power": 0.65 * gain})
		"slam":
			result.merge({"threshold": 5 if level == 5 else 6, "lift_power": 1.5 * gain, "slam_power": 2.0 * gain, "delay": 0.8})
		"expand":
			result.merge({"threshold": 4 if level == 5 else 5, "start_radius": 2.0, "radius": 11.0, "duration": 1.6, "pulse_interval": 0.15, "pressure": 1.5 * gain, "outward_power": 0.16 * gain, "final_radius": 2.0, "final_power": 0.6 * gain})
		"wave":
			result.merge({"threshold": 5 if level == 5 else 6, "pulses_per_side": 4, "spacing": 7.0, "pulse_interval": 0.12, "pressure": 1.6 * gain, "upward_power": 0.6 * gain})
		"orbital":
			result.payloads = 5 + int(level >= 3) + int(level >= 5)
		"seismic":
			result.merge({"targets": 12, "coverage": 1.2 if level >= 3 else 1.0, "followup_power": 0.5 if level >= 5 else 0.0})
		"gravity":
			result.merge({"duration": 4.2 + 0.25 * int(level >= 3) + 0.25 * int(level >= 5), "down_acceleration": 280.0 * gain, "contact_fatigue": 0.18 * gain})
		"sonic":
			result.merge({"duration": 1.65 + 0.25 * int(level >= 3) + 0.25 * int(level >= 5), "steps": 12, "pressure": 0.6 * gain, "inward_power": 1.2 * gain})
		"recharge":
			result.recharge_fraction = 1.0 - 0.75 / (1.0 + 0.05 * (maxi(1, owned_level) - 1))
		_:
			return {}
	return result

func asset_path(key: String) -> String:
	return str(assets.get(key, ""))

func texture(key: String) -> Texture2D:
	if _textures.has(key):
		return _textures[key]
	var file_path := asset_path(key)
	if file_path.is_empty() or not ResourceLoader.exists(file_path):
		last_error = "Missing texture: " + key
		return null
	var resource := load(file_path) as Texture2D
	if resource == null:
		last_error = "Invalid texture: " + key
		return null
	_textures[key] = resource
	return resource
