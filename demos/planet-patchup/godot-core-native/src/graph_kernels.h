#pragma once
#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/packed_float64_array.hpp>
#include <godot_cpp/variant/packed_int32_array.hpp>
#include <godot_cpp/variant/packed_vector2_array.hpp>
using namespace godot;
class PPFractureGraph : public RefCounted {
  GDCLASS(PPFractureGraph, RefCounted)
protected:
  static void _bind_methods();

public:
  static int64_t bond_key(int64_t a, int64_t b, int64_t count);
  static double noise(int64_t x, int64_t y);
  static Array neighbors(int64_t id, int64_t width, int64_t count);
  Dictionary build(Array material, int64_t width, Dictionary bonds,
                   int64_t count = 18055);
  Array distances(Dictionary graph, Array contact_ids);
};
class PPFractureConnectivity : public RefCounted {
  GDCLASS(PPFractureConnectivity, RefCounted)
protected:
  static void _bind_methods();

public:
  Node *world = nullptr;
  bool dirty = false;
  PackedInt32Array weights, visited;
  Array links, adjacency;
  int64_t visit_stamp = 0;
  void setup(Node *source, Array remaining, Array initial_groups,
             Array candidates);
  void setup_unprofiled(Node *source, Array remaining, Array initial_groups,
                        Array candidates);
  void prepare();
  bool allows_cut(Array cut_bonds, int64_t limit);
  bool allows_cut_unprofiled(Array cut_bonds, int64_t limit);
  bool get_dirty() const { return dirty; }
  void set_dirty(bool value) { dirty = value; }
};
class PPSectionGraph : public RefCounted {
  GDCLASS(PPSectionGraph, RefCounted)
protected:
  static void _bind_methods();

public:
  Array ids, links, row_nodes;
  Dictionary index_of, roots, member_cache;
  PackedInt32Array rows, support_height, visited, parents, counts, firsts;
  PackedVector2Array points;
  PackedFloat64Array sums_x, sums_y;
  int64_t upper_row = -1, stamp = 0;
  bool exact_half_points = true;
  void setup(Node *world, Array source_ids, Variant supports);
  void update_supports(Variant supports);
  bool supported(int64_t id, int64_t cut_row);
  void _reset_upper();
  int64_t _root(int64_t index);
  void _join(int64_t a, int64_t b);
  bool belongs(int64_t id, int64_t tag);
  Array summaries(int64_t cut_row);
  Dictionary _walk(int64_t seed, int64_t cut_row);
  Array members(int64_t tag, int64_t cut_row);
  Array upper(int64_t cut_row);
  bool _tag_less(Dictionary a, Dictionary b);
  bool _count_greater(Dictionary a, Dictionary b);
};
