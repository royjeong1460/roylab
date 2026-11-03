#include "pixel_kernel.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/callable.hpp>
#include <godot_cpp/variant/rect2.hpp>
#include <godot_cpp/variant/vector2i.hpp>
using namespace godot;
static int64_t key_for(int64_t a, int64_t b, int64_t count) {
  return std::min(a, b) * count + std::max(a, b);
}
static Vector2 position_for(int id, const PackedVector2Array &points,
                            Vector2 origin, Vector2 position, double rotation) {
  return (position + ((points[id] - origin) * 4.0).rotated(rotation)) / 4.0;
}
void PPPixelKernel::_bind_methods() {
  ClassDB::bind_method(D_METHOD("groups", "ids", "width", "count", "bonds"),
                       &PPPixelKernel::groups);
  ClassDB::bind_method(D_METHOD("_larger_group", "a", "b"),
                       &PPPixelKernel::larger_group);
  ClassDB::bind_method(D_METHOD("rectangles", "ids", "width"),
                       &PPPixelKernel::rectangles);
  ClassDB::bind_method(D_METHOD("project", "ids", "points", "origin",
                                "position", "rotation", "width", "bottom"),
                       &PPPixelKernel::project);
  ClassDB::bind_method(
      D_METHOD("material", "ids", "points", "origin", "position", "rotation"),
      &PPPixelKernel::material);
  ClassDB::bind_method(D_METHOD("static_ids", "cells"),
                       &PPPixelKernel::static_ids);
  ClassDB::bind_method(D_METHOD("occupancy", "fixed", "grids", "count"),
                       &PPPixelKernel::occupancy);
  ClassDB::bind_method(D_METHOD("body_geometry", "ids", "points"),
                       &PPPixelKernel::body_geometry);
}
Array PPPixelKernel::groups(const Array &ids, int width, int count,
                            const Dictionary &bonds) {
  if ((int)marks.size() != count || stamp == INT32_MAX) {
    marks.assign(count, 0);
    stamp = 0;
  }
  ++stamp;
  for (int i = 0; i < ids.size(); ++i)
    marks[(int)ids[i]] = stamp;
  Array out;
  for (int i = 0; i < ids.size(); ++i) {
    int seed = ids[i];
    if (marks[seed] != stamp)
      continue;
    Array group;
    group.append(seed);
    marks[seed] = 0;
    for (int head = 0; head < group.size(); ++head) {
      int current = group[head];
      int ns[4], n = 0;
      if (current % width > 0)
        ns[n++] = current - 1;
      if (current % width < width - 1)
        ns[n++] = current + 1;
      if (current >= width)
        ns[n++] = current - width;
      if (current + width < count)
        ns[n++] = current + width;
      for (int k = 0; k < n; ++k) {
        int id = ns[k];
        if (marks[id] != stamp)
          continue;
        if ((double)bonds.get(key_for(current, id, count), 0.0) < 1.0) {
          marks[id] = 0;
          group.append(id);
        }
      }
    }
    out.append(group);
  }
  out.sort_custom(Callable(this, "_larger_group"));
  return out;
}
Array PPPixelKernel::rectangles(const Array &ids, int width) const {
  Dictionary rows;
  for (int i = 0; i < ids.size(); ++i) {
    int64_t id = ids[i];
    int y = std::floor(double(id) / width);
    if (!rows.has(y))
      rows[y] = Array();
    Array xs = rows[y];
    xs.append(id % width);
  }
  Array ys = rows.keys();
  ys.sort();
  Array rects;
  Dictionary active;
  for (int i = 0; i < ys.size(); ++i) {
    int y = ys[i];
    Array xs = rows[y];
    xs.sort();
    int n = 0;
    while (n < xs.size()) {
      int start = xs[n], end = start;
      ++n;
      while (n < xs.size() && (int)xs[n] == end + 1) {
        end = xs[n];
        ++n;
      }
      Vector2i key(start, end);
      int previous = active.get(key, -1);
      if (previous >= 0 && int(Rect2(rects[previous]).get_end().y) == y) {
        Rect2 rect = rects[previous];
        rect.size.y += 1;
        rects[previous] = rect;
      } else {
        active[key] = rects.size();
        rects.append(Rect2(start, y, end - start + 1, 1));
      }
    }
  }
  return rects;
}
PackedInt32Array PPPixelKernel::project(const Array &ids,
                                        const PackedVector2Array &points,
                                        Vector2 origin, Vector2 position,
                                        double rotation, int width,
                                        int bottom) const {
  PackedInt32Array grid;
  for (int i = 0; i < ids.size(); ++i) {
    Vector2 p = position_for((int)ids[i], points, origin, position, rotation);
    int x = std::floor(p.x), y = std::floor(p.y);
    if (x >= 0 && x < width && y >= 0 && y < bottom)
      grid.append(y * width + x);
  }
  return grid;
}
Array PPPixelKernel::material(const Array &ids,
                              const PackedVector2Array &points, Vector2 origin,
                              Vector2 position, double rotation) const {
  Array out;
  for (int i = 0; i < ids.size(); ++i) {
    Dictionary p;
    p["id"] = ids[i];
    p["q"] = position_for((int)ids[i], points, origin, position, rotation);
    out.append(p);
  }
  return out;
}
Array PPPixelKernel::static_ids(const PackedByteArray &cells) const {
  Array ids;
  for (int i = 0; i < cells.size(); ++i)
    if ((bool)cells[i])
      ids.append(i);
  return ids;
}
Dictionary PPPixelKernel::occupancy(const Array &fixed, const Array &grids,
                                    int count) const {
  PackedByteArray all, dynamic;
  all.resize(count);
  dynamic.resize(count);
  all.fill(0);
  dynamic.fill(0);
  // The original source only supplies valid cell IDs, in original body/pixel
  // order.
  for (int i = 0; i < fixed.size(); ++i)
    all.set((int)fixed[i], 1);
  for (int i = 0; i < grids.size(); ++i) {
    PackedInt32Array grid = grids[i];
    for (int j = 0; j < grid.size(); ++j) {
      all.set(grid[j], 1);
      dynamic.set(grid[j], 1);
    }
  }
  Dictionary out;
  out["all"] = all;
  out["dynamic"] = dynamic;
  return out;
}
Dictionary
PPPixelKernel::body_geometry(const Array &ids,
                             const PackedVector2Array &points) const {
  Vector2 center;
  for (int i = 0; i < ids.size(); ++i)
    center += points[(int)ids[i]];
  center /= ids.size();
  double moment = 0.0, radius = 1.0;
  for (int i = 0; i < ids.size(); ++i) {
    Vector2 local = (points[(int)ids[i]] - center) * 4.0;
    moment += 0.008 * (local.length_squared() + 16.0 / 6.0);
    radius = std::max(radius, double(local.length()) + 3.0);
  }
  Dictionary out;
  out["center"] = center;
  out["moment"] = moment;
  out["radius"] = radius;
  return out;
}
