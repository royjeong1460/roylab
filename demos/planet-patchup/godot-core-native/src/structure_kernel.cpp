#include "structure_kernel.h"
#include "graph_kernels.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/classes/ref.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/core/math.hpp>
#include <vector>
namespace {
int64_t key(int64_t a, int64_t b, int64_t n) {
  return std::min(a, b) * n + std::max(a, b);
}
double strength(int64_t id, Dictionary bonds, int64_t w, int64_t n) {
  return std::max(0.0, 1.0 - double(bonds.get(key(id, id + w, n), 0.0)));
}
bool live(int64_t id, PackedByteArray cells) {
  return id >= 0 && id < cells.size() && int64_t(cells[id]) != 0;
}
Dictionary bearing(int64_t id, double x, double s, bool pillar) {
  Dictionary b;
  b["id"] = id;
  b["x"] = x;
  b["strength"] = s;
  b["pillar"] = pillar;
  return b;
}
} // namespace
void PPStructureKernel::_bind_methods() {
  ClassDB::bind_method(D_METHOD("owners", "pieces"),
                       &PPStructureKernel::owners);
  ClassDB::bind_method(D_METHOD("seams", "cuts", "owners", "width"),
                       &PPStructureKernel::seams);
  ClassDB::bind_method(D_METHOD("collision_pairs", "links"),
                       &PPStructureKernel::collision_pairs);
  ClassDB::bind_method(D_METHOD("propagate", "supported", "edges", "passes"),
                       &PPStructureKernel::propagate);
  ClassDB::bind_method(
      D_METHOD("pivot_only", "samples", "piece", "static_body", "pivot"),
      &PPStructureKernel::pivot_only);
  ClassDB::bind_method(
      D_METHOD("support_bodies", "samples", "piece_y", "initial", "passes"),
      &PPStructureKernel::support_bodies);
  ClassDB::bind_method(
      D_METHOD("resting", "pieces", "bodies", "samples", "previous", "initial"),
      &PPStructureKernel::resting);
  ClassDB::bind_method(D_METHOD("geometry", "topology", "world", "ids",
                                "cut_limit", "supports", "enabled", "body_rows",
                                "body_bounds"),
                       &PPStructureKernel::geometry);
  ClassDB::bind_method(D_METHOD("candidates", "geometry", "reserve", "groups",
                                "angle", "width", "enabled", "selected_only"),
                       &PPStructureKernel::candidates);
  ClassDB::bind_method(D_METHOD("_bearing_less", "a", "b"),
                       &PPStructureKernel::_bearing_less);
  ClassDB::bind_method(D_METHOD("_utilization_greater", "a", "b"),
                       &PPStructureKernel::_utilization_greater);
  ClassDB::bind_method(D_METHOD("owned", "ids"), &PPStructureKernel::owned);
  ClassDB::bind_method(
      D_METHOD("baseline", "original", "roles", "modules", "width"),
      &PPStructureKernel::baseline);
  ClassDB::bind_method(D_METHOD("damaged", "bearings", "y", "roles", "modules",
                                "width", "rows", "bounds", "enabled"),
                       &PPStructureKernel::damaged);
  ClassDB::bind_method(
      D_METHOD("pillar_lengths", "ids", "roles", "bonds", "width", "count"),
      &PPStructureKernel::pillar_lengths);
  ClassDB::bind_method(D_METHOD("column_load", "bearings", "lengths", "load",
                                "lever", "angle", "width", "enabled"),
                       &PPStructureKernel::column_load);
  ClassDB::bind_method(D_METHOD("invalidate", "bonds", "previous", "sections",
                                "topology", "width", "count"),
                       &PPStructureKernel::invalidate);
  ClassDB::bind_method(
      D_METHOD("topology", "ids", "roles", "bonds", "width", "count", "points"),
      &PPStructureKernel::topology);
  ClassDB::bind_method(
      D_METHOD("live_bearings", "bearings", "ids", "cells", "bonds", "width"),
      &PPStructureKernel::live_bearings);
  ClassDB::bind_method(
      D_METHOD("hinge_ids", "ids", "bearings", "cells", "roles", "width"),
      &PPStructureKernel::hinge_ids);
  ClassDB::bind_method(D_METHOD("nearest_pixels", "ids", "original", "origin",
                                "position", "rotation", "points", "initial"),
                       &PPStructureKernel::nearest_pixels);
  ClassDB::bind_method(
      D_METHOD("cut_limit", "points", "origin", "position", "rotation"),
      &PPStructureKernel::cut_limit);
  ClassDB::bind_method(D_METHOD("register_hinge", "groups", "group", "row",
                                "original", "ids", "width"),
                       &PPStructureKernel::register_hinge);
  ClassDB::bind_method(D_METHOD("release_angle", "lower", "cells", "original"),
                       &PPStructureKernel::release_angle);
  ClassDB::bind_method(D_METHOD("column_breaks", "ids", "bearings", "roles",
                                "original", "bonds", "width", "count",
                                "points"),
                       &PPStructureKernel::column_breaks);
  ClassDB::bind_method(D_METHOD("_weak_less", "a", "b"),
                       &PPStructureKernel::_weak_less);
  ClassDB::bind_method(D_METHOD("_row_less", "a", "b"),
                       &PPStructureKernel::_row_less);
}
Dictionary PPStructureKernel::owned(Array ids) {
  Dictionary d;
  for (int64_t i = 0; i < ids.size(); ++i)
    d[ids[i]] = true;
  return d;
}
Dictionary PPStructureKernel::baseline(Array original, PackedByteArray roles,
                                       Array modules, int64_t w) {
  Dictionary rows, bounds, out;
  for (int64_t id = 0; id < original.size() - w; ++id) {
    int64_t below = id + w;
    if (!bool(original[id]) || !bool(original[below]) ||
        int64_t(roles[id]) != 2 || int64_t(roles[below]) != 2 ||
        modules.size() != original.size())
      continue;
    int64_t m = modules[id];
    if (m < 0 || int64_t(modules[below]) != m)
      continue;
    int64_t y = id / w;
    Vector2i k(m, y);
    rows[k] = int64_t(rows.get(k, 0)) + 1;
    Vector2i b = bounds.get(m, Vector2i(y, y));
    bounds[m] = Vector2i(std::min<int64_t>(b.x, y), std::max<int64_t>(b.y, y));
  }
  out["rows"] = rows;
  out["bounds"] = bounds;
  return out;
}
bool PPStructureKernel::damaged(Array bearings, int64_t y,
                                PackedByteArray roles, Array modules, int64_t w,
                                Dictionary rows, Dictionary bounds,
                                bool enabled) {
  if (!enabled)
    return false;
  Dictionary widths;
  for (int64_t i = 0; i < bearings.size(); ++i) {
    Dictionary b = bearings[i];
    int64_t id = b["id"];
    if (int64_t(roles[id]) != 2 || int64_t(roles[id + w]) != 2 ||
        modules.is_empty())
      continue;
    int64_t m = modules[id];
    if (int64_t(modules[id + w]) != m || !bounds.has(m))
      continue;
    Vector2i range = bounds[m];
    if (y < (range.x + range.y) / 2.0)
      continue;
    widths[m] = double(widths.get(m, 0.0)) + double(b["strength"]);
  }
  Array ks = widths.keys();
  for (int64_t i = 0; i < ks.size(); ++i)
    if (double(widths[ks[i]]) <
        int64_t(rows.get(Vector2i(int64_t(ks[i]), y), 0)) - 0.000001)
      return true;
  return false;
}
Dictionary PPStructureKernel::pillar_lengths(Array ids, PackedByteArray roles,
                                             Dictionary bonds, int64_t w,
                                             int64_t n) {
  Dictionary have = owned(ids), lengths;
  for (int64_t i = 0; i < ids.size(); ++i) {
    int64_t id = ids[i];
    if (int64_t(roles[id]) != 1 || lengths.has(id))
      continue;
    int64_t top = id;
    while (have.has(top - w) && int64_t(roles[top - w]) == 1 &&
           double(bonds.get(key(top, top - w, n), 0.0)) < 1.0)
      top -= w;
    Array run;
    run.append(top);
    while (have.has(int64_t(run[run.size() - 1]) + w) &&
           int64_t(roles[int64_t(run[run.size() - 1]) + w]) == 1 &&
           double(bonds.get(key(int64_t(run[run.size() - 1]),
                                int64_t(run[run.size() - 1]) + w, n),
                            0.0)) < 1.0)
      run.append(int64_t(run[run.size() - 1]) + w);
    for (int64_t j = 0; j < run.size(); ++j)
      lengths[run[j]] = run.size();
  }
  return lengths;
}
double PPStructureKernel::column_load(Array bearings, Dictionary lengths,
                                      double load, double lever, double angle,
                                      int64_t w, bool enabled) {
  if (!enabled)
    return 0;
  struct Post {
    double width;
    int64_t length;
    double right;
  };
  std::vector<Post> posts;
  for (int64_t i = 0; i < bearings.size(); ++i) {
    Dictionary b = bearings[i];
    if (!bool(b["pillar"]))
      return 0;
    int64_t id = b["id"], len = std::max(int64_t(lengths.get(id, 0)),
                                         int64_t(lengths.get(id + w, 0)));
    if (!len)
      return 0;
    double x = b["x"];
    if (posts.empty() || x - posts.back().right > 1.0)
      posts.push_back({0, 0, x});
    auto &p = posts.back();
    p.width += double(b["strength"]);
    p.length = std::max(p.length, len);
    p.right = x;
  }
  double axial = 0, bending = 0;
  for (auto &p : posts) {
    axial += std::pow(p.width, 3.0) / std::pow(double(p.length), 2.0);
    bending += std::pow(p.width, 2.0);
  }
  if (axial <= 0 || bending <= 0)
    return 0;
  return load * (std::abs(std::cos(angle)) / (180000.0 * axial) +
                 lever / (1200.0 * bending));
}
void PPStructureKernel::invalidate(Dictionary bonds, Dictionary previous,
                                   Dictionary sections, Dictionary topology,
                                   int64_t w, int64_t n) {
  if (bonds == previous)
    return;
  Dictionary changed, disconnected, vertical;
  auto add = [&](int64_t k, bool disconnect) {
    int64_t a = k / n, b = k % n;
    changed[a] = true;
    changed[b] = true;
    if (disconnect) {
      disconnected[a] = true;
      disconnected[b] = true;
    }
    if (b - a == w)
      vertical[a] = true;
  };
  Array ks = bonds.keys();
  for (int64_t i = 0; i < ks.size(); ++i) {
    Variant k = ks[i];
    if (bonds[k] != previous.get(k, 0.0))
      add(int64_t(k),
          (double(bonds[k]) >= 1) != (double(previous.get(k, 0.0)) >= 1));
  }
  ks = previous.keys();
  for (int64_t i = 0; i < ks.size(); ++i) {
    Variant k = ks[i];
    if (!bonds.has(k) && previous[k] != Variant(0.0))
      add(int64_t(k), double(previous[k]) >= 1);
  }
  Array c = changed.keys(), d = disconnected.keys(), v = vertical.keys();
  ks = sections.keys();
  for (int64_t i = 0; i < ks.size(); ++i) {
    Dictionary cache = sections[ks[i]], have = cache["owned"];
    for (int64_t j = 0; j < c.size(); ++j)
      if (have.has(c[j])) {
        sections.erase(ks[i]);
        break;
      }
  }
  ks = topology.keys();
  for (int64_t i = 0; i < ks.size(); ++i) {
    Dictionary cache = topology[ks[i]], have = cache["owned"];
    bool invalid = false;
    for (int64_t j = 0; j < d.size(); ++j)
      if (have.has(d[j])) {
        invalid = true;
        break;
      }
    if (invalid) {
      topology.erase(ks[i]);
      continue;
    }
    Dictionary indices = cache["bearing_indices"], rows = cache["rows"],
               cuts = cache["cuts"];
    for (int64_t j = 0; j < v.size(); ++j) {
      int64_t id = v[j];
      if (!indices.has(id))
        continue;
      Vector2i slot = indices[id];
      Array row = rows[slot.y];
      Dictionary b = Dictionary(row[slot.x]).duplicate();
      b["strength"] = strength(id, bonds, w, n);
      row[slot.x] = b;
      cuts.erase(slot.y);
    }
  }
}
Dictionary PPStructureKernel::topology(Array ids, PackedByteArray roles,
                                       Dictionary bonds, int64_t w, int64_t n,
                                       PackedVector2Array points) {
  Dictionary have = owned(ids), rows, indices, out;
  for (int64_t i = 0; i < ids.size(); ++i) {
    int64_t id = ids[i], next = id + w;
    if (!have.has(next))
      continue;
    double s = strength(id, bonds, w, n);
    if (s <= 0)
      continue;
    int64_t y = id / w;
    if (!rows.has(y))
      rows[y] = Array();
    Array row = rows[y];
    indices[id] = Vector2i(row.size(), y);
    row.append(bearing(id, points[id].x, s,
                       int64_t(roles[id]) == 1 || int64_t(roles[next]) == 1));
  }
  Array ys = rows.keys();
  ys.sort();
  out["owned"] = have;
  out["rows"] = rows;
  out["ys"] = ys;
  out["bearing_indices"] = indices;
  out["lengths"] = pillar_lengths(ids, roles, bonds, w, n);
  return out;
}
Array PPStructureKernel::live_bearings(Array bearings, Array ids,
                                       PackedByteArray cells, Dictionary bonds,
                                       int64_t w) {
  Dictionary have = owned(ids);
  Array result;
  for (int64_t i = 0; i < bearings.size(); ++i) {
    Dictionary b = bearings[i];
    int64_t id = b["id"];
    if (!have.has(id) || !live(id + w, cells))
      continue;
    Dictionary copy = b.duplicate();
    double s = strength(id, bonds, w, cells.size());
    copy["strength"] = s;
    if (s > 0)
      result.append(copy);
  }
  return result;
}
Array PPStructureKernel::hinge_ids(Array ids, Array bearings,
                                   PackedByteArray cells, PackedByteArray roles,
                                   int64_t w) {
  Array result = ids.duplicate();
  for (int64_t i = 0; i < bearings.size(); ++i) {
    Dictionary b = bearings[i];
    int64_t id = int64_t(b["id"]) + w;
    while (live(id, cells) && int64_t(roles[id]) == 1) {
      result.append(id);
      id += w;
    }
  }
  return result;
}
// Keep Vector2 intermediates in real_t: pixel_position rounds each vector
// operation.
Array PPStructureKernel::nearest_pixels(Array ids, PackedVector2Array original,
                                        Vector2 origin, Vector2 position,
                                        double rotation, Array points,
                                        Array initial) {
  Dictionary out = owned(initial);
  PackedVector2Array positions;
  positions.resize(ids.size());
  for (int64_t i = 0; i < ids.size(); ++i)
    positions.set(
        i, (position +
            ((original[int64_t(ids[i])] - origin) * 4.0).rotated(rotation)) /
               4.0);
  for (int64_t i = 0; i < points.size(); ++i) {
    Vector2 point = points[i];
    if (point.y < position.y / 4.0 - 0.5)
      continue;
    int64_t nearest = -1;
    double distance = INFINITY;
    for (int64_t j = 0; j < ids.size(); ++j) {
      double d = positions[j].distance_squared_to(point);
      if (d < distance) {
        distance = d;
        nearest = ids[j];
      }
    }
    if (nearest >= 0)
      out[nearest] = true;
  }
  return out.keys();
}
double PPStructureKernel::cut_limit(Array points, Vector2 origin,
                                    Vector2 position, double rotation) {
  double limit = INFINITY;
  for (int64_t i = 0; i < points.size(); ++i) {
    Vector2 p = points[i];
    if (p.y >= position.y / 4.0 - 0.5) {
      Vector2 relative = (p - position / 4.0).rotated(-rotation);
      limit = std::min(limit, double(origin.y) + relative.y + 0.5);
    }
  }
  return limit;
}
Dictionary PPStructureKernel::register_hinge(Dictionary groups, int64_t group,
                                             int64_t row, Array original,
                                             Array ids, int64_t w) {
  Array bearings, lower, ks = groups.keys();
  for (int64_t i = 0; i < ks.size(); ++i) {
    int64_t id = ks[i];
    if (int64_t(groups[id]) == group && id / w == row && bool(original[id + w]))
      bearings.append(id);
  }
  for (int64_t i = 0; i < bearings.size(); ++i)
    if (ids.has(bearings[i]))
      lower.append(int64_t(bearings[i]) + w);
  Dictionary out;
  out["original"] = bearings.size();
  out["lower"] = lower;
  return out;
}
double PPStructureKernel::release_angle(Array lower, PackedByteArray cells,
                                        int64_t original) {
  int64_t remaining = 0;
  for (int64_t i = 0; i < lower.size(); ++i)
    remaining += live(lower[i], cells);
  double f = double(remaining) / original;
  return 0.5 * (0.24 + 0.76 * f * f);
}
bool PPStructureKernel::_weak_less(Dictionary a, Dictionary b) {
  double ar = a["ratio"], br = b["ratio"];
  return !Math::is_equal_approx(ar, br) ? ar < br
                                        : int64_t(a["y"]) < int64_t(b["y"]);
}
bool PPStructureKernel::_row_less(Dictionary a, Dictionary b) {
  return int64_t(a["y"]) < int64_t(b["y"]);
}
// The shaft FIFO uses the source left, right, up, down neighbor order.
Array PPStructureKernel::column_breaks(Array ids, Array bearings,
                                       PackedByteArray roles, Array original,
                                       Dictionary bonds, int64_t w, int64_t n,
                                       PackedVector2Array points) {
  Dictionary have = owned(ids), visited;
  Array cuts;
  for (int64_t bi = 0; bi < bearings.size(); ++bi) {
    Dictionary b = bearings[bi];
    int64_t bid = b["id"], seed = int64_t(roles[bid]) == 1 ? bid : bid + w;
    if (visited.has(seed))
      continue;
    if (!have.has(seed) || int64_t(roles[seed]) != 1) {
      cuts.append(b);
      continue;
    }
    Array shaft;
    shaft.append(seed);
    visited[seed] = true;
    for (int64_t i = 0; i < shaft.size(); ++i) {
      int64_t current = shaft[i];
      Array neighbors;
      if (current % w > 0)
        neighbors.append(current - 1);
      if (current % w < w - 1 && current + 1 < n)
        neighbors.append(current + 1);
      if (current - w >= 0)
        neighbors.append(current - w);
      if (current + w < n)
        neighbors.append(current + w);
      for (int64_t j = 0; j < neighbors.size(); ++j) {
        int64_t id = neighbors[j];
        if (!have.has(id) || visited.has(id) || int64_t(roles[id]) != 1 ||
            double(bonds.get(key(current, id, n), 0.0)) >= 1)
          continue;
        visited[id] = true;
        shaft.append(id);
      }
    }
    Dictionary rows;
    int64_t left = w, right = 0;
    for (int64_t i = 0; i < shaft.size(); ++i) {
      int64_t id = shaft[i];
      left = std::min(left, id % w);
      right = std::max(right, id % w);
      for (int k = 0; k < 2; ++k) {
        int64_t upper = k == 0 ? id - w : id;
        if (!have.has(upper) || !have.has(upper + w))
          continue;
        int64_t y = upper / w;
        if (!rows.has(y))
          rows[y] = Dictionary();
        Dictionary row = rows[y];
        row[upper] =
            bearing(upper, points[upper].x, strength(upper, bonds, w, n), true);
      }
    }
    Array options, weak, joints, ys = rows.keys();
    for (int64_t i = 0; i < ys.size(); ++i) {
      int64_t y = ys[i];
      Array values = Dictionary(rows[y]).values(), bs;
      double width_left = 0;
      bool joint = false;
      for (int64_t j = 0; j < values.size(); ++j) {
        Dictionary v = values[j];
        if (double(v["strength"]) <= 0)
          continue;
        bs.append(v);
        width_left += double(v["strength"]);
        int64_t id = v["id"];
        joint =
            joint || (int64_t(roles[id]) != 1 && int64_t(roles[id + w]) == 1);
      }
      if (bs.is_empty())
        continue;
      int64_t count = 0;
      for (int64_t x = left; x <= right; ++x)
        if (bool(original[y * w + x]) && bool(original[(y + 1) * w + x]))
          ++count;
      Dictionary option;
      option["bearings"] = bs;
      option["y"] = y;
      option["ratio"] = width_left / std::max<int64_t>(1, count);
      option["joint"] = joint;
      options.append(option);
      if (double(option["ratio"]) < 0.999)
        weak.append(option);
      if (joint)
        joints.append(option);
    }
    weak.sort_custom(Callable(this, "_weak_less"));
    joints.sort_custom(Callable(this, "_row_less"));
    if (!weak.is_empty())
      cuts.append_array(Dictionary(weak[0])["bearings"]);
    else if (!joints.is_empty())
      cuts.append_array(Dictionary(joints[0])["bearings"]);
    else
      cuts.append(b);
  }
  return cuts;
}
bool PPStructureKernel::_bearing_less(Dictionary a, Dictionary b) {
  return double(a["x"]) < double(b["x"]);
}
bool PPStructureKernel::_utilization_greater(Dictionary a, Dictionary b) {
  return double(a["utilization"]) > double(b["utilization"]);
}
// Array/Dictionary insertion and Godot sort_custom retain source traversal and
// tie behavior.
Dictionary PPStructureKernel::geometry(Dictionary topology, Node *world,
                                       Array ids, double limit,
                                       Variant supports, bool enabled,
                                       Dictionary body_rows,
                                       Dictionary body_bounds) {
  Array records, cuts, ys = topology["ys"];
  Dictionary previous, rows = topology["rows"], cached_cuts = topology["cuts"];
  PackedByteArray roles = world->get("roles");
  Dictionary fixture = world->get("fixture");
  Array modules = fixture.get("module_of", Array());
  int64_t w = world->get("width");
  for (int64_t i = 0; i < ys.size(); ++i) {
    int64_t y = ys[i];
    if (y + 1 > limit)
      break;
    if (!cached_cuts.has(y)) {
      Array original = rows[y];
      bool body = damaged(original, y, roles, modules, w, body_rows,
                          body_bounds, enabled),
           pillar = false;
      for (int64_t j = 0; j < original.size(); ++j)
        if (bool(Dictionary(original[j])["pillar"])) {
          pillar = true;
          break;
        }
      Dictionary cut;
      if (pillar || body) {
        Array bearings = original.duplicate();
        bearings.sort_custom(Callable(this, "_bearing_less"));
        PackedStringArray signatures;
        for (int64_t j = 0; j < bearings.size(); ++j) {
          Dictionary b = bearings[j];
          Array args;
          args.append(b["x"]);
          args.append(b["strength"]);
          Variant formatted;
          bool valid;
          Variant::evaluate(Variant::OP_MODULE, String("%s:%.4f"), args,
                            formatted, valid);
          signatures.append(formatted);
        }
        cut["y"] = y;
        cut["bearings"] = bearings;
        cut["signature"] = String(",").join(signatures);
        cut["body_support"] = body;
      }
      cached_cuts[y] = cut;
    }
    Dictionary cut = cached_cuts[y];
    if (cut.is_empty()) {
      previous = Dictionary();
      continue;
    }
    if (!previous.is_empty() && int64_t(previous["y"]) == y - 1 &&
        previous["signature"] == cut["signature"] &&
        previous["body_support"] == cut["body_support"])
      cuts[cuts.size() - 1] = cut;
    else
      cuts.append(cut);
    previous = cut;
  }
  Ref<PPSectionGraph> graph = topology["graph"];
  if (graph.is_null()) {
    if (!cuts.is_empty()) {
      graph.instantiate();
      graph->setup(world, ids, supports);
      topology["graph"] = graph;
    }
  } else if (topology["supports"] != supports)
    graph->update_supports(supports);
  if (topology["supports"] != supports)
    topology["supports"] = supports.get_type() == Variant::NIL
                               ? Variant()
                               : Variant(Array(supports).duplicate());
  bool terrain = world->get("has_terrain");
  for (int64_t i = 0; i < cuts.size(); ++i) {
    Dictionary cut = cuts[i];
    int64_t y = cut["y"];
    Array summaries = graph->summaries(y), all = cut["bearings"];
    for (int64_t j = 0; j < summaries.size(); ++j) {
      Dictionary component = summaries[j];
      int64_t count = component["count"], tag = component["tag"];
      if (count < 40)
        continue;
      Array bearings;
      bool pillar = false;
      for (int64_t k = 0; k < all.size(); ++k) {
        Dictionary b = all[k];
        int64_t id = b["id"];
        if (graph->belongs(id, tag) && (supports.get_type() == Variant::NIL ||
                                        graph->supported(id + w, y))) {
          bearings.append(b);
          pillar = pillar || bool(b["pillar"]);
        }
      }
      if (bearings.is_empty())
        continue;
      bool supported = false;
      if (terrain && supports.get_type() != Variant::NIL) {
        Array ss = supports;
        for (int64_t k = 0; k < ss.size(); ++k)
          if (graph->belongs(ss[k], tag)) {
            supported = true;
            break;
          }
      }
      if (terrain && (supported || (!bool(cut["body_support"]) && !pillar)))
        continue;
      double width = 0;
      Array bearing_ids;
      for (int64_t k = 0; k < bearings.size(); ++k) {
        Dictionary b = bearings[k];
        width += double(b["strength"]);
        bearing_ids.append(b["id"]);
      }
      Vector2 center = component["center_sum"];
      center /= count;
      double pivot = std::clamp(
          double(center.x), double(Dictionary(bearings[0])["x"]) - 0.5,
          double(Dictionary(bearings[bearings.size() - 1])["x"]) + 0.5);
      Dictionary record;
      record["y"] = y;
      record["bearings"] = bearings;
      record["cuts"] = bearing_ids;
      record["width"] = width;
      record["count"] = count;
      record["tag"] = tag;
      record["center2"] = center;
      record["pivot"] = pivot;
      records.append(record);
    }
  }
  Dictionary out;
  out["lengths"] = topology["lengths"];
  out["records"] = records;
  out["graph"] = graph;
  out["owned"] = topology["owned"];
  return out;
}
Array PPStructureKernel::candidates(Dictionary geometry, Dictionary reserve,
                                    Dictionary groups, double angle, int64_t w,
                                    bool enabled, bool selected_only) {
  Array records = geometry["records"], candidates;
  Dictionary lengths = geometry["lengths"];
  for (int64_t i = 0; i < records.size(); ++i) {
    Dictionary r = records[i];
    Vector2 center = r["center2"];
    double pivot = r["pivot"], width = r["width"];
    Array bs = r["bearings"];
    int64_t count = r["count"];
    double signed_lever =
               (center.x - pivot) * std::cos(angle) +
               (int64_t(r["y"]) + 1 - double(center.y)) * std::sin(angle),
           lever = std::abs(signed_lever),
           res = reserve.get(groups.get(Dictionary(bs[0])["id"], 0), 1.0),
           load = count;
    double utilization = std::max(load / (1800.0 * width) +
                                      load * lever / (7000.0 * width * width),
                                  column_load(bs, lengths, load, lever, angle,
                                              w, enabled)) /
                         res,
           axial =
               std::max(load / (1800.0 * width),
                        column_load(bs, lengths, load, 0, angle, w, enabled)) /
               res;
    Dictionary c;
    c["y"] = r["y"];
    c["bearings"] = bs;
    c["cuts"] = r["cuts"];
    c["width"] = width;
    c["above"] = Array();
    c["center"] = center.x;
    c["pivot"] = pivot;
    c["load"] = count;
    c["utilization"] = utilization;
    c["axialUtilization"] = axial;
    c["signedLever"] = signed_lever;
    c["lever"] = lever;
    c["reserve"] = res;
    c["_record"] = r;
    candidates.append(c);
  }
  candidates.sort_custom(Callable(this, "_utilization_greater"));
  bool selected = false;
  Ref<PPSectionGraph> graph = geometry["graph"];
  for (int64_t i = 0; i < candidates.size(); ++i) {
    Dictionary c = candidates[i];
    bool qualifies = double(c["utilization"]) > 1 ||
                     std::abs(double(c["center"]) - double(c["pivot"])) > 0.1;
    if (!selected_only || i == 0 || (!selected && qualifies)) {
      Dictionary r = c["_record"];
      c["above"] = graph->members(r["tag"], r["y"]);
    }
    selected = selected || qualifies;
    c.erase("_record");
  }
  return candidates;
}
Dictionary PPStructureKernel::support_bodies(Array samples, Dictionary piece_y,
                                             Dictionary initial,
                                             int64_t passes) {
  Dictionary supported = initial;
  for (int64_t pass = 0; pass < passes; ++pass) {
    bool changed = false;
    for (int64_t i = 0; i < samples.size(); ++i) {
      Dictionary sample = samples[i];
      Variant piece = sample["piece"], base = sample["base"];
      if (!piece_y.has(piece) || supported.has(piece) || !supported.has(base) ||
          Vector2(sample["normal"]).y > -0.7)
        continue;
      Array points = sample["points"];
      bool touches = false;
      for (int64_t j = 0; j < points.size(); ++j)
        if (Vector2(points[j]).y >= double(piece_y[piece]) - 0.5) {
          touches = true;
          break;
        }
      if (!touches)
        continue;
      supported[piece] = true;
      changed = true;
    }
    if (!changed)
      break;
  }
  return supported;
}
Dictionary PPStructureKernel::resting(Array pieces, Dictionary bodies,
                                      Array samples, Dictionary previous,
                                      Dictionary initial) {
  Dictionary contacts;
  for (int64_t i = 0; i < pieces.size(); ++i) {
    Variant piece = pieces[i];
    Dictionary data = bodies[piece];
    int64_t id = data["id"];
    if (!bool(data["sleeping"]) || !previous.has(id))
      continue;
    Array retained, old = previous[id];
    for (int64_t j = 0; j < old.size(); ++j) {
      Dictionary contact = old[j];
      Variant base = contact["base"];
      if (!bodies.has(base))
        continue;
      Dictionary body = bodies[base];
      Vector2 position = body["position"];
      double rotation = body["rotation"], radius = body["radius"];
      if (position.distance_to(contact["position"]) +
              std::abs(rotation - double(contact["angle"])) * radius <
          0.01)
        retained.append(contact);
    }
    contacts[id] = retained;
  }
  for (int64_t i = 0; i < samples.size(); ++i) {
    Dictionary sample = samples[i];
    Variant piece = sample["piece"], base = sample["base"];
    if (!bodies.has(piece) || !bodies.has(base) ||
        Vector2(sample["normal"]).y > -0.7)
      continue;
    Dictionary data = bodies[piece];
    if (bool(data["sleeping"]))
      continue;
    Vector2 position = data["position"];
    Array points = sample["points"];
    double left = INFINITY, right = -INFINITY;
    bool any = false;
    for (int64_t j = 0; j < points.size(); ++j) {
      Vector2 point = points[j];
      if (point.y <= position.y)
        continue;
      any = true;
      left = std::min(left, double(point.x));
      right = std::max(right, double(point.x));
    }
    if (!any)
      continue;
    int64_t id = data["id"];
    if (!contacts.has(id))
      contacts[id] = Array();
    Array cs = contacts[id];
    Dictionary body = bodies[base], contact;
    contact["base"] = base;
    contact["position"] = body["position"];
    contact["angle"] = body["rotation"];
    contact["left"] = left;
    contact["right"] = right;
    cs.append(contact);
  }
  Dictionary supported = initial;
  for (int64_t pass = 0; pass < pieces.size(); ++pass) {
    bool changed = false;
    for (int64_t i = 0; i < pieces.size(); ++i) {
      Variant piece = pieces[i];
      Dictionary data = bodies[piece];
      if (supported.has(piece) || !bool(data["quiet"]))
        continue;
      Array cs = contacts.get(data["id"], Array());
      double left = INFINITY, right = -INFINITY;
      bool any = false;
      for (int64_t j = 0; j < cs.size(); ++j) {
        Dictionary contact = cs[j];
        if (!supported.has(contact["base"]))
          continue;
        any = true;
        left = std::min(left, double(contact["left"]));
        right = std::max(right, double(contact["right"]));
      }
      if (!any)
        continue;
      double x = Vector2(data["position"]).x;
      if (x < left + 0.1 || x > right - 0.1)
        continue;
      supported[piece] = true;
      changed = true;
    }
    if (!changed)
      break;
  }
  Dictionary out;
  out["contacts"] = contacts;
  out["supported"] = supported;
  return out;
}
Dictionary PPStructureKernel::owners(Array pieces) {
  Dictionary result;
  for (int64_t i = 0; i < pieces.size(); ++i) {
    Dictionary record = pieces[i];
    Array ids = record["ids"];
    for (int64_t j = 0; j < ids.size(); ++j)
      result[ids[j]] = record["piece"];
  }
  return result;
}
Dictionary PPStructureKernel::seams(Array cuts, Dictionary owners, int64_t w) {
  Dictionary result;
  for (int64_t i = 0; i < cuts.size(); ++i) {
    Dictionary cut = cuts[i];
    int64_t id = cut["id"];
    Variant upper = owners.get(id, Variant()),
            lower = owners.get(id + w, Variant());
    if (upper.get_type() == Variant::NIL || lower.get_type() == Variant::NIL ||
        upper == lower)
      continue;
    Object *u = upper, *l = lower;
    String k = String::num_uint64(u->get_instance_id()) + ":" +
               String::num_uint64(l->get_instance_id());
    if (!result.has(k)) {
      Dictionary seam;
      seam["upper"] = upper;
      seam["lower"] = lower;
      seam["cuts"] = Array();
      result[k] = seam;
    }
    Dictionary seam = result[k];
    Array cs = seam["cuts"];
    cs.append(cut);
  }
  return result;
}
Array PPStructureKernel::collision_pairs(Dictionary links) {
  Dictionary seen;
  Array pairs, ks = links.keys();
  for (int64_t i = 0; i < ks.size(); ++i) {
    Variant first = ks[i];
    if (seen.has(first))
      continue;
    Array queue;
    queue.append(first);
    seen[first] = true;
    for (int64_t n = 0; n < queue.size(); ++n) {
      Array next = links[queue[n]];
      for (int64_t j = 0; j < next.size(); ++j)
        if (!seen.has(next[j])) {
          seen[next[j]] = true;
          queue.append(next[j]);
        }
    }
    for (int64_t a = 0; a < queue.size(); ++a)
      for (int64_t b = a + 1; b < queue.size(); ++b) {
        Array pair;
        pair.append(queue[a]);
        pair.append(queue[b]);
        pairs.append(pair);
      }
  }
  return pairs;
}
Dictionary PPStructureKernel::propagate(Dictionary supported, Array edges,
                                        int64_t passes) {
  for (int64_t p = 0; p < passes; ++p) {
    bool changed = false;
    for (int64_t i = 0; i < edges.size(); ++i) {
      Array edge = edges[i];
      if (supported.has(edge[1]) && !supported.has(edge[0])) {
        supported[edge[0]] = true;
        changed = true;
      }
    }
    if (!changed)
      break;
  }
  return supported;
}
bool PPStructureKernel::pivot_only(Array samples, Variant piece,
                                   Variant static_body, Vector2 pivot) {
  for (int64_t i = 0; i < samples.size(); ++i) {
    Dictionary sample = samples[i];
    if (sample["piece"] != piece)
      continue;
    Array points = sample["points"];
    bool only = sample["collider"] == static_body && !points.is_empty();
    for (int64_t j = 0; j < points.size(); ++j)
      if (Vector2(points[j]).distance_to(pivot) > 2.0)
        only = false;
    if (!only)
      return false;
  }
  return true;
}
