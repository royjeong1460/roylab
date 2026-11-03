#include "render_kernel.h"
#include <algorithm>
#include <cmath>
#include <cstring>
#include <godot_cpp/classes/image.hpp>
#include <godot_cpp/classes/mesh.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/aabb.hpp>
#include <godot_cpp/variant/packed_int32_array.hpp>
#include <godot_cpp/variant/packed_vector2_array.hpp>
#include <godot_cpp/variant/rect2.hpp>
#include <godot_cpp/variant/transform2d.hpp>
#include <godot_cpp/variant/vector2i.hpp>
#include <unordered_set>
namespace godot {
void PPRenderKernel::_bind_methods() {
#define METRIC(name) \
  ClassDB::bind_method(D_METHOD("get_" #name), &PPRenderKernel::get_##name); \
  ADD_PROPERTY(PropertyInfo(Variant::INT, #name), "", "get_" #name)
  METRIC(full_rebuilds);
  METRIC(dirty_updates);
  METRIC(cached_grains);
  METRIC(moving_grains);
  METRIC(chunk_count);
  METRIC(chunk_uploads);
#undef METRIC
  ClassDB::bind_method(D_METHOD("clear_grains", "mesh"), &PPRenderKernel::clear_grains);
  ClassDB::bind_method(D_METHOD("sync_grains", "mesh", "grains", "dirty", "added",
                                "removed", "blocked", "settled", "rebuild", "width", "height", "tile"),
                       &PPRenderKernel::sync_grains);
  ClassDB::bind_method(D_METHOD("pixel_mesh_arrays", "rectangles", "center",
                                "pixel_scale", "extent"),
                       &PPRenderKernel::pixel_mesh_arrays);
}
int64_t PPRenderKernel::cell(Vector2 point) const {
  if (source_width <= 0 || source_height <= 0 || !point.is_finite() ||
      point.x < 0 || point.y < 0 || point.x >= source_width || point.y >= source_height)
    return -1;
  return int64_t(std::floor(point.y)) * source_width + int64_t(std::floor(point.x));
}
bool PPRenderKernel::asleep(int64_t id, const Grain &grain,
                           const Dictionary &blocked, const Dictionary &settled) const {
  int64_t at = cell(grain.source["p"]);
  return bool(grain.source.get("rest", false)) && at >= 0 && blocked.has(at) &&
         settled.has(at) && int64_t(Dictionary(settled[at])["id"]) == id;
}
void PPRenderKernel::erase_cell(int64_t id, Grain &grain) {
  int64_t at = grain.cached_cell;
  grain.cached_cell = -1;
  // A stale removal must never erase a replacement grain's cell.
  auto owner = cell_owners.find(at);
  if (at < 0 || owner == cell_owners.end() || owner->second != id)
    return;
  int64_t x = at % source_width, y = at / source_width;
  auto found = chunks.find({x / CHUNK_CELLS, y / CHUNK_CELLS});
  if (found != chunks.end()) {
    Chunk &chunk = found->second;
    int64_t start = ((y % CHUNK_CELLS) * CELL_PIXELS * CHUNK_PIXELS +
                     (x % CHUNK_CELLS) * CELL_PIXELS) * 4;
    for (int row = 0; row < CELL_PIXELS; ++row)
      std::memset(chunk.rgba.data() + start + row * CHUNK_PIXELS * 4, 0, CELL_PIXELS * 4);
    --chunk.cells;
    chunk.dirty = true;
  }
  cell_owners.erase(owner);
}
void PPRenderKernel::cache_cell(int64_t id, Grain &grain, const uint8_t *tile) {
  int64_t at = cell(grain.source["p"]);
  int64_t x = at % source_width, y = at / source_width;
  Chunk &chunk = chunks[{x / CHUNK_CELLS, y / CHUNK_CELLS}];
  if (cell_owners.find(at) == cell_owners.end())
    ++chunk.cells;
  cell_owners[at] = id;
  int64_t start = ((y % CHUNK_CELLS) * CELL_PIXELS * CHUNK_PIXELS +
                   (x % CHUNK_CELLS) * CELL_PIXELS) * 4;
  for (int row = 0; row < CELL_PIXELS; ++row)
    std::memcpy(chunk.rgba.data() + start + row * CHUNK_PIXELS * 4,
                tile + row * CELL_PIXELS * 4, CELL_PIXELS * 4);
  chunk.dirty = true;
  grain.cached_cell = at;
  grain.point = grain.source["p"];
  grain.slot = -1;
}
void PPRenderKernel::clear_grains(const Ref<MultiMesh> &mesh) {
  live.clear();
  moving.clear();
  cell_owners.clear();
  chunks.clear();
  next_ordinal = 0;
  source_width = source_height = 0;
  if (mesh->get_visible_instance_count() != 0)
    mesh->set_visible_instance_count(0);
}
Array PPRenderKernel::sync_grains(const Ref<MultiMesh> &mesh,
                                  const Array &grains, Dictionary dirty,
                                  Dictionary added, Dictionary removed,
                                  const Dictionary &blocked, const Dictionary &settled,
                                  bool rebuild, int64_t width, int64_t height,
                                  const PackedByteArray &tile) {
  Array updates;
  // The caller supplies the same exact RGBA8 tile used by the moving texture.
  ERR_FAIL_COND_V(tile.size() != CELL_PIXELS * CELL_PIXELS * 4, updates);
  const uint8_t *tile_data = tile.ptr();
  rebuild = rebuild || source_width != width || source_height != height;
  bool membership_changed = rebuild;
  std::unordered_set<int64_t> moved;
  if (rebuild) {
    ++full_rebuilds;
    // Also cover a native size fallback that the surface did not request.
    for (const auto &item : chunks) {
      Dictionary update;
      update["chunk"] = Vector2i(item.first.first, item.first.second);
      update["image"] = Variant();
      updates.append(update);
    }
    clear_grains(mesh);
    source_width = width;
    source_height = height;
    for (int64_t i = 0; i < grains.size(); ++i) {
      Dictionary source = grains[i];
      int64_t id = source["id"];
      Grain grain;
      grain.source = source;
      grain.ordinal = next_ordinal++;
      grain.point = source["p"];
      live[id] = grain;
      moving[grain.ordinal] = id;
    }
    mesh->set_custom_aabb(AABB(Vector3(-4, -4, -1),
                               Vector3((width + 2) * 4, (height + 2) * 4, 2)));
  } else {
    dirty_updates += added.size() + removed.size() + dirty.size();
    Array ids = removed.keys();
    for (int64_t i = 0; i < ids.size(); ++i) {
      int64_t id = ids[i];
      auto found = live.find(id);
      if (found == live.end())
        continue;
      Grain &grain = found->second;
      if (grain.cached_cell >= 0)
        erase_cell(id, grain);
      else {
        moving.erase(grain.ordinal);
        membership_changed = true;
      }
      live.erase(found);
    }
    ids = added.keys();
    for (int64_t i = 0; i < ids.size(); ++i) {
      int64_t id = ids[i];
      if (live.find(id) != live.end())
        continue;
      Grain grain;
      grain.source = added[id];
      grain.ordinal = next_ordinal++;
      grain.point = grain.source["p"];
      live[id] = grain;
      moving[grain.ordinal] = id;
      membership_changed = true;
    }
    ids = dirty.keys();
    for (int64_t i = 0; i < ids.size(); ++i) {
      int64_t id = ids[i];
      auto found = live.find(id);
      if (found == live.end())
        continue;
      Grain &grain = found->second;
      grain.source = dirty[id];
      Vector2 point = grain.source["p"];
      if (point == grain.point)
        continue;
      if (grain.cached_cell >= 0) {
        erase_cell(id, grain);
        moving[grain.ordinal] = id;
        membership_changed = true;
      }
      grain.point = point;
      moved.insert(id);
    }
  }
  // Only the moving roster is inspected. A woken cached grain stays fixed until
  // draw_dirty reports actual movement, avoiding an idle scan of sleeping IDs.
  for (auto it = moving.begin(); it != moving.end();) {
    int64_t id = it->second;
    Grain &grain = live.at(id);
    if (asleep(id, grain, blocked, settled)) {
      cache_cell(id, grain, tile_data);
      it = moving.erase(it);
      membership_changed = true;
    } else
      ++it;
  }
  if (membership_changed) {
    int64_t count = moving.size();
    if (count > mesh->get_instance_count()) {
      int64_t capacity = std::max<int64_t>(128, mesh->get_instance_count());
      while (capacity < count)
        capacity *= 2;
      mesh->set_instance_count(capacity);
    }
    int64_t slot = 0;
    // Ordinals follow source append order; original map pixel IDs do not.
    for (const auto &item : moving) {
      Grain &grain = live.at(item.second);
      grain.slot = slot;
      mesh->set_instance_transform_2d(slot++, Transform2D(0.0, grain.point * 4.0));
    }
    if (mesh->get_visible_instance_count() != count)
      mesh->set_visible_instance_count(count);
  } else {
    for (int64_t id : moved) {
      const Grain &grain = live.at(id);
      if (grain.cached_cell < 0)
        mesh->set_instance_transform_2d(grain.slot, Transform2D(0.0, grain.point * 4.0));
    }
  }
  for (auto it = chunks.begin(); it != chunks.end();) {
    Chunk &chunk = it->second;
    if (!chunk.dirty) {
      ++it;
      continue;
    }
    Dictionary update;
    update["chunk"] = Vector2i(it->first.first, it->first.second);
    if (chunk.cells == 0) {
      update["image"] = Variant();
      updates.append(update);
      it = chunks.erase(it);
      continue;
    }
    PackedByteArray data;
    data.resize(chunk.rgba.size());
    std::memcpy(data.ptrw(), chunk.rgba.data(), chunk.rgba.size());
    update["image"] = Image::create_from_data(CHUNK_PIXELS, CHUNK_PIXELS, false, Image::FORMAT_RGBA8, data);
    updates.append(update);
    ++chunk_uploads;
    chunk.dirty = false;
    ++it;
  }
  dirty.clear();
  added.clear();
  removed.clear();
  return updates;
}
Array PPRenderKernel::pixel_mesh_arrays(const Array &rectangles, Vector2 center,
                                        double pixel_scale,
                                        Vector2 extent) const {
  PackedVector2Array vertices, uvs;
  PackedInt32Array indices;
  for (int64_t i = 0; i < rectangles.size(); ++i) {
    Rect2 rect = rectangles[i];
    int64_t start = vertices.size();
    Vector2 end = rect.get_end();
    Vector2 corners[4] = {rect.position, Vector2(end.x, rect.position.y), end,
                          Vector2(rect.position.x, end.y)};
    for (const Vector2 &corner : corners) {
      vertices.append((corner - center) * pixel_scale);
      uvs.append(corner / extent);
    }
    for (int64_t index :
         {start, start + 1, start + 2, start, start + 2, start + 3})
      indices.append(index);
  }
  // An empty result retains the original early return before replacing mesh.
  if (vertices.is_empty())
    return Array();
  Array arrays;
  arrays.resize(Mesh::ARRAY_MAX);
  arrays[Mesh::ARRAY_VERTEX] = vertices;
  arrays[Mesh::ARRAY_TEX_UV] = uvs;
  arrays[Mesh::ARRAY_INDEX] = indices;
  return arrays;
}
} // namespace godot
