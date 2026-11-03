extends MultiMeshInstance2D

# Sleeping grains share chunk images; only the moving subset uses instances.
const GameSkin = preload("res://app/skin.gd")
const CHUNK_PIXELS := 32 * 4
var _revision := -1
var _reset := -1
var _chunks: Dictionary = {}
var _tile := PackedByteArray()
var _palette := -1
var _native = ClassDB.instantiate("PPRenderKernel")

func _init() -> void:
	show_behind_parent = true
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	multimesh = MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_2D
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = PackedVector2Array([Vector2(-2, -2), Vector2(2, -2), Vector2(2, 2), Vector2(-2, 2)])
	arrays[Mesh.ARRAY_TEX_UV] = PackedVector2Array([Vector2(0, 0), Vector2(1, 0), Vector2(1, 1), Vector2(0, 1)])
	arrays[Mesh.ARRAY_INDEX] = PackedInt32Array([0, 1, 2, 0, 2, 3])
	var quad := ArrayMesh.new()
	quad.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	multimesh.mesh = quad
	multimesh.visible_instance_count = 0

func sync(world) -> void:
	visible = not world.final_collection_active
	var dirty: Dictionary = world.grain_physics.draw_dirty
	var added: Dictionary = world.grain_render_added
	var removed: Dictionary = world.grain_render_removed
	if not visible:
		if _revision >= 0:
			_native.clear_grains(multimesh)
			_clear_chunks()
		dirty.clear()
		added.clear()
		removed.clear()
		_revision = -1
		return
	var palette := 1 if GameSkin.bright() else 0
	var palette_changed := palette != _palette
	if palette_changed:
		var face: Color = world.collectible_color()
		var rim := Color("398a65") if palette == 1 else Color("518c76")
		var image := Image.create(4, 4, false, Image.FORMAT_RGBA8)
		image.fill(face)
		image.fill_rect(Rect2i(3, 0, 1, 4), rim)
		image.fill_rect(Rect2i(0, 3, 3, 1), rim)
		texture = ImageTexture.create_from_image(image)
		_tile = image.get_data()
		_palette = palette
	var rebuild: bool = palette_changed or _revision < 0 or _reset != world.grain_render_reset or world.grain_render_revision != world.grain_roster_revision
	if _revision != world.grain_roster_revision and added.is_empty() and removed.is_empty():
		rebuild = true
	if rebuild:
		_clear_chunks()
	var updates: Array = _native.sync_grains(multimesh, world.grains, dirty, added, removed, world.grain_physics._blocked, world.grain_physics.settled, rebuild, world.width, world.height, _tile)
	for update: Dictionary in updates:
		var key: Vector2i = update.chunk
		var image: Image = update.image
		var sprite: Sprite2D = _chunks.get(key)
		if image == null:
			if sprite != null:
				sprite.hide()
				sprite.queue_free()
				_chunks.erase(key)
		elif sprite == null:
			sprite = Sprite2D.new()
			sprite.centered = false
			sprite.position = Vector2(key) * CHUNK_PIXELS
			sprite.show_behind_parent = true
			sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
			sprite.texture = ImageTexture.create_from_image(image)
			add_child(sprite)
			_chunks[key] = sprite
		else:
			(sprite.texture as ImageTexture).update(image)
	_revision = world.grain_roster_revision
	_reset = world.grain_render_reset

func _clear_chunks() -> void:
	for sprite: Sprite2D in _chunks.values():
		sprite.hide()
		sprite.queue_free()
	_chunks.clear()
