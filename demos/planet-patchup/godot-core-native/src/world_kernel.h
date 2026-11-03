#pragma once
#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>
#include <godot_cpp/variant/packed_vector2_array.hpp>
using namespace godot;
class PPWorldKernel : public RefCounted {
  GDCLASS(PPWorldKernel, RefCounted)
protected:
  static void _bind_methods();

public:
  Array emissions(Array pixels, PackedVector2Array original, Vector2 origin,
                  double rotation, Vector2 velocity, double angular);
  PackedByteArray clear_ids(PackedByteArray cells, Array ids);
  Dictionary snap(PackedByteArray cells, Array cuts, int64_t width,
                  PackedVector2Array points);
  PackedByteArray remove_cells(PackedByteArray cells, Array pixels);
  Dictionary group_stats(Array groups);
  Array static_material(Array ids, Array cache, PackedVector2Array points);
  Array static_square(Vector2 point, double radius, int64_t width,
                      int64_t height, PackedByteArray cells, Array cache,
                      PackedVector2Array points);
  Dictionary cut(Array materials, Vector2 point, double radius,
                 PackedByteArray cells);
  Array blast(Array pieces, Array grains, Vector2 point, double reach,
              double power);
  Array receiver(Array pixels, Vector2 point, Array groups);
  Dictionary crush(Array pixels, Array segments, double reach, int64_t limit,
                   double budget, bool fall);
  Array edges(Dictionary graph, Array distances, Vector2 normal, double reach,
              bool fall);
  Dictionary crack(Node *world, Array remaining, Array before, Array edges,
                   Dictionary crushed, Dictionary bonds, double budget,
                   double span, bool fall);
  Dictionary compression(Array children, Vector2 point, double budget);
  int64_t auto_index(Array grains, int64_t width);
  Dictionary suction(Array grains, Vector2 from, Vector2 to, double radius,
                     int64_t count);
  Dictionary secure(Array grains, Dictionary collected, Array colors);
  bool _distance_less(Dictionary a, Dictionary b);
  bool _near_less(Dictionary a, Dictionary b);
  bool _edge_distance_less(Dictionary a, Dictionary b);
  bool _edge_score_less(Dictionary a, Dictionary b);
};
