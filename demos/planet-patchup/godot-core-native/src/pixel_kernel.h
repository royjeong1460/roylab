#pragma once
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>
#include <godot_cpp/variant/packed_int32_array.hpp>
#include <godot_cpp/variant/packed_vector2_array.hpp>
#include <vector>
namespace godot {
class PPPixelKernel : public RefCounted {
  GDCLASS(PPPixelKernel, RefCounted)
  std::vector<int32_t> marks;
  int32_t stamp = 0;

protected:
  static void _bind_methods();

public:
  Array groups(const Array &ids, int width, int count, const Dictionary &bonds);
  bool larger_group(const Array &a, const Array &b) const {
    return a.size() > b.size();
  }
  Array rectangles(const Array &ids, int width) const;
  PackedInt32Array project(const Array &ids, const PackedVector2Array &points,
                           Vector2 origin, Vector2 position, double rotation,
                           int width, int bottom) const;
  Array material(const Array &ids, const PackedVector2Array &points,
                 Vector2 origin, Vector2 position, double rotation) const;
  Array static_ids(const PackedByteArray &cells) const;
  Dictionary occupancy(const Array &fixed, const Array &grids, int count) const;
  Dictionary body_geometry(const Array &ids,
                           const PackedVector2Array &points) const;
};
} // namespace godot
