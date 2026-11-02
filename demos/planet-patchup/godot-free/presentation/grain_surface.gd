extends MultiMeshInstance2D

# Retain all collectible IDs; only changed positions cross the rendering API.
const GameSkin = preload("res://app/skin.gd")
var _revision := -1
var _slots: Dictionary = {}
var _palette := -1

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
	if not visible:
		_revision = -1
		return
	var palette := 1 if GameSkin.bright() else 0
	if palette != _palette:
		var face: Color = world.collectible_color()
		var rim := Color("398a65") if palette == 1 else Color("518c76")
		var image := Image.create(4, 4, false, Image.FORMAT_RGBA8)
		image.fill(face)
		image.fill_rect(Rect2i(3, 0, 1, 4), rim)
		image.fill_rect(Rect2i(0, 3, 3, 1), rim)
		texture = ImageTexture.create_from_image(image)
		_palette = palette
	var dirty: Dictionary = world.grain_physics.draw_dirty
	if _revision != world.grain_roster_revision:
		var count: int = world.grains.size()
		if count > multimesh.instance_count:
			var capacity := maxi(128, multimesh.instance_count)
			while capacity < count:
				capacity *= 2
			multimesh.instance_count = capacity
		# The world bounds contain flying grains too; avoid per-instance AABB work.
		multimesh.custom_aabb = AABB(Vector3(-4, -4, -1), Vector3((world.width + 2) * 4, (world.height + 2) * 4, 2))
		_slots.clear()
		for i in range(count):
			var grain: Dictionary = world.grains[i]
			_slots[grain.id] = i
			multimesh.set_instance_transform_2d(i, Transform2D(0.0, grain.p * 4.0))
		multimesh.visible_instance_count = count
		_revision = world.grain_roster_revision
	else:
		for id in dirty:
			if _slots.has(id):
				multimesh.set_instance_transform_2d(_slots[id], Transform2D(0.0, dirty[id].p * 4.0))
	dirty.clear()
