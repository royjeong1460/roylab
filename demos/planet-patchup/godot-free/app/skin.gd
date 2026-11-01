extends RefCounted

const PATH := "user://free-web-skin-v1.json"
static var _initialized := false
static var _id := 2
static var _colors: Dictionary = {}
static var _textures: Dictionary = {}

static func setup() -> void:
	if _initialized: return
	_initialized = true
	if FileAccess.file_exists(PATH):
		var saved = JSON.parse_string(FileAccess.get_file_as_string(PATH))
		if saved is Dictionary and saved.get("skin") in [1,2]: _id = int(saved.skin)

static func bright() -> bool:
	setup()
	return _id == 2

static func select(id: int) -> Error:
	if id not in [1,2]: return ERR_INVALID_PARAMETER
	setup()
	var payload := JSON.stringify({"skin":id})
	var temporary := PATH+".tmp"
	var file := FileAccess.open(temporary,FileAccess.WRITE)
	if file == null: return FileAccess.get_open_error()
	file.store_string(payload)
	file.flush()
	var error := file.get_error()
	file.close()
	if error != OK: return error
	if FileAccess.get_file_as_string(temporary) != payload: return ERR_FILE_CORRUPT
	error = DirAccess.rename_absolute(ProjectSettings.globalize_path(temporary),ProjectSettings.globalize_path(PATH))
	if error != OK: return error
	_id = id
	_colors.clear()
	_textures.clear()
	return OK

static func hud(key: String) -> Color:
	var original := {"cream":"d7d2b2","sand":"ede4c3","ink":"394337","pale":"eee4c3","olive":"63714e"}
	var light := {"cream":"fff4da","sand":"fff4da","ink":"32432d","pale":"fff4da","olive":"ebdfbf"}
	return Color((light if bright() else original)[key])

static func art(color: Color) -> Color:
	if not bright() or color.a <= 0: return color
	var key := color.to_rgba32()
	if _colors.has(key): return _colors[key]
	# Lift shadow detail and warm the original palette without changing source pixels.
	var r := pow(color.r,0.88)
	var g := pow(color.g,0.88)
	var b := pow(color.b,0.88)
	var luminance := r*0.2126+g*0.7152+b*0.0722
	var result := Color(clampf(luminance+(r-luminance)*1.08+0.012,0,1),clampf(luminance+(g-luminance)*1.08+0.006,0,1),clampf(luminance+(b-luminance)*1.08,0,1),color.a)
	_colors[key] = result
	return result

static func texture(source: Texture2D) -> Texture2D:
	if not bright() or source == null: return source
	# File paths stay stable when a new sortie reloads the same background art.
	var key := source.resource_path if not source.resource_path.is_empty() else str(source.get_instance_id())
	if _textures.has(key): return _textures[key]
	var image := source.get_image()
	if image == null: return source
	image = image.duplicate()
	if image.is_compressed() and image.decompress() != OK: return source
	image.convert(Image.FORMAT_RGBA8)
	for y in range(image.get_height()):
		for x in range(image.get_width()):
			var color := image.get_pixel(x,y)
			if color.a > 0: image.set_pixel(x,y,art(color))
	var result := ImageTexture.create_from_image(image)
	_textures[key] = result
	return result

static func arch_style(original: Dictionary, tier: float) -> Dictionary:
	if not bright(): return original
	return {"sky":Color("c7e7dd" if tier==1.0 else "b9dfd0" if tier==0.7 else "abd5c5"),"horizon":Color("ddd5b2"),"ground":Color("b59a71" if tier==1.0 else "aa8b66" if tier==0.7 else "9a805f"),"dust":0.0 if tier>0 else 0.035}

static func culture_style(original: Dictionary) -> Dictionary:
	if not bright(): return original
	return {"sky":Color(original.sky).lerp(Color("b9dfd0"),0.3).lightened(0.025),"distant":art(Color(original.distant)),"ground":art(Color(original.ground)),"edge":art(Color(original.edge))}
