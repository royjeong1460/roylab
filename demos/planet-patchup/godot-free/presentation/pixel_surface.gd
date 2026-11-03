extends MeshInstance2D

var _native = ClassDB.instantiate("PPRenderKernel")

func configure(atlas: Texture2D, rectangles: Array, center: Vector2, pixel_scale: float) -> void:
	texture = atlas
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var extent := Vector2(atlas.get_width(),atlas.get_height())
	var arrays: Array = _native.pixel_mesh_arrays(rectangles, center, pixel_scale, extent)
	if arrays.is_empty(): return
	var surface := ArrayMesh.new()
	surface.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays)
	mesh = surface
