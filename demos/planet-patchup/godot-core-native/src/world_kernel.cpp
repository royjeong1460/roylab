#include "world_kernel.h"
#include "graph_kernels.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/classes/geometry2d.hpp>
#include <godot_cpp/classes/ref.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/core/math.hpp>
namespace {
Dictionary pixel(int64_t id, Array cache, PackedVector2Array points) {
  if (cache[id].get_type() == Variant::NIL) {
    Dictionary p;
    p["id"] = id;
    p["q"] = points[id];
    p.make_read_only();
    cache[id] = p;
  }
  return cache[id];
}
Dictionary id_set(Array ids) {
  Dictionary out;
  for (int64_t i = 0; i < ids.size(); ++i)
    out[ids[i]] = true;
  return out;
}
} // namespace
void PPWorldKernel::_bind_methods() {
  ClassDB::bind_method(D_METHOD("emissions", "pixels", "original", "origin",
                                "rotation", "velocity", "angular"),
                       &PPWorldKernel::emissions);
  ClassDB::bind_method(D_METHOD("clear_ids", "cells", "ids"),
                       &PPWorldKernel::clear_ids);
  ClassDB::bind_method(D_METHOD("snap", "cells", "cuts", "width", "points"),
                       &PPWorldKernel::snap);
  ClassDB::bind_method(D_METHOD("remove_cells", "cells", "pixels"),
                       &PPWorldKernel::remove_cells);
  ClassDB::bind_method(D_METHOD("group_stats", "groups"),
                       &PPWorldKernel::group_stats);
  ClassDB::bind_method(D_METHOD("static_material", "ids", "cache", "points"),
                       &PPWorldKernel::static_material);
  ClassDB::bind_method(D_METHOD("static_square", "point", "radius", "width",
                                "height", "cells", "cache", "points"),
                       &PPWorldKernel::static_square);
  ClassDB::bind_method(D_METHOD("cut", "materials", "point", "radius", "cells"),
                       &PPWorldKernel::cut);
  ClassDB::bind_method(
      D_METHOD("blast", "pieces", "grains", "point", "reach", "power"),
      &PPWorldKernel::blast);
  ClassDB::bind_method(D_METHOD("receiver", "pixels", "point", "groups"),
                       &PPWorldKernel::receiver);
  ClassDB::bind_method(D_METHOD("crush", "pixels", "segments", "reach", "limit",
                                "budget", "fall"),
                       &PPWorldKernel::crush);
  ClassDB::bind_method(
      D_METHOD("edges", "graph", "distances", "normal", "reach", "fall"),
      &PPWorldKernel::edges);
  ClassDB::bind_method(D_METHOD("crack", "world", "remaining", "before",
                                "edges", "crushed", "bonds", "budget", "span",
                                "fall"),
                       &PPWorldKernel::crack);
  ClassDB::bind_method(D_METHOD("compression", "children", "point", "budget"),
                       &PPWorldKernel::compression);
  ClassDB::bind_method(D_METHOD("auto_index", "grains", "width"),
                       &PPWorldKernel::auto_index);
  ClassDB::bind_method(
      D_METHOD("suction", "grains", "from", "to", "radius", "count"),
      &PPWorldKernel::suction);
  ClassDB::bind_method(D_METHOD("secure", "grains", "collected", "colors"),
                       &PPWorldKernel::secure);
  ClassDB::bind_method(D_METHOD("_distance_less", "a", "b"),
                       &PPWorldKernel::_distance_less);
  ClassDB::bind_method(D_METHOD("_near_less", "a", "b"),
                       &PPWorldKernel::_near_less);
  ClassDB::bind_method(D_METHOD("_edge_distance_less", "a", "b"),
                       &PPWorldKernel::_edge_distance_less);
  ClassDB::bind_method(D_METHOD("_edge_score_less", "a", "b"),
                       &PPWorldKernel::_edge_score_less);
}
bool PPWorldKernel::_distance_less(Dictionary a, Dictionary b) {
  return double(a["d"]) < double(b["d"]);
}
bool PPWorldKernel::_near_less(Dictionary a, Dictionary b) {
  double x = a["d"], y = b["d"];
  return !Math::is_equal_approx(x, y) ? x < y
                                      : int64_t(a["id"]) < int64_t(b["id"]);
}
bool PPWorldKernel::_edge_distance_less(Dictionary a, Dictionary b) {
  double x = a["distance"], y = b["distance"];
  return !Math::is_equal_approx(x, y) ? x < y
                                      : double(a["cost"]) < double(b["cost"]);
}
bool PPWorldKernel::_edge_score_less(Dictionary a, Dictionary b) {
  double x = a["score"], y = b["score"];
  return !Math::is_equal_approx(x, y)
             ? x > y
             : (a["a"] != b["a"] ? int64_t(a["a"]) < int64_t(b["a"])
                                 : int64_t(a["b"]) < int64_t(b["b"]));
}
Array PPWorldKernel::static_material(Array ids, Array cache,
                                     PackedVector2Array points) {
  Array result;
  for (int64_t i = 0; i < ids.size(); ++i)
    result.append(pixel(ids[i], cache, points));
  result.make_read_only();
  return result;
}
Array PPWorldKernel::static_square(Vector2 point, double radius, int64_t width,
                                   int64_t height, PackedByteArray cells,
                                   Array cache, PackedVector2Array points) {
  int64_t left =
              std::max<int64_t>(0, std::floor(double(point.x) - radius - 0.5)),
          right = std::min<int64_t>(width - 1,
                                    std::ceil(double(point.x) + radius - 0.5)),
          top =
              std::max<int64_t>(0, std::floor(double(point.y) - radius - 0.5)),
          bottom = std::min<int64_t>(height - 1,
                                     std::ceil(double(point.y) + radius - 0.5));
  Array result;
  for (int64_t y = top; y <= bottom; ++y)
    for (int64_t x = left; x <= right; ++x) {
      int64_t id = y * width + x;
      if (cells[id])
        result.append(pixel(id, cache, points));
    }
  return result;
}
Dictionary PPWorldKernel::cut(Array materials, Vector2 point, double radius,
                              PackedByteArray cells) {
  Array candidates;
  Dictionary changed;
  bool static_cut = false;
  for (int64_t i = 0; i < materials.size(); ++i) {
    Dictionary entry = materials[i];
    Array pixels = entry["pixels"];
    for (int64_t j = 0; j < pixels.size(); ++j) {
      Dictionary p = pixels[j];
      double distance = Vector2(p["q"]).distance_to(point);
      if (distance <= radius) {
        Dictionary c;
        c["piece"] = entry["piece"];
        c["id"] = p["id"];
        c["q"] = p["q"];
        c["d"] = distance;
        if (entry["piece"].get_type() != Variant::NIL) {
          PackedVector2Array original = entry["original"];
          Vector2 origin = entry["origin"], velocity = entry["velocity"];
          double rotation = entry["rotation"], angular = entry["angular"];
          Vector2 r =
              ((original[int64_t(p["id"])] - origin) * 4.0).rotated(rotation);
          c["velocity"] = (velocity + Vector2(-r.y, r.x) * angular) / 4.0;
        } else
          c["velocity"] = Vector2();
        candidates.append(c);
      }
    }
  }
  candidates.sort_custom(Callable(this, "_distance_less"));
  for (int64_t i = 0; i < candidates.size(); ++i) {
    Dictionary p = candidates[i];
    Variant piece = p["piece"];
    if (piece.get_type() != Variant::NIL) {
      if (!changed.has(piece))
        changed[piece] = Dictionary();
      Dictionary set = changed[piece];
      set[p["id"]] = true;
    } else {
      cells.set(p["id"], 0);
      static_cut = true;
    }
  }
  Array rebuild;
  for (int64_t i = 0; i < materials.size(); ++i) {
    Dictionary entry = materials[i];
    Variant piece = entry["piece"];
    if (!changed.has(piece))
      continue;
    Dictionary removed = changed[piece];
    Array ids = entry["ids"], remaining;
    for (int64_t j = 0; j < ids.size(); ++j)
      if (!removed.has(ids[j]))
        remaining.append(ids[j]);
    Dictionary command;
    command["piece"] = piece;
    command["remaining"] = remaining;
    rebuild.append(command);
  }
  // Preserve the source first-hit rebuild order.
  Array ordered;
  Array keys = changed.keys();
  for (int64_t i = 0; i < keys.size(); ++i)
    for (int64_t j = 0; j < rebuild.size(); ++j)
      if (Dictionary(rebuild[j])["piece"] == keys[i]) {
        ordered.append(rebuild[j]);
        break;
      }
  Dictionary out;
  out["candidates"] = candidates;
  out["rebuild"] = ordered;
  out["static_cut"] = static_cut;
  out["cells"] = cells;
  return out;
}
Array PPWorldKernel::blast(Array pieces, Array grains, Vector2 point,
                           double reach, double power) {
  Array commands;
  for (int64_t i = 0; i < pieces.size(); ++i) {
    Dictionary p = pieces[i];
    Array pixels = p["pixels"];
    bool near = false;
    for (int64_t j = 0; j < pixels.size(); ++j)
      if (Vector2(Dictionary(pixels[j])["q"]).distance_to(point) <= reach) {
        near = true;
        break;
      }
    if (!near)
      continue;
    Vector2 position = p["position"], direction = position / 4.0 - point;
    if (direction.length() < 0.01)
      direction = Vector2(0, -1);
    Vector2 impulse = direction.normalized() * 0.45 * power * 4.0 * 60.0;
    Dictionary command;
    command["piece"] = p["piece"];
    command["velocity"] = Vector2(p["velocity"]) + impulse / double(p["mass"]);
    command["angular"] =
        double(p["angular"]) +
        (point * 4.0 - position).cross(impulse) / double(p["inertia"]);
    commands.append(command);
  }
  for (int64_t i = 0; i < grains.size(); ++i) {
    Dictionary grain = grains[i];
    if (bool(grain["rest"]))
      continue;
    Vector2 p = grain["p"];
    double d = p.distance_to(point);
    if (d <= reach) {
      Vector2 direction = d >= 0.01 ? (p - point).normalized() : Vector2(0, -1);
      Vector2 velocity = Vector2(grain["v"]) +
                         direction * 32.0 * power * (1 - 0.5 * d / reach);
      grain["v"] = Vector2(std::clamp(double(velocity.x), -240.0, 240.0),
                           std::clamp(double(velocity.y), -240.0, 240.0));
    }
  }
  return commands;
}
Array PPWorldKernel::receiver(Array pixels, Vector2 point, Array groups) {
  Dictionary nearest = pixels[0];
  for (int64_t i = 0; i < pixels.size(); ++i) {
    Dictionary p = pixels[i];
    if (Vector2(p["q"]).distance_squared_to(point) <
        Vector2(nearest["q"]).distance_squared_to(point))
      nearest = p;
  }
  Dictionary have;
  for (int64_t i = 0; i < groups.size(); ++i) {
    Array group = groups[i];
    if (group.has(nearest["id"])) {
      have = id_set(group);
      break;
    }
  }
  Array result;
  for (int64_t i = 0; i < pixels.size(); ++i)
    if (have.has(Dictionary(pixels[i])["id"]))
      result.append(pixels[i]);
  return result;
}
Dictionary PPWorldKernel::crush(Array pixels, Array segments, double reach,
                                int64_t limit, double budget, bool fall) {
  Array nearby;
  double span = 0;
  for (int64_t i = 0; i < segments.size(); ++i) {
    Dictionary s = segments[i];
    span = std::max(span, double(Vector2(s["a"]).distance_to(s["b"])));
  }
  for (int64_t i = 0; i < pixels.size(); ++i) {
    Dictionary p = pixels[i];
    Vector2 q = p["q"];
    double distance = INFINITY;
    for (int64_t j = 0; j < segments.size(); ++j) {
      Dictionary s = segments[j];
      Vector2 closest =
          Geometry2D::get_singleton()->get_closest_point_to_segment(q, s["a"],
                                                                    s["b"]);
      distance = std::min(distance, double(q.distance_to(closest)));
    }
    Dictionary n;
    n["id"] = p["id"];
    n["q"] = q;
    n["d"] = distance;
    nearby.append(n);
  }
  nearby.sort_custom(Callable(this, "_near_less"));
  Dictionary crushed;
  for (int64_t i = 0; i < nearby.size(); ++i) {
    Dictionary p = nearby[i];
    double d = p["d"];
    if (d >= reach || crushed.size() >= limit)
      break;
    double cost = 1 + 3 * std::pow(d / reach, 2.0);
    if (budget < cost)
      break;
    budget -= cost;
    crushed[p["id"]] = true;
  }
  Array remaining, material, removed;
  for (int64_t i = 0; i < pixels.size(); ++i) {
    Dictionary p = pixels[i];
    if (!crushed.has(p["id"])) {
      remaining.append(p["id"]);
      material.append(p);
    } else
      removed.append(p);
  }
  double nearest = INFINITY;
  for (int64_t i = 0; i < nearby.size(); ++i) {
    Dictionary p = nearby[i];
    if (!fall || !crushed.has(p["id"])) {
      nearest = p["d"];
      break;
    }
  }
  Array contacts;
  for (int64_t i = 0; i < nearby.size(); ++i) {
    Dictionary p = nearby[i];
    if ((!fall || !crushed.has(p["id"])) && double(p["d"]) <= nearest + 1.25)
      contacts.append(p["id"]);
  }
  Dictionary out;
  out["crushed"] = crushed;
  out["remaining"] = remaining;
  out["remaining_material"] = material;
  out["removed"] = removed;
  out["contacts"] = contacts;
  out["contact_span"] = span;
  out["budget"] = budget;
  return out;
}
Array PPWorldKernel::edges(Dictionary graph, Array distances, Vector2 normal,
                           double reach, bool fall) {
  Array result, edges = graph["edges"], nodes = graph["nodes"];
  for (int64_t i = 0; i < edges.size(); ++i) {
    Dictionary e = edges[i];
    int64_t a = e["a"], b = e["b"];
    double distance = (double(distances[a]) + double(distances[b])) / 2;
    Vector2 span = Vector2(Dictionary(nodes[b])["center"]) -
                   Vector2(Dictionary(nodes[a])["center"]);
    double alignment = std::abs(span.normalized().dot(normal.normalized()));
    double score = std::max(0.0, 1 - distance / reach) *
                   (0.65 + 0.35 * alignment) / std::sqrt(double(e["cost"]));
    if ((fall && distance <= reach) || (!fall && score > 0)) {
      Dictionary candidate = e.duplicate();
      candidate["distance"] = distance;
      candidate["score"] = score;
      result.append(candidate);
    }
  }
  result.sort_custom(
      Callable(this, fall ? "_edge_distance_less" : "_edge_score_less"));
  return result;
}
Dictionary PPWorldKernel::crack(Node *world, Array remaining, Array before,
                                Array edges, Dictionary crushed,
                                Dictionary bonds, double budget, double span,
                                bool fall) {
  int64_t large = 0;
  for (int64_t i = 0; i < before.size(); ++i)
    if (Array(before[i]).size() >= 4)
      ++large;
  int64_t limit = std::max<int64_t>(10, fall ? before.size() : large);
  Ref<PPFractureConnectivity> connectivity;
  connectivity.instantiate();
  connectivity->setup(world, remaining, before, edges);
  double spent = 0, depth = 0;
  int64_t changes = 0;
  for (int64_t i = 0; i < edges.size(); ++i) {
    if (budget <= 0)
      break;
    Dictionary edge = edges[i];
    Array all = edge["bonds"], active;
    for (int64_t j = 0; j < all.size(); ++j) {
      Dictionary b = all[j];
      if (!crushed.has(b["id"]) && !crushed.has(b["other"]))
        active.append(b);
    }
    if (active.is_empty())
      continue;
    double cost = double(edge["cost"]) *
                  (fall ? 0.02 * std::max(1.0, span / 3) : 0.65),
           amount = std::min(1.0, budget / cost);
    connectivity->prepare();
    for (int64_t j = 0; j < active.size(); ++j) {
      Dictionary b = active[j];
      double old = b["old"];
      bonds[b["key"]] = old + (1 - old) * amount;
    }
    if (amount == 1 && !connectivity->allows_cut(active, limit)) {
      for (int64_t j = 0; j < active.size(); ++j) {
        Dictionary b = active[j];
        bonds[b["key"]] = b["old"];
      }
      continue;
    }
    if (amount < 1)
      connectivity->dirty = true;
    budget -= cost * amount;
    spent += cost * amount;
    changes += active.size();
    depth = std::max(depth, double(edge["distance"]));
  }
  Dictionary out;
  out["spent"] = spent;
  out["changes"] = changes;
  out["depth"] = depth;
  return out;
}
Dictionary PPWorldKernel::compression(Array children, Vector2 point,
                                      double budget) {
  Dictionary out;
  out["spent"] = 0.0;
  Array commands;
  out["commands"] = commands;
  if (children.size() < 2 || budget <= 0)
    return out;
  double mass = 0;
  Vector2 center;
  for (int64_t i = 0; i < children.size(); ++i)
    mass += double(Dictionary(children[i])["mass"]);
  for (int64_t i = 0; i < children.size(); ++i) {
    Dictionary c = children[i];
    center += Vector2(c["position"]) / 4.0 * double(c["mass"]) / mass;
  }
  Array rows;
  Vector2 mean;
  for (int64_t i = 0; i < children.size(); ++i) {
    Dictionary c = children[i];
    Vector2 away = (Vector2(c["position"]) / 4.0 - point).normalized();
    Dictionary row;
    row["body"] = c;
    row["r"] = Vector2(c["position"]) / 4.0 - center;
    row["a"] = away;
    rows.append(row);
    mean += away * double(c["mass"]) / mass;
  }
  double torque = 0, moment = 0;
  for (int64_t i = 0; i < rows.size(); ++i) {
    Dictionary r = rows[i], body = r["body"];
    Vector2 a = Vector2(r["a"]) - mean, pos = r["r"];
    r["a"] = a;
    torque += double(body["mass"]) * pos.cross(a);
    moment += double(body["mass"]) * pos.length_squared();
  }
  double rotation = moment > 0 ? torque / moment : 0, a = 0, b = 0;
  for (int64_t i = 0; i < rows.size(); ++i) {
    Dictionary r = rows[i], body = r["body"];
    Vector2 pos = r["r"],
            away = Vector2(r["a"]) + Vector2(pos.y, -pos.x) * rotation;
    r["a"] = away;
    a += 0.5 * double(body["mass"]) * away.length_squared();
    b += double(body["mass"]) *
         (Vector2(body["velocity"]) / (4.0 * 60)).dot(away);
  }
  if (a < 0.000000000001)
    return out;
  double scale = (-b + std::sqrt(b * b + 4 * a * budget * 0.002)) / (2 * a);
  for (int64_t i = 0; i < rows.size(); ++i) {
    Dictionary r = rows[i], body = r["body"], command;
    command["body"] = body["body"];
    command["velocity"] =
        Vector2(body["velocity"]) + Vector2(r["a"]) * scale * 4.0 * 60;
    commands.append(command);
  }
  out["spent"] = budget;
  return out;
}
int64_t PPWorldKernel::auto_index(Array grains, int64_t width) {
  int64_t selected = 0, lowest = 2147483647;
  for (int64_t i = 0; i < grains.size(); ++i) {
    Dictionary grain = grains[i];
    if (bool(grain["rest"])) {
      Vector2 p = grain["p"];
      int64_t key = int64_t(std::floor(p.y)) * width + int64_t(std::floor(p.x));
      if (key < lowest) {
        lowest = key;
        selected = i;
      }
    }
  }
  return selected;
}
Dictionary PPWorldKernel::suction(Array grains, Vector2 from, Vector2 to,
                                  double radius, int64_t count) {
  Array nearby;
  for (int64_t i = 0; i < grains.size(); ++i) {
    Dictionary grain = grains[i];
    Vector2 p = grain["p"],
            closest = Geometry2D::get_singleton()->get_closest_point_to_segment(
                p, from, to);
    double distance = p.distance_squared_to(closest);
    if (distance <= std::pow(radius, 2.0)) {
      Dictionary e;
      e["grain"] = grain;
      e["d"] = distance;
      nearby.append(e);
    }
  }
  nearby.sort_custom(Callable(this, "_distance_less"));
  count = std::min(count, nearby.size());
  Array selected, remaining;
  Dictionary taken;
  for (int64_t i = 0; i < count; ++i) {
    Dictionary grain = Dictionary(nearby[i])["grain"];
    selected.append(grain);
    taken[grain["id"]] = true;
  }
  for (int64_t i = 0; i < grains.size(); ++i)
    if (!taken.has(Dictionary(grains[i])["id"]))
      remaining.append(grains[i]);
  Dictionary out;
  out["selected"] = selected;
  out["remaining"] = remaining;
  out["count"] = count;
  out["taken"] = taken;
  return out;
}
Dictionary PPWorldKernel::secure(Array grains, Dictionary collected,
                                 Array colors) {
  Vector2 center;
  Array samples;
  int64_t count = grains.size();
  for (int64_t i = 0; i < count; ++i) {
    Dictionary grain = grains[i];
    int64_t id = grain["id"];
    Vector2 p = grain["p"];
    collected[id] = true;
    center += p / std::max(1.0, double(count));
    if (samples.size() < 8) {
      Dictionary sample;
      sample["x"] = p.x;
      sample["y"] = p.y;
      sample["color"] = int64_t(colors[id]);
      samples.append(sample);
    }
  }
  Dictionary out;
  out["center"] = center;
  out["samples"] = samples;
  return out;
}
PackedByteArray PPWorldKernel::remove_cells(PackedByteArray cells,
                                            Array pixels) {
  for (int64_t i = 0; i < pixels.size(); ++i)
    cells.set(Dictionary(pixels[i])["id"], 0);
  return cells;
}
Dictionary PPWorldKernel::group_stats(Array groups) {
  int64_t large = 0, largest = 0;
  for (int64_t i = 0; i < groups.size(); ++i) {
    int64_t size = Array(groups[i]).size();
    if (size >= 4)
      ++large;
    largest = std::max(largest, size);
  }
  Dictionary out;
  out["large"] = large;
  out["largest"] = largest;
  return out;
}
Array PPWorldKernel::emissions(Array pixels, PackedVector2Array original,
                               Vector2 origin, double rotation,
                               Vector2 velocity, double angular) {
  Array result;
  for (int64_t i = 0; i < pixels.size(); ++i) {
    Dictionary pixel = pixels[i], command;
    int64_t id = pixel["id"];
    Vector2 r = ((original[id] - origin) * 4.0).rotated(rotation);
    command["id"] = id;
    command["q"] = pixel["q"];
    command["velocity"] = (velocity + Vector2(-r.y, r.x) * angular) / 4.0;
    result.append(command);
  }
  return result;
}
PackedByteArray PPWorldKernel::clear_ids(PackedByteArray cells, Array ids) {
  for (int64_t i = 0; i < ids.size(); ++i)
    cells.set(ids[i], 0);
  return cells;
}
Dictionary PPWorldKernel::snap(PackedByteArray cells, Array cuts, int64_t width,
                               PackedVector2Array points) {
  Array emitted;
  for (int64_t i = 0; i < cuts.size(); ++i) {
    int64_t id = int64_t(Dictionary(cuts[i])["id"]) + width;
    if (id >= 0 && id < cells.size() && cells[id]) {
      cells.set(id, 0);
      Dictionary p;
      p["id"] = id;
      p["q"] = points[id];
      emitted.append(p);
    }
  }
  Dictionary out;
  out["cells"] = cells;
  out["emitted"] = emitted;
  return out;
}
