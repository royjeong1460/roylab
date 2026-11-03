#pragma once
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>
#include <godot_cpp/variant/packed_int32_array.hpp>
#include <godot_cpp/variant/packed_int64_array.hpp>
#include <godot_cpp/variant/vector2.hpp>
namespace godot {
class PPGrainPhysics : public RefCounted {
  GDCLASS(PPGrainPhysics, RefCounted)
  Object *world = nullptr;
  int64_t roster_full_rebuilds = 0, roster_added = 0, roster_removed = 0;
  double flying_elapsed = 0, sand_elapsed = 0;
  int64_t tick = 0, motion_revision = 0, roster_revision = -1,
          occupancy_revision = -1, overlap_fixes = 0, surface_wakes = 0;
  Dictionary settled, sand_rows, row_plans, spill_cache, draw_dirty, surface,
      surface_masks, blocked;
  Array flying;
  PackedByteArray body_cells, occupancy;
  PackedInt32Array row_order, ground_surface;
  bool row_order_dirty = true, has_terrain = false;
  int64_t width = 0, height = 0, floor_y = 0, blocked_width = 0,
          blocked_bottom = 0;
  void cache_world();
  double ground_y(double x) const;
  bool terrain(int64_t c) const;
  int64_t cell(Vector2 p) const;
  Vector2 center(int64_t c) const;
  bool occupied(int64_t c) const;
  bool body_occupied(int64_t c) const;
  void rebuild_settled();
  int64_t sand_row(int64_t c) const;
  void add_sand_cell(int64_t c);
  void remove_sand_cell(int64_t c);
  void wake(int64_t c);
  void wake_above(int64_t c);
  bool stable_cell(int64_t c) const;
  void refresh_surface(int64_t c);
  void refresh_neighbours(int64_t c);
  int64_t body_mask(int64_t c) const;
  PackedInt64Array row_plan(int64_t row);
  int64_t spill_from_overlap(int64_t c);
  void rasterize_and_displace();
  void step_flying(double dt);
  void fast_sand_tick();
  void begin(int scope);
  void end();

protected:
  static void _bind_methods();

public:
  int64_t get_roster_full_rebuilds() const { return roster_full_rebuilds; }
  int64_t get_roster_added() const { return roster_added; }
  int64_t get_roster_removed() const { return roster_removed; }
  void setup(Object *owner);
  void reset();
  void step(double dt);
  void roster_changed(const Array &added, const Array &removed, int64_t revision);
  Dictionary get_settled() const { return settled; }
  Dictionary get_draw_dirty() const { return draw_dirty; }
  Dictionary get_surface() const { return surface; }
  Dictionary get_blocked() const { return blocked; }
  Array get_flying() const { return flying; }
  int64_t get_motion_revision() const { return motion_revision; }
  int64_t get_overlap_fixes() const { return overlap_fixes; }
  int64_t get_surface_wakes() const { return surface_wakes; }
};
} // namespace godot
