extends MeshInstance2D

func configure(atlas: Texture2D, rectangles: Array, center: Vector2, pixel_scale: float) -> void:
	texture = atlas
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	var vertices := PackedVector2Array()
	var uvs := PackedVector2Array()
	var indices := PackedInt32Array()
	var extent := Vector2(atlas.get_width(),atlas.get_height())
	for rect: Rect2 in rectangles:
		var start := vertices.size()
		var corners := [rect.position,Vector2(rect.end.x,rect.position.y),rect.end,Vector2(rect.position.x,rect.end.y)]
		for corner: Vector2 in corners:
			vertices.append((corner-center)*pixel_scale)
			uvs.append(corner/extent)
		indices.append_array(PackedInt32Array([start,start+1,start+2,start,start+2,start+3]))
	if vertices.is_empty(): return
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = indices
	var surface := ArrayMesh.new()
	surface.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES,arrays)
	mesh = surface
