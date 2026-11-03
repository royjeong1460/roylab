#pragma once
#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>
#include <godot_cpp/variant/packed_vector2_array.hpp>
using namespace godot;
class PPStructureKernel : public RefCounted {
  GDCLASS(PPStructureKernel, RefCounted)
protected:
  static void _bind_methods();

public:
  Dictionary geometry(Dictionary topology, Node *world, Array ids,
                      double cut_limit, Variant supports, bool enabled,
                      Dictionary body_rows, Dictionary body_bounds);
  Array candidates(Dictionary geometry, Dictionary reserve, Dictionary groups,
                   double angle, int64_t width, bool enabled,
                   bool selected_only);
  bool _bearing_less(Dictionary a, Dictionary b);
  bool _utilization_greater(Dictionary a, Dictionary b);
  Dictionary support_bodies(Array samples, Dictionary piece_y,
                            Dictionary initial, int64_t passes);
  Dictionary resting(Array pieces, Dictionary bodies, Array samples,
                     Dictionary previous, Dictionary initial);
  Dictionary owners(Array pieces);
  Dictionary seams(Array cuts, Dictionary owners, int64_t width);
  Array collision_pairs(Dictionary links);
  Dictionary propagate(Dictionary supported, Array edges, int64_t passes);
  bool pivot_only(Array samples, Variant piece, Variant static_body,
                  Vector2 pivot);
  Dictionary owned(Array ids);
  Dictionary baseline(Array original, PackedByteArray roles, Array modules,
                      int64_t width);
  bool damaged(Array bearings, int64_t y, PackedByteArray roles, Array modules,
               int64_t width, Dictionary rows, Dictionary bounds, bool enabled);
  Dictionary pillar_lengths(Array ids, PackedByteArray roles, Dictionary bonds,
                            int64_t width, int64_t count);
  double column_load(Array bearings, Dictionary lengths, double load,
                     double lever, double angle, int64_t width, bool enabled);
  void invalidate(Dictionary bonds, Dictionary previous, Dictionary sections,
                  Dictionary topology, int64_t width, int64_t count);
  Dictionary topology(Array ids, PackedByteArray roles, Dictionary bonds,
                      int64_t width, int64_t count, PackedVector2Array points);
  Array live_bearings(Array bearings, Array ids, PackedByteArray cells,
                      Dictionary bonds, int64_t width);
  Array hinge_ids(Array ids, Array bearings, PackedByteArray cells,
                  PackedByteArray roles, int64_t width);
  Array nearest_pixels(Array ids, PackedVector2Array original, Vector2 origin,
                       Vector2 position, double rotation, Array points,
                       Array initial);
  double cut_limit(Array points, Vector2 origin, Vector2 position,
                   double rotation);
  Dictionary register_hinge(Dictionary groups, int64_t group, int64_t row,
                            Array original, Array ids, int64_t width);
  double release_angle(Array lower, PackedByteArray cells, int64_t original);
  Array column_breaks(Array ids, Array bearings, PackedByteArray roles,
                      Array original, Dictionary bonds, int64_t width,
                      int64_t count, PackedVector2Array points);
  bool _weak_less(Dictionary a, Dictionary b);
  bool _row_less(Dictionary a, Dictionary b);
};
