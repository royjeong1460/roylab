#pragma once
#include <godot_cpp/classes/multi_mesh.hpp>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>
#include <godot_cpp/variant/vector2.hpp>
#include <map>
#include <unordered_map>
#include <vector>
namespace godot {
class PPRenderKernel : public RefCounted {
  GDCLASS(PPRenderKernel, RefCounted)
  static constexpr int CHUNK_CELLS = 32, CELL_PIXELS = 4,
                       CHUNK_PIXELS = CHUNK_CELLS * CELL_PIXELS;
  struct Grain {
    Dictionary source;
    uint64_t ordinal = 0;
    Vector2 point;
    int64_t cached_cell = -1, slot = -1;
  };
  struct Chunk {
    std::vector<uint8_t> rgba = std::vector<uint8_t>(CHUNK_PIXELS * CHUNK_PIXELS * 4, 0);
    int64_t cells = 0;
    bool dirty = false;
  };
  using ChunkKey = std::pair<int64_t, int64_t>;
  std::unordered_map<int64_t, Grain> live;
  std::map<uint64_t, int64_t> moving;
  std::unordered_map<int64_t, int64_t> cell_owners;
  std::map<ChunkKey, Chunk> chunks;
  uint64_t next_ordinal = 0;
  int64_t full_rebuilds = 0, dirty_updates = 0;
  int64_t chunk_uploads = 0;
  int64_t source_width = 0, source_height = 0;
  int64_t cell(Vector2 point) const;
  bool asleep(int64_t id, const Grain &grain, const Dictionary &blocked,
              const Dictionary &settled) const;
  void erase_cell(int64_t id, Grain &grain);
  void cache_cell(int64_t id, Grain &grain, const uint8_t *tile);
protected:
  static void _bind_methods();

public:
  int64_t get_full_rebuilds() const { return full_rebuilds; }
  int64_t get_dirty_updates() const { return dirty_updates; }
  int64_t get_cached_grains() const { return cell_owners.size(); }
  int64_t get_moving_grains() const { return moving.size(); }
  int64_t get_chunk_count() const { return chunks.size(); }
  int64_t get_chunk_uploads() const { return chunk_uploads; }
  void clear_grains(const Ref<MultiMesh> &mesh);
  Array sync_grains(const Ref<MultiMesh> &mesh, const Array &grains,
                    Dictionary dirty, Dictionary added, Dictionary removed,
                    const Dictionary &blocked, const Dictionary &settled,
                    bool rebuild, int64_t width, int64_t height,
                    const PackedByteArray &tile);
  Array pixel_mesh_arrays(const Array &rectangles, Vector2 center,
                          double pixel_scale, Vector2 extent) const;
};
} // namespace godot
