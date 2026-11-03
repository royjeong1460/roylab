#include "grain_kernel.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/core/class_db.hpp>
namespace godot {
// performance_probe.gd enum values: DISPLACE=23, SETTLED=24, FLYING=25,
// SAND=26. Keep each begin/end around the same source work.
// Dictionary/Array copies intentionally retain Godot shared-container
// semantics; grain dictionaries are also owned by world.grains and the drawing
// ledger.

void PPGrainPhysics::_bind_methods() {
  ClassDB::bind_method(D_METHOD("setup", "owner_world"),
                       &PPGrainPhysics::setup);
  ClassDB::bind_method(D_METHOD("reset"), &PPGrainPhysics::reset);
  ClassDB::bind_method(D_METHOD("step", "dt"), &PPGrainPhysics::step);
  ClassDB::bind_method(D_METHOD("roster_changed", "added", "removed", "revision"), &PPGrainPhysics::roster_changed);
#define PROP(name, method, type)                                               \
  ClassDB::bind_method(D_METHOD("get_" name), &PPGrainPhysics::method);        \
  ADD_PROPERTY(PropertyInfo(type, name), "", "get_" name)
  PROP("roster_full_rebuilds", get_roster_full_rebuilds, Variant::INT);
  PROP("roster_added", get_roster_added, Variant::INT);
  PROP("roster_removed", get_roster_removed, Variant::INT);
  PROP("settled", get_settled, Variant::DICTIONARY);
  PROP("draw_dirty", get_draw_dirty, Variant::DICTIONARY);
  PROP("surface", get_surface, Variant::DICTIONARY);
  PROP("_blocked", get_blocked, Variant::DICTIONARY);
  PROP("_flying", get_flying, Variant::ARRAY);
  PROP("motion_revision", get_motion_revision, Variant::INT);
  PROP("overlap_fixes", get_overlap_fixes, Variant::INT);
  PROP("surface_wakes", get_surface_wakes, Variant::INT);
#undef PROP
}
void PPGrainPhysics::cache_world() {
  width = world->get("width");
  height = world->get("height");
  floor_y = world->get("floor_y");
  ground_surface = world->get("ground_surface");
  has_terrain = world->get("has_terrain");
  occupancy = world->get("occupancy");
}
double PPGrainPhysics::ground_y(double x) const {
  return ground_surface.is_empty() ? double(floor_y)
                                   : double(ground_surface[std::clamp<int64_t>(
                                         std::floor(x), 0, width - 1)]);
}
bool PPGrainPhysics::terrain(int64_t c) const {
  return c >= 0 && c < width * height &&
         std::floor(double(c) / width) >= ground_y(double(c % width));
}
int64_t PPGrainPhysics::cell(Vector2 p) const {
  return int64_t(std::floor(p.y)) * width + int64_t(std::floor(p.x));
}
Vector2 PPGrainPhysics::center(int64_t c) const {
  return Vector2(c % width + 0.5, std::floor(double(c) / width) + 0.5);
}
bool PPGrainPhysics::occupied(int64_t c) const {
  return terrain(c) || (c >= 0 && c < occupancy.size() && occupancy[c] != 0) ||
         settled.has(c);
}
bool PPGrainPhysics::body_occupied(int64_t c) const {
  return c >= 0 && c < body_cells.size() && body_cells[c] != 0;
}
void PPGrainPhysics::begin(int scope) {
  Object *p = world->get("perf");
  p->call("begin", scope);
}
void PPGrainPhysics::end() {
  Object *p = world->get("perf");
  p->call("end");
}
void PPGrainPhysics::setup(Object *owner) {
  world = owner;
  reset();
}
void PPGrainPhysics::reset() {
  roster_full_rebuilds = roster_added = roster_removed = 0;
  flying_elapsed = 0;
  sand_elapsed = 0;
  tick = 0;
  motion_revision = 0;
  settled.clear();
  body_cells = PackedByteArray();
  blocked.clear();
  roster_revision = -1;
  flying.clear();
  sand_rows.clear();
  row_plans.clear();
  row_order.clear();
  row_order_dirty = true;
  spill_cache.clear();
  draw_dirty.clear();
  overlap_fixes = 0;
  surface.clear();
  surface_masks.clear();
  occupancy_revision = -1;
  surface_wakes = 0;
}
void PPGrainPhysics::rebuild_settled() {
  begin(24);
  int64_t revision = world->get("grain_roster_revision");
  if (roster_revision == revision) {
    Object *p = world->get("perf");
    if (bool(p->get("enabled")))
      p->set("roster_reuses", int64_t(p->get("roster_reuses")) + 1);
    end();
    return;
  }
  ++roster_full_rebuilds;
  Dictionary previous = settled;
  settled = Dictionary();
  flying = Array();
  Array grains = world->get("grains");
  for (int64_t i = 0; i < grains.size(); ++i) {
    Dictionary g = grains[i];
    if (!bool(g.get("rest", false))) {
      flying.append(g);
      continue;
    }
    int64_t c = cell(g["p"]);
    if (settled.has(c)) {
      g["rest"] = false;
      g["v"] = Vector2();
      flying.append(g);
      continue;
    }
    g["p"] = center(c);
    g["speed"] = int64_t(g.get("speed", 0));
    g["moved_tick"] = int64_t(g.get("moved_tick", 0));
    settled[c] = g;
  }
  Array keys = previous.keys();
  for (int64_t i = 0; i < keys.size(); ++i) {
    int64_t c = keys[i];
    if (!settled.has(c) ||
        Dictionary(previous[c])["id"] != Dictionary(settled[c])["id"])
      remove_sand_cell(c);
  }
  keys = settled.keys();
  for (int64_t i = 0; i < keys.size(); ++i) {
    int64_t c = keys[i];
    if (!previous.has(c) ||
        Dictionary(previous[c])["id"] != Dictionary(settled[c])["id"])
      add_sand_cell(c);
  }
  roster_revision = revision;
  end();
}
void PPGrainPhysics::roster_changed(const Array &added, const Array &removed, int64_t revision) {
  // Unknown/reset revisions retain the full source reconciliation on next step.
  if (roster_revision != revision - 1)
    return;
  cache_world();
  roster_added += added.size();
  roster_removed += removed.size();
  Dictionary removed_ids;
  PackedInt64Array removed_cells;
  for (int64_t i = 0; i < removed.size(); ++i) {
    Dictionary g = removed[i];
    removed_ids[g["id"]] = true;
    draw_dirty.erase(g["id"]);
    int64_t c = cell(g["p"]);
    if (settled.has(c) && Dictionary(settled[c])["id"] == g["id"]) {
      settled.erase(c);
      removed_cells.append(c);
    }
  }
  // Frontier refresh observes the complete post-removal occupancy, as rebuild did.
  for (int64_t i = 0; i < removed_cells.size(); ++i)
    remove_sand_cell(removed_cells[i]);
  if (!removed_ids.is_empty()) {
    Array survivors;
    for (int64_t i = 0; i < flying.size(); ++i) {
      Dictionary g = flying[i];
      if (!removed_ids.has(g["id"]))
        survivors.append(g);
    }
    flying = survivors;
  }
  for (int64_t i = 0; i < added.size(); ++i) {
    Dictionary g = added[i];
    // Emission appends airborne grains; unexpected rested inserts use fallback.
    if (bool(g.get("rest", false))) {
      roster_revision = -1;
      return;
    }
    flying.append(g);
  }
  roster_revision = revision;
}
int64_t PPGrainPhysics::sand_row(int64_t c) const { return c / width; }
void PPGrainPhysics::add_sand_cell(int64_t c) {
  int64_t row = sand_row(c);
  if (!sand_rows.has(row)) {
    sand_rows[row] = Dictionary();
    row_order_dirty = true;
  }
  Dictionary r = sand_rows[row];
  r[c] = true;
  row_plans.erase(row);
  refresh_neighbours(c);
}
void PPGrainPhysics::remove_sand_cell(int64_t c) {
  int64_t row = sand_row(c);
  if (sand_rows.has(row)) {
    Dictionary r = sand_rows[row];
    r.erase(c);
    if (r.is_empty()) {
      sand_rows.erase(row);
      row_order_dirty = true;
    }
  }
  row_plans.erase(row);
  blocked.erase(c);
  surface.erase(c);
  surface_masks.erase(c);
  refresh_neighbours(c);
  wake_above(c);
}
void PPGrainPhysics::wake(int64_t c) {
  if (surface.has(c) && blocked.erase(c))
    row_plans.erase(sand_row(c));
}
void PPGrainPhysics::wake_above(int64_t c) {
  wake(c);
  int64_t above = c - width;
  for (int64_t p : {above - 1, above, above + 1})
    wake(p);
}
bool PPGrainPhysics::stable_cell(int64_t c) const {
  return settled.has(c) || terrain(c);
}
void PPGrainPhysics::refresh_surface(int64_t c) {
  if (!settled.has(c))
    return;
  int64_t x = c % width;
  bool buried = (c < width || stable_cell(c - width)) &&
                stable_cell(c + width) && (x == 0 || stable_cell(c - 1)) &&
                (x == width - 1 || stable_cell(c + 1));
  if (buried) {
    surface.erase(c);
    surface_masks.erase(c);
    if (!blocked.has(c)) {
      blocked[c] = true;
      row_plans.erase(sand_row(c));
    }
    Dictionary g = settled[c];
    g["speed"] = 0;
  } else {
    surface[c] = true;
    wake(c);
  }
}
void PPGrainPhysics::refresh_neighbours(int64_t c) {
  refresh_surface(c);
  refresh_surface(c - width);
  refresh_surface(c + width);
  if (c % width > 0)
    refresh_surface(c - 1);
  if (c % width < width - 1)
    refresh_surface(c + 1);
}
int64_t PPGrainPhysics::body_mask(int64_t c) const {
  int64_t mask = 0, bit = 1;
  for (int64_t offset : {int64_t(0), int64_t(-1), int64_t(1), width - 1, width,
                         width + 1, -width}) {
    int64_t at = c + offset;
    if (at >= 0 && at < occupancy.size() && occupancy[at] != 0)
      mask |= bit;
    bit <<= 1;
  }
  for (int64_t offset : {0, -1, 1}) {
    int64_t at = c + offset;
    if (body_occupied(at))
      mask |= bit;
    bit <<= 1;
  }
  return mask;
}
PackedInt64Array PPGrainPhysics::row_plan(int64_t row) {
  if (row_plans.has(row))
    return row_plans[row];
  Dictionary r = sand_rows.get(row, Dictionary());
  Array keys = r.keys();
  PackedInt64Array origins;
  for (int64_t i = 0; i < keys.size(); ++i)
    origins.append(keys[i]);
  origins.sort();
  PackedInt64Array plan;
  int64_t sleeping = 0;
  for (int64_t i = 0; i < origins.size(); ++i) {
    int64_t origin = origins[i];
    if (blocked.has(origin))
      ++sleeping;
    else {
      if (sleeping > 0) {
        plan.append(-sleeping);
        sleeping = 0;
      }
      plan.append(origin);
    }
  }
  if (sleeping > 0)
    plan.append(-sleeping);
  row_plans[row] = plan;
  return plan;
}
int64_t PPGrainPhysics::spill_from_overlap(int64_t c) {
  if (!settled.has(c))
    return -1;
  int64_t x = c % width, best = -1;
  double best_distance = INFINITY;
  for (int64_t dx : {0, -1, 1}) {
    if (x + dx < 0 || x + dx >= width)
      continue;
    int64_t origin = c + dx, at = spill_cache.get(origin, origin);
    while (at >= 0 && settled.has(at))
      at -= width;
    if (at < 0 || terrain(at)) {
      spill_cache[origin] = -1;
      continue;
    }
    spill_cache[origin] = at;
    double distance = std::pow(double(c / width - at / width), 2) + dx * dx;
    if (distance < best_distance) {
      best_distance = distance;
      best = at;
    }
  }
  return best;
}
void PPGrainPhysics::rasterize_and_displace() {
  begin(23);
  world->call("rasterize");
  body_cells = world->get("_raster_dynamic");
  occupancy = world->get("occupancy");
  int64_t revision = world->get("occupancy_revision");
  if (occupancy_revision == revision) {
    end();
    return;
  }
  occupancy_revision = revision;
  Array keys = surface.keys();
  for (int64_t i = 0; i < keys.size(); ++i) {
    int64_t c = keys[i], mask = body_mask(c);
    if (int64_t(surface_masks.get(c, -1)) != mask) {
      if (blocked.has(c))
        ++surface_wakes;
      wake(c);
      surface_masks[c] = mask;
    }
  }
  end();
}
void PPGrainPhysics::step_flying(double dt) {
  begin(25);
  bool any = false;
  Array airborne;
  spill_cache.clear();
  for (int64_t i = 0; i < flying.size(); ++i) {
    Dictionary g = flying[i];
    if (bool(g.get("rest", false)))
      continue;
    any = true;
    Vector2 p = g["p"];
    if (has_terrain) {
      p.x = std::clamp(double(p.x), 0.5, double(width) - 0.5);
      p.y = std::clamp(double(p.y), 0.5, ground_y(p.x) - 0.5);
    }
    // Scalar GDScript floats are doubles; Vector2 assignments and operators
    // intentionally round through Godot real_t at the same boundaries.
    Vector2 v = g["v"];
    v.x = std::clamp(double(v.x), -240.0, 240.0);
    v.y = std::clamp(double(v.y), -240.0, 240.0);
    int steps = std::min(
        16,
        std::max(1, int(std::ceil(std::max(std::abs(double(v.x)),
                                           std::abs(double(v.y)) + 70.0 * dt) *
                                  dt))));
    double h = dt / steps;
    for (int j = 0; j < steps; ++j) {
      v.y = double(v.y) + 70.0 * h;
      Vector2 next = p + v * h;
      if (next.x < 0.5 || next.x > width - 0.5) {
        next.x = std::clamp(double(next.x), 0.5, width - 0.5);
        v.x = double(v.x) * -0.2;
      }
      if (next.y < 0.5) {
        next.y = 0.5;
        v.y = std::abs(double(v.y)) * 0.2;
      }
      bool hit = next.y >= ground_y(next.x) - 0.5;
      if (hit || occupied(cell(next)) || occupied(cell(p))) {
        int64_t x = std::clamp<int64_t>(std::floor(p.x), 0, width - 1),
                y = std::clamp<int64_t>(std::floor(p.y), 0, floor_y - 1),
                c = y * width + x;
        if (settled.has(c)) {
          int64_t free = spill_from_overlap(c);
          if (free >= 0) {
            c = free;
            p = center(c);
            ++overlap_fixes;
          }
        }
        if (!settled.has(c) && !terrain(c)) {
          g["rest"] = true;
          g["speed"] = 0;
          g["moved_tick"] = 0;
          p = center(c);
          v = Vector2();
          settled[c] = g;
          add_sand_cell(c);
          break;
        }
        v = Vector2();
        break;
      } else
        p = next;
    }
    if (Vector2(g["p"]) != p)
      draw_dirty[g["id"]] = g;
    g["p"] = p;
    g["v"] = v;
    if (!bool(g.get("rest", false)))
      airborne.append(g);
  }
  flying = airborne;
  if (any)
    ++motion_revision;
  end();
}
void PPGrainPhysics::fast_sand_tick() {
  begin(26);
  ++tick;
  int64_t bottom = floor_y * width, direction = tick % 2 != 0 ? 1 : -1;
  if (width <= 0) {
    end();
    return;
  }
  if (width != blocked_width || bottom != blocked_bottom) {
    blocked.clear();
    row_plans.clear();
    blocked_width = width;
    blocked_bottom = bottom;
  }
  // Call the original seeded RNG for both draws and jump-ahead runs. Traversal
  // and every conditional RNG consumption remain in source order.
  Object *rng = world->get("rng");
  if (!settled.is_empty() && blocked.size() == settled.size()) {
    rng->call("advance", settled.size());
    end();
    return;
  }
  if (row_order_dirty) {
    row_order.clear();
    Array keys = sand_rows.keys();
    for (int64_t i = 0; i < keys.size(); ++i)
      row_order.append(keys[i]);
    row_order.sort();
    row_order_dirty = false;
  }
  PackedInt32Array rows = row_order;
  for (int64_t ri = rows.size() - 1; ri >= 0; --ri) {
    PackedInt64Array plan = row_plan(rows[ri]);
    int64_t index = direction == 1 ? 0 : plan.size() - 1;
    while (index >= 0 && index < plan.size()) {
      int64_t origin = plan[index];
      index += direction;
      if (origin < 0) {
        rng->call("advance", -origin);
        continue;
      }
      if (origin >= bottom || !settled.has(origin))
        continue;
      Dictionary g = settled[origin];
      if (int64_t(g.get("moved_tick", 0)) == tick)
        continue;
      int64_t velocity = std::min<int64_t>(6, int64_t(g.get("speed", 0)) + 1),
              at = origin, side = 1;
      bool hit = false;
      settled.erase(origin);
      for (int64_t fall = 0; fall < velocity; ++fall) {
        if (at + width < bottom && !occupied(at + width)) {
          at += width;
          continue;
        }
        hit = true;
        side = double(rng->call("randf")) < 0.5 ? -1 : 1;
        int64_t diagonal = -1;
        for (int64_t dx : {side, -side}) {
          if (at % width + dx >= 0 && at % width + dx < width &&
              at + width < bottom && !occupied(at + width + dx) &&
              !settled.has(at + dx) && !body_occupied(at + dx)) {
            diagonal = at + width + dx;
            break;
          }
        }
        if (diagonal >= 0)
          at = diagonal;
        else if (velocity >= 3) {
          for (int kick = 0; kick < 2; ++kick) {
            if (at % width + side < 0 || at % width + side >= width ||
                occupied(at + side))
              break;
            at += side;
          }
        }
        break;
      }
      if (at == origin && body_occupied(origin)) {
        for (int64_t dx : {side, -side}) {
          if (origin % width + dx >= 0 && origin % width + dx < width &&
              !occupied(origin + dx)) {
            at = origin + dx;
            break;
          }
        }
      }
      settled[at] = g;
      if (at != origin) {
        remove_sand_cell(origin);
        add_sand_cell(at);
        draw_dirty[g["id"]] = g;
        ++motion_revision;
      } else {
        blocked[origin] = true;
        row_plans.erase(sand_row(origin));
      }
      g["p"] = center(at);
      g["v"] = Vector2();
      g["speed"] = hit ? 0 : velocity;
      g["moved_tick"] = tick;
    }
  }
  end();
}
void PPGrainPhysics::step(double dt) {
  if (!world || bool(world->get("paused")) || !std::isfinite(dt) || dt <= 0)
    return;
  Array grains = world->get("grains");
  if (grains.is_empty())
    return;
  cache_world();
  rebuild_settled();
  flying_elapsed += std::min(0.1, dt);
  constexpr double interval = 1.0 / 30.0;
  while (flying_elapsed + 0.00000001 >= interval) {
    flying_elapsed = std::max(0.0, flying_elapsed - interval);
    rasterize_and_displace();
    step_flying(interval);
    sand_elapsed += interval;
    if (sand_elapsed + 0.00000001 >= interval) {
      sand_elapsed = std::max(0.0, sand_elapsed - interval);
      fast_sand_tick();
    }
  }
}
} // namespace godot
