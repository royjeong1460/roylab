#include "effect_kernel.h"
#include "graph_kernels.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/packed_vector2_array.hpp>
static Dictionary d(Variant v) { return v; }
static Array a(Variant v) { return v; }
static int64_t i(Variant v) { return v; }
static double f(Variant v) { return v; }
static Vector2 q(Variant v) { return d(v)["q"]; }
static double clamp(double x, double lo, double hi) {
  return x < lo ? lo : (x > hi ? hi : x);
}
// A scan never calls script code or mutates geometry; capture its source pose once.
struct PixelScan {
  PackedVector2Array points;
  Vector2 origin, position;
  double rotation;
  PixelScan(Object *world, Object *piece)
      : points(world->get("_original_points")), origin(piece->get("origin_center")),
        position(piece->get("position")), rotation(piece->get("rotation")) {}
  Vector2 pixel(int64_t id) const {
    return (position + ((points[id] - origin) * 4.0).rotated(rotation)) / 4.0;
  }
};
void PPEffectKernel::_bind_methods() {
#define B(name, ...)                                                           \
  ClassDB::bind_method(D_METHOD(#name, __VA_ARGS__), &PPEffectKernel::name)
  ClassDB::bind_method(
      D_METHOD("pressure_bonds", "material", "bonds", "width", "count", "point",
               "strength", "direction", "radius", "propagates", "position",
               "scope_center", "scope_radius"),
      &PPEffectKernel::pressure_bonds, DEFVAL(Vector2()), DEFVAL(-1.0));
  ClassDB::bind_method(
      D_METHOD("halo_bonds", "material", "bonds", "width", "count", "point",
               "reach", "strength", "scope_center", "scope_radius"),
      &PPEffectKernel::halo_bonds, DEFVAL(Vector2()), DEFVAL(-1.0));
  B(structure_material, "world");
  B(surface, "world", "piece");
  B(nearest, "material", "point", "radius", "inclusive");
  B(near_piece, "world", "piece", "point", "radius");
  B(near_pieces, "world", "point", "radius");
  B(pull_grains, "grains", "center", "radius", "power", "dt");
  B(pull_piece, "world", "piece", "center", "radius", "power", "dt");
  B(core_impulse, "position", "velocity", "mass", "center", "radius", "power",
    "mix", "cycle", "dt");
  B(strain_points, "ids", "groups", "width", "center", "radius");
  B(wear_additions, "world", "samples", "wells", "dt");
  B(apply_wear, "wear", "pixels", "dt", "multiplier");
  B(split_wear, "ids", "wear");
  B(prune_wear, "wear", "pieces");
  B(spaced, "candidates", "chosen", "gap");
  B(grain_ids, "grains", "point", "radius");
  B(owned, "ids");
  B(intersects, "ids", "set");
  B(group_member, "ids", "groups", "group");
  B(seed_groups, "material", "groups", "point", "radius");
  B(nearest_group, "ids", "groups", "width", "point");
  B(bounds, "material");
  B(columns, "world");
  B(orbital_hit, "columns", "x", "radius", "previous", "y", "ground");
  B(seismic, "material", "x", "span", "world");
  B(sonic, "material", "x", "span", "side", "center", "groups", "hit");
  B(kick_grains, "grains", "point", "radius", "direction", "strength", "ids");
  B(gravity_grains, "grains", "added");
  B(gravity_contacts, "samples", "pieces", "supported", "static_body");
#undef B
}
int64_t PPEffectKernel::pressure_bonds(Array material, Dictionary bonds,
                                       int64_t width, int64_t count,
                                       Vector2 point, double strength,
                                       Vector2 direction, double radius,
                                       bool propagates, Vector2 position,
                                       Vector2 scope_center, double scope_radius) {
  Dictionary by;
  const double scope_squared = scope_radius * scope_radius;
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    // Both bond endpoints must belong to the live skill circle.
    if (scope_radius >= 0.0 &&
        q(p).distance_squared_to(scope_center) > scope_squared)
      continue;
    // Read-only Dictionary indexing reuses a temporary; copy before the next read.
    const int64_t pid = p["id"];
    const Vector2 pixel_position = p["q"];
    by[pid] = pixel_position;
  }
  Vector2 axis;
  double reach = 1;
  if (propagates) {
    axis = position / 4.0 - point;
    if (axis.length() < 1)
      axis = direction;
    axis = axis.normalized();
    for (int k = 0; k < material.size(); k++)
      reach = std::max(reach, double((q(material[k]) - point).dot(axis)));
  }
  int64_t changed = 0;
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    int64_t pid = p["id"];
    if (scope_radius >= 0.0 && !by.has(pid))
      continue;
    Vector2 firstq = p["q"];
    Array ns = PPFractureGraph::neighbors(pid, width, count);
    for (int j = 0; j < ns.size(); j++) {
      int64_t id = ns[j];
      if (id < pid || !by.has(id))
        continue;
      int64_t key = PPFractureGraph::bond_key(pid, id, count);
      double old = bonds.get(key, 0.0);
      if (old >= 1)
        continue;
      Vector2 other = by[id], delta = (firstq + other) / 2 - point;
      double along = delta.dot(direction), across = direction.cross(delta),
             distance = Vector2(along * 0.8, across * 1.25).length(),
             depth = delta.dot(axis);
      Vector2 first = firstq - point, second = other - point;
      double side_a =
                 axis.cross(first) - std::sin(first.dot(axis) * 0.45) * 0.3,
             side_b =
                 axis.cross(second) - std::sin(second.dot(axis) * 0.45) * 0.3;
      bool on = propagates && depth >= -0.75 && side_a * side_b <= 0;
      if (distance >= radius && !on)
        continue;
      double alignment = std::abs(double((other - firstq).dot(direction))),
             toughness = 0.85 + ((((pid + 1) * 31) ^ id) & 15) / 50.0,
             local = strength * 0.58 * std::max(0.0, 1 - distance / radius) *
                     (0.55 + 0.45 * alignment),
             propagated =
                 on ? strength * 1.1 * (1 - 0.3 * clamp(depth / reach, 0, 1))
                    : 0;
      bonds[key] = std::min(1.0, old + std::max(local, propagated) / toughness);
      changed++;
    }
  }
  return changed;
}
int64_t PPEffectKernel::halo_bonds(Array material, Dictionary bonds,
                                   int64_t width, int64_t count, Vector2 point,
                                   double reach, double strength,
                                   Vector2 scope_center, double scope_radius) {
  Dictionary by;
  const double scope_squared = scope_radius * scope_radius;
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    if (scope_radius >= 0.0 &&
        q(p).distance_squared_to(scope_center) > scope_squared)
      continue;
    // Read-only Dictionary indexing reuses a temporary; copy before the next read.
    const int64_t pid = p["id"];
    const Vector2 pixel_position = p["q"];
    by[pid] = pixel_position;
  }
  int64_t local = 0;
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    int64_t pid = p["id"];
    if (scope_radius >= 0.0 && !by.has(pid))
      continue;
    Array ns = PPFractureGraph::neighbors(pid, width, count);
    for (int j = 0; j < ns.size(); j++) {
      int64_t id = ns[j];
      if (id < pid || !by.has(id))
        continue;
      double distance = ((q(p) + Vector2(by[id])) / 2).distance_to(point);
      if (distance >= reach)
        continue;
      int64_t key = PPFractureGraph::bond_key(pid, id, count);
      double old = bonds.get(key, 0.0),
             toughness = 0.85 + ((((pid + 1) * 31) ^ id) & 15) / 50.0,
             added = std::min(1 - old,
                              strength * (1 - distance / reach) / toughness);
      if (added <= 0)
        continue;
      bonds[key] = old + added;
      local++;
    }
  }
  return local;
}
Array PPEffectKernel::structure_material(Object *world) {
  Array pieces = world->get("pieces"), all;
  all.append(Variant());
  all.append_array(pieces);
  Array material;
  for (int k = 0; k < all.size(); k++) {
    Array ps = world->call("material", all[k]);
    for (int j = 0; j < ps.size(); j++) {
      Dictionary p = ps[j], r;
      r["id"] = p["id"];
      r["q"] = p["q"];
      r["piece"] = all[k];
      material.append(r);
    }
  }
  return material;
}
Dictionary PPEffectKernel::nearest(Array material, Vector2 point, double radius,
                                   bool inclusive) {
  Dictionary found;
  double distance = radius;
  for (int k = 0; k < material.size(); k++) {
    double dist = q(material[k]).distance_to(point);
    if (dist < distance ||
        (inclusive && dist == distance && found.is_empty())) {
      distance = dist;
      found = material[k];
    }
  }
  return found;
}
bool PPEffectKernel::near_piece(Object *world, Object *piece, Vector2 point,
                                double radius) {
  Vector2 position = piece->get("position");
  double reach = radius + double(piece->get("motion_radius")) / 4;
  if ((position / 4).distance_squared_to(point) > reach * reach)
    return false;
  Array ids = piece->get("ids");
  PixelScan scan(world, piece);
  for (int k = 0; k < ids.size(); k++)
    if (scan.pixel(ids[k]).distance_to(point) <= radius)
      return true;
  return false;
}
Array PPEffectKernel::near_pieces(Object *world, Vector2 point, double radius) {
  Array pieces = world->get("pieces"), out;
  for (int k = 0; k < pieces.size(); k++) {
    Object *p = pieces[k];
    if (near_piece(world, p, point, radius))
      out.append(p);
  }
  return out;
}
Dictionary PPEffectKernel::pull_piece(Object *world, Object *piece,
                                      Vector2 center, double radius,
                                      double power, double dt) {
  Dictionary out;
  Vector2 position = piece->get("position");
  double reach = radius + double(piece->get("motion_radius")) / 4;
  if ((position / 4).distance_squared_to(center) > reach * reach)
    return out;
  Array ids = piece->get("ids");
  PixelScan scan(world, piece);
  double near = radius;
  Vector2 point;
  bool found = false;
  for (int k = 0; k < ids.size(); k++) {
    Vector2 pos = scan.pixel(ids[k]);
    double distance = pos.distance_to(center);
    if (distance < near) {
      near = distance;
      point = pos;
      found = true;
    }
  }
  if (!found)
    return out;
  Vector2 direction = center - position / 4;
  if (direction.length() < 0.25)
    return out;
  double mass = piece->get("mass"),
         acceleration = 0.18 * power * (1 - 0.5 * near / radius) / (0.5 + mass);
  out["point"] = point;
  out["impulse"] = direction.normalized() * acceleration * dt * 60.0 * mass;
  return out;
}
void PPEffectKernel::pull_grains(Array grains, Vector2 center, double radius,
                                 double power, double dt) {
  for (int k = 0; k < grains.size(); k++) {
    Dictionary g = grains[k];
    if (bool(g["rest"]))
      continue;
    Vector2 direction = center - Vector2(g["p"]);
    double distance = direction.length();
    if (distance < 0.25 || distance > radius)
      continue;
    double speed = 55 * power * (1 - 0.5 * distance / radius) * dt;
    Vector2 velocity = Vector2(g["v"]) + direction / distance * speed;
    g["v"] =
        Vector2(clamp(velocity.x, -240, 240), clamp(velocity.y, -240, 240));
    g["rest"] = false;
  }
}
Vector2 PPEffectKernel::core_impulse(Vector2 position, Vector2 velocity,
                                     double mass, Vector2 center, double radius,
                                     double power, double mix, double cycle,
                                     double dt) {
  Vector2 offset = position / 4 - center;
  double distance = offset.length();
  if (distance < 0.25 || distance >= radius)
    return Vector2();
  Vector2 normal = offset / distance;
  double core_radius = radius * 0.4,
         edge = std::min(1.0, (radius - distance) /
                                  std::max(1.0, radius - core_radius)),
         strength = power * mix;
  velocity /= 240.0;
  double outward = std::max(0.0, double(velocity.dot(normal))),
         brake = outward * (1 - std::exp(-50 * strength * edge * dt)),
         acceleration = 0.18 * strength / (0.5 + mass),
         inward = acceleration * 5 * std::min(1.0, distance / core_radius) *
                      edge * dt * 60 +
                  brake,
         stir = acceleration * 0.8 * std::max(0.0, 1 - distance / core_radius) *
                cycle * dt * 60;
  return (-normal * inward + Vector2(-normal.y, normal.x) * stir) * mass;
}
Array PPEffectKernel::strain_points(Array ids, Dictionary groups, int64_t width,
                                    Vector2 center, double radius) {
  Dictionary structures;
  for (int k = 0; k < ids.size(); k++) {
    int64_t id = ids[k], group = groups.get(id, 0),
            y = std::floor(double(id) / width);
    if (!structures.has(group))
      structures[group] = Dictionary();
    Dictionary rows = structures[group];
    if (!rows.has(y))
      rows[y] = Array();
    a(rows[y]).append(id % width);
  }
  Array result, rs = structures.values();
  for (int k = 0; k < rs.size(); k++) {
    Dictionary rows = rs[k], support;
    Array ys = rows.keys();
    for (int j = 0; j < ys.size(); j++) {
      int64_t y = ys[j];
      Array xs = rows[y], points;
      int n = 0;
      while (n < xs.size()) {
        int64_t first = xs[n], last = first;
        n++;
        while (n < xs.size() && i(xs[n]) == last + 1) {
          last = xs[n];
          n++;
        }
        Vector2 point((first + last + 1) / 2.0, double(y) + 0.5);
        if (point.distance_to(center) < radius)
          points.append(point);
      }
      if (points.is_empty())
        continue;
      double distance = INFINITY;
      for (int n = 0; n < points.size(); n++)
        distance =
            std::min(distance, double(Vector2(points[n]).distance_to(center)));
      if (support.is_empty() || xs.size() < i(support["width"]) ||
          (xs.size() == i(support["width"]) &&
           distance < f(support["distance"]))) {
        support["width"] = xs.size();
        support["distance"] = distance;
        support["points"] = points;
      }
    }
    if (!support.is_empty())
      result.append_array(support["points"]);
  }
  return result;
}
Array PPEffectKernel::surface(Object *world, Object *piece) {
  Array ids = piece->get("ids"), out;
  Dictionary have = owned(ids);
  int64_t width = world->get("width");
  PixelScan scan(world, piece);
  for (int k = 0; k < ids.size(); k++) {
    int64_t id = ids[k];
    Array ns = PPFractureGraph::neighbors(id, width, scan.points.size());
    for (int j = 0; j < ns.size(); j++)
      if (!have.has(ns[j])) {
        Dictionary cell;
        cell["id"] = id;
        cell["q"] = scan.pixel(id);
        out.append(cell);
        break;
      }
  }
  return out;
}
Dictionary PPEffectKernel::wear_additions(Object *world, Array samples,
                                          Array wells, double dt) {
  Dictionary additions, surfaces, touching;
  for (int k = 0; k < samples.size(); k++) {
    Dictionary sample = samples[k];
    Object *pa = sample["piece"], *pb = sample["other"];
    double friction;
    if (sample.has("friction"))
      friction = sample["friction"];
    else {
      Object *ma = pa->get("physics_material_override"),
             *mb = pb->get("physics_material_override");
      friction = std::min(ma ? double(ma->get("friction")) : 1.0,
                          mb ? double(mb->get("friction")) : 1.0);
    }
    if (friction <= 0)
      continue;
    double reduced =
               1 / (1 / double(pa->get("mass")) + 1 / double(pb->get("mass"))),
           pressure = std::min(2.0, std::max(0.0, f(sample["normal_impulse"])) /
                                        (reduced * 0.08));
    Vector2 normal = sample["normal"], tangent(-normal.y, normal.x);
    Array points = sample.get("points", Array::make(sample["point"]));
    for (int j = 0; j < points.size(); j++) {
      Vector2 point = points[j];
      Dictionary well;
      for (int n = 0; n < wells.size(); n++) {
        Dictionary active = wells[n];
        if (point.distance_to(active["p"]) < f(active["radius"]) * 0.4) {
          well = active;
          break;
        }
      }
      if (well.is_empty())
        continue;
      touching[pa] = true;
      touching[pb] = true;
      if (pressure <= 0)
        continue;
      Vector2 relative = sample["relative_velocity"],
              offset = point - Vector2(sample["point"]);
      relative +=
          Vector2(-offset.y, offset.x) * (double(pa->get("angular_velocity")) -
                                          double(pb->get("angular_velocity")));
      double slip = std::abs(double(relative.dot(tangent)));
      if (slip <= 3)
        continue;
      double amount = std::min(48.0, (slip - 3) * pressure * 8 *
                                         std::min(1.0, friction / 0.7)) *
                      std::min(dt, 1.0 / 30);
      for (Object *piece : {pa, pb}) {
        if (!surfaces.has(piece))
          surfaces[piece] = surface(world, piece);
        Array cells = surfaces[piece];
        int64_t closest = -1;
        double distance = 2.25;
        for (int n = 0; n < cells.size(); n++) {
          Dictionary cell = cells[n];
          Vector2 pos = cell["q"];
          double dist = pos.distance_to(point);
          if (dist < distance &&
              pos.distance_to(well["p"]) < f(well["radius"]) * 0.4) {
            distance = dist;
            closest = cell["id"];
          }
        }
        if (closest < 0)
          continue;
        if (!additions.has(piece))
          additions[piece] = Dictionary();
        Dictionary pixels = additions[piece];
        pixels[closest] = std::max(f(pixels.get(closest, 0.0)), amount);
      }
    }
  }
  Dictionary out;
  out["additions"] = additions;
  out["touching"] = touching;
  return out;
}
bool PPEffectKernel::apply_wear(Dictionary wear, Dictionary pixels, double dt,
                                double multiplier) {
  Array values = pixels.values();
  double total = 0;
  for (int k = 0; k < values.size(); k++)
    total += f(values[k]);
  double scale = std::min(1.0, 48 * dt / total) * multiplier;
  Array ids = pixels.keys();
  bool ready = false;
  for (int k = 0; k < ids.size(); k++) {
    Variant id = ids[k];
    double amount = std::min(1.5, f(wear.get(id, 0.0)) + f(pixels[id]) * scale);
    wear[id] = amount;
    if (amount >= 1)
      ready = true;
  }
  return ready;
}
Dictionary PPEffectKernel::split_wear(Array ids, Dictionary wear) {
  Array eroded, remaining;
  for (int k = 0; k < ids.size(); k++)
    if (f(wear.get(ids[k], 0.0)) >= 1)
      eroded.append(ids[k]);
    else
      remaining.append(ids[k]);
  Dictionary out;
  out["eroded"] = eroded;
  out["remaining"] = remaining;
  return out;
}
void PPEffectKernel::prune_wear(Dictionary wear, Array pieces) {
  Dictionary live;
  for (int k = 0; k < pieces.size(); k++) {
    Object *piece = pieces[k];
    Array ids = piece->get("ids");
    for (int j = 0; j < ids.size(); j++)
      live[ids[j]] = true;
  }
  Array ids = wear.keys();
  for (int k = 0; k < ids.size(); k++)
    if (!live.has(ids[k]))
      wear.erase(ids[k]);
}
Array PPEffectKernel::spaced(Array candidates, Array chosen, double gap) {
  Array out;
  for (int k = 0; k < candidates.size(); k++) {
    Vector2 candidate = candidates[k];
    bool yes = true;
    for (int j = 0; j < chosen.size(); j++)
      if (candidate.distance_to(chosen[j]) < gap) {
        yes = false;
        break;
      }
    if (yes)
      out.append(candidate);
  }
  return out;
}
Dictionary PPEffectKernel::owned(Array ids) {
  Dictionary out;
  for (int k = 0; k < ids.size(); k++)
    out[ids[k]] = true;
  return out;
}
bool PPEffectKernel::intersects(Array ids, Dictionary set) {
  for (int k = 0; k < ids.size(); k++)
    if (set.has(ids[k]))
      return true;
  return false;
}
bool PPEffectKernel::group_member(Array ids, Dictionary groups, int64_t group) {
  for (int k = 0; k < ids.size(); k++)
    if (i(groups.get(ids[k], -1)) == group)
      return true;
  return false;
}
Dictionary PPEffectKernel::seed_groups(Array material, Dictionary groups,
                                       Vector2 point, double radius) {
  Dictionary out;
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    if (q(p).distance_to(point) <= radius)
      out[groups.get(p["id"], -1)] = true;
  }
  return out;
}
int64_t PPEffectKernel::nearest_group(Array ids, Dictionary groups,
                                      int64_t width, Vector2 point) {
  double distance = INFINITY;
  int64_t group = -1;
  for (int k = 0; k < ids.size(); k++) {
    int64_t id = ids[k];
    Vector2 pos(id % width + 0.5, std::floor(double(id) / width) + 0.5);
    double dist = pos.distance_squared_to(point);
    if (dist < distance) {
      distance = dist;
      group = groups.get(id, -1);
    }
  }
  return group;
}
Dictionary PPEffectKernel::bounds(Array material) {
  Array xs;
  double top = INFINITY;
  for (int k = 0; k < material.size(); k++) {
    Vector2 pos = q(material[k]);
    xs.append(double(pos.x));
    top = std::min(top, double(pos.y));
  }
  xs.sort();
  Dictionary out;
  out["xs"] = xs;
  out["top"] = top;
  return out;
}
Dictionary PPEffectKernel::columns(Object *world) {
  Dictionary out;
  PackedVector2Array original_points = world->get("_original_points");
  Array pieces = world->get("pieces"), all;
  all.append(Variant());
  all.append_array(pieces);
  for (int k = 0; k < all.size(); k++) {
    Object *piece = all[k];
    Array ids =
        piece ? Array(piece->get("ids")) : Array(world->call("static_ids"));
    Vector2 origin = piece ? Vector2(piece->get("origin_center")) : Vector2();
    Vector2 position = piece ? Vector2(piece->get("position")) : Vector2();
    double rotation = piece ? double(piece->get("rotation")) : 0.0;
    for (int j = 0; j < ids.size(); j++) {
      Vector2 original = original_points[int64_t(ids[j])];
      Vector2 pos =
          piece
              ? (position + ((original - origin) * 4.0).rotated(rotation)) / 4.0
              : original;
      int64_t column = std::floor(pos.x);
      if (!out.has(column))
        out[column] = Array();
      a(out[column]).append(pos);
    }
  }
  return out;
}
double PPEffectKernel::orbital_hit(Dictionary columns, double x, double radius,
                                   double previous, double y, double ground) {
  double hit = ground;
  for (int64_t c = std::floor(x - radius); c <= std::floor(x + radius); c++) {
    Array points = columns.get(c, Array());
    for (int k = 0; k < points.size(); k++) {
      Vector2 p = points[k];
      if (std::abs(p.x - x) <= radius && p.y >= previous - radius &&
          p.y <= y + radius)
        hit = std::min(hit, double(p.y));
    }
  }
  return hit;
}
Dictionary PPEffectKernel::seismic(Array material, double x, double span,
                                   Object *world) {
  Dictionary contacts;
  PackedInt32Array ground_surface = world->get("ground_surface");
  int64_t width = world->get("width");
  double floor_y = world->get("floor_y");
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    Vector2 pos = p["q"];
    double ground = ground_surface.is_empty()
                        ? floor_y
                        : double(ground_surface[std::clamp<int64_t>(
                              std::floor(pos.x), 0, width - 1)]);
    if (std::abs(pos.x - x) > span || pos.y < ground - 10)
      continue;
    Dictionary previous = contacts.get(p["piece"], Dictionary());
    if (previous.is_empty() || pos.y > q(previous).y)
      contacts[p["piece"]] = p;
  }
  return contacts;
}
Dictionary PPEffectKernel::sonic(Array material, double x, double span,
                                 double side, double center, Dictionary groups,
                                 Dictionary hit) {
  Dictionary contacts;
  for (int k = 0; k < material.size(); k++) {
    Dictionary p = material[k];
    Vector2 pos = p["q"];
    if (std::abs(pos.x - x) > span || side * (pos.x - center) < 0)
      continue;
    int64_t group = groups.get(p["id"], -1);
    String key =
        String::num_int64(int64_t(side)) + ":" + String::num_int64(group);
    if (group <= 0 || hit.has(key))
      continue;
    Dictionary previous = contacts.get(key, Dictionary());
    if (previous.is_empty() ||
        std::abs(pos.x - x) < std::abs(q(previous).x - x)) {
      p["group"] = group;
      contacts[key] = p;
    }
  }
  return contacts;
}
void PPEffectKernel::kick_grains(Array grains, Vector2 point, double radius,
                                 Vector2 direction, double strength,
                                 Variant ids) {
  for (int k = 0; k < grains.size(); k++) {
    Dictionary g = grains[k];
    if (bool(g["rest"]) || (ids.get_type() != Variant::NIL
                                ? !Dictionary(ids).has(g["id"])
                                : Vector2(g["p"]).distance_to(point) > radius))
      continue;
    Vector2 away = direction == Vector2()
                       ? (Vector2(g["p"]) - point).normalized()
                       : direction,
            velocity = Vector2(g["v"]) + away * strength * 35;
    g["v"] =
        Vector2(clamp(velocity.x, -240, 240), clamp(velocity.y, -240, 240));
  }
}
void PPEffectKernel::gravity_grains(Array grains, double added) {
  for (int k = 0; k < grains.size(); k++) {
    Dictionary g = grains[k];
    if (!bool(g["rest"])) {
      Vector2 v = g["v"];
      v.y = clamp(double(v.y) + added, -240, 240);
      g["v"] = v;
    }
  }
}
Dictionary PPEffectKernel::gravity_contacts(Array samples, Array pieces,
                                            Dictionary supported,
                                            Object *static_body) {
  Dictionary contacts;
  for (int k = 0; k < samples.size(); k++) {
    Dictionary s = samples[k];
    Object *piece = s["piece"];
    Object *base = s["other"];
    if (!base)
      base = s["collider"];
    if (!piece || !pieces.has(piece) || !base || !supported.has(base) ||
        Vector2(s["normal"]).y > -0.7)
      continue;
    Array points = a(s["points"]), selected;
    Vector2 position = piece->get("position");
    for (int j = 0; j < points.size(); j++)
      if (Vector2(points[j]).y >= position.y / 4.0)
        selected.append(points[j]);
    if (selected.is_empty())
      continue;
    Vector2 point;
    for (int j = 0; j < selected.size(); j++)
      point += Vector2(selected[j]) / selected.size();
    Dictionary contact;
    contact["p"] = point;
    contact["base"] = s["other"];
    contact["static"] = s["collider"] == Variant(static_body);
    contacts[piece] = contact;
  }
  return contacts;
}

Dictionary PPEffectKernel::grain_ids(Array grains, Vector2 point,
                                     double radius) {
  Dictionary out;
  for (int k = 0; k < grains.size(); k++) {
    Dictionary g = grains[k];
    if (!bool(g["rest"]) && Vector2(g["p"]).distance_to(point) <= radius)
      out[g["id"]] = true;
  }
  return out;
}
