#include "graph_kernels.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/callable.hpp>
#include <godot_cpp/variant/packed_byte_array.hpp>
#include <limits>
static Dictionary dict(Variant v) { return v; }
static Array arr(Variant v) { return v; }
static int64_t integer(Variant v) { return v; }
static double number(Variant v) { return v; }
static void profile_begin(Node *w, const char *name) {
  Object *perf = w->get("perf");
  perf->call("begin", String(name) == "CUT_GRAPH" ? 31 : 32);
}
static void profile_end(Node *w) {
  Object *perf = w->get("perf");
  perf->call("end");
}
void PPFractureGraph::_bind_methods() {
  ClassDB::bind_static_method("PPFractureGraph",
                              D_METHOD("native_bond_key", "a", "b", "count"),
                              &PPFractureGraph::bond_key);
  ClassDB::bind_static_method("PPFractureGraph", D_METHOD("noise", "x", "y"),
                              &PPFractureGraph::noise);
  ClassDB::bind_static_method("PPFractureGraph",
                              D_METHOD("neighbors", "id", "width", "count"),
                              &PPFractureGraph::neighbors);
  ClassDB::bind_method(D_METHOD("build", "material", "width", "bonds", "count"),
                       &PPFractureGraph::build, DEFVAL(18055));
  ClassDB::bind_method(D_METHOD("distances", "graph", "contact_ids"),
                       &PPFractureGraph::distances);
}
int64_t PPFractureGraph::bond_key(int64_t a, int64_t b, int64_t count) {
  return std::min(a, b) * count + std::max(a, b);
}
double PPFractureGraph::noise(int64_t x, int64_t y) {
  uint32_t v = uint32_t((uint64_t(x) + 137) * 374761393ULL) ^
               uint32_t((uint64_t(y) + 251) * 668265263ULL);
  v = uint32_t((v ^ (v >> 13)) * uint64_t(1274126177));
  return double(v ^ (v >> 16)) / 4294967295.0;
}
Array PPFractureGraph::neighbors(int64_t id, int64_t width, int64_t count) {
  Array r;
  if (id % width > 0)
    r.append(id - 1);
  if (id % width < width - 1)
    r.append(id + 1);
  if (id >= width)
    r.append(id - width);
  if (id + width < count)
    r.append(id + width);
  return r;
}
Dictionary PPFractureGraph::build(Array material, int64_t width,
                                  Dictionary bonds, int64_t count) {
  int64_t size =
      std::max<int64_t>(8, std::ceil(std::sqrt(material.size() / 160.0)));
  Dictionary labels, by_id;
  for (int i = 0; i < material.size(); i++) {
    Dictionary pixel = material[i];
    int64_t id = pixel["id"];
    by_id[id] = pixel;
    double x = id % width + 0.5, y = std::floor(double(id) / width) + 0.5;
    int64_t gx = std::floor(x / size), gy = std::floor(y / size);
    double best = INFINITY;
    Vector2i label;
    for (int64_t a = gx - 1; a < gx + 2; a++)
      for (int64_t b = gy - 1; b < gy + 2; b++) {
        double dx = x - (a + 0.2 + 0.6 * noise(a, b)) * size,
               dy = y - (b + 0.2 + 0.6 * noise(b, a + 79)) * size,
               d = dx * dx + dy * dy;
        if (d < best) {
          best = d;
          label = Vector2i(a, b);
        }
      }
    labels[id] = label;
  }
  Dictionary owner;
  Array nodes;
  for (int i = 0; i < material.size(); i++) {
    Dictionary pixel = material[i];
    Variant pid = pixel["id"];
    if (owner.has(pid))
      continue;
    Dictionary node;
    Array ids, edges;
    ids.append(pid);
    node["id"] = nodes.size();
    node["ids"] = ids;
    node["center"] = Vector2();
    node["edges"] = edges;
    nodes.append(node);
    owner[pid] = node["id"];
    for (int at = 0; at < ids.size(); at++) {
      Array ns = neighbors(integer(ids[at]), width, count);
      for (int j = 0; j < ns.size(); j++) {
        Variant id = ns[j];
        if (owner.has(id) || !by_id.has(id) || labels[id] != labels[pid] ||
            number(bonds.get(bond_key(integer(id), integer(ids[at]), count),
                             0.0)) >= 1)
          continue;
        owner[id] = node["id"];
        ids.append(id);
      }
    }
    Vector2 center;
    for (int j = 0; j < ids.size(); j++) {
      Vector2 q = dict(by_id[ids[j]])["q"];
      center += q / real_t(ids.size());
    }
    node["center"] = center;
  }
  Dictionary pairs;
  Array edges;
  for (int i = 0; i < material.size(); i++) {
    Dictionary pixel = material[i];
    int64_t pid = pixel["id"];
    Array ns = neighbors(pid, width, count);
    for (int j = 0; j < ns.size(); j++) {
      int64_t id = ns[j];
      if (id <= pid || !owner.has(id))
        continue;
      int64_t a = owner[pid], b = owner[id], key = bond_key(pid, id, count);
      double old = bonds.get(key, 0.0);
      if (a == b || old >= 1)
        continue;
      Vector2i pair(std::min(a, b), std::max(a, b));
      if (!pairs.has(pair)) {
        Dictionary edge;
        edge["a"] = a;
        edge["b"] = b;
        edge["bonds"] = Array();
        edge["cost"] = 0.0;
        pairs[pair] = edge;
        edges.append(edge);
        arr(dict(nodes[a])["edges"]).append(edge);
        arr(dict(nodes[b])["edges"]).append(edge);
      }
      Dictionary edge = pairs[pair], bond;
      bond["key"] = key;
      bond["old"] = old;
      bond["id"] = pid;
      bond["other"] = id;
      arr(edge["bonds"]).append(bond);
      edge["cost"] =
          number(edge["cost"]) + (1 - old) * (0.65 + 0.7 * noise(pid, id));
    }
  }
  Dictionary result;
  result["nodes"] = nodes;
  result["edges"] = edges;
  result["owner"] = owner;
  return result;
}
Array PPFractureGraph::distances(Dictionary graph, Array contact_ids) {
  Array nodes = graph["nodes"], distance;
  Dictionary owner = graph["owner"], done;
  distance.resize(nodes.size());
  distance.fill(INFINITY);
  for (int i = 0; i < contact_ids.size(); i++)
    if (owner.has(contact_ids[i]))
      distance[integer(owner[contact_ids[i]])] = 0.0;
  for (int k = 0; k < nodes.size(); k++) {
    int at = -1;
    double best = INFINITY;
    for (int i = 0; i < distance.size(); i++)
      if (!done.has(i) && number(distance[i]) < best) {
        best = distance[i];
        at = i;
      }
    if (at < 0)
      break;
    done[at] = true;
    Dictionary node = nodes[at];
    Array edges = node["edges"];
    for (int i = 0; i < edges.size(); i++) {
      Dictionary edge = edges[i];
      int64_t to =
          integer(edge["a"]) == at ? integer(edge["b"]) : integer(edge["a"]);
      Vector2 center = node["center"], target = dict(nodes[to])["center"];
      distance[to] =
          std::min(number(distance[to]), best + center.distance_to(target));
    }
  }
  return distance;
}
void PPFractureConnectivity::_bind_methods() {
  ClassDB::bind_method(
      D_METHOD("setup", "source", "remaining", "initial_groups", "candidates"),
      &PPFractureConnectivity::setup);
  ClassDB::bind_method(D_METHOD("setup_unprofiled", "source", "remaining",
                                "initial_groups", "candidates"),
                       &PPFractureConnectivity::setup_unprofiled);
  ClassDB::bind_method(D_METHOD("prepare"), &PPFractureConnectivity::prepare);
  ClassDB::bind_method(D_METHOD("allows_cut", "cut_bonds", "limit"),
                       &PPFractureConnectivity::allows_cut);
  ClassDB::bind_method(D_METHOD("allows_cut_unprofiled", "cut_bonds", "limit"),
                       &PPFractureConnectivity::allows_cut_unprofiled);
  ClassDB::bind_method(D_METHOD("get_dirty"),
                       &PPFractureConnectivity::get_dirty);
  ClassDB::bind_method(D_METHOD("set_dirty", "value"),
                       &PPFractureConnectivity::set_dirty);
  ADD_PROPERTY(PropertyInfo(Variant::BOOL, "dirty"), "set_dirty", "get_dirty");
}
void PPFractureConnectivity::setup(Node *s, Array r, Array g, Array c) {
  profile_begin(s, "CUT_GRAPH");
  setup_unprofiled(s, r, g, c);
  profile_end(s);
}
void PPFractureConnectivity::setup_unprofiled(Node *s, Array remaining, Array,
                                              Array candidates) {
  world = s;
  weights.clear();
  links.clear();
  adjacency.clear();
  visit_stamp = 0;
  dirty = false;
  Dictionary mutable_bonds, unassigned, owner, pairs,
      bonds = world->get("bonds");
  int64_t width = world->get("width");
  int64_t count = width * int64_t(world->get("height"));
  for (int i = 0; i < candidates.size(); i++) {
    Array bs = dict(candidates[i])["bonds"];
    for (int j = 0; j < bs.size(); j++)
      mutable_bonds[dict(bs[j])["key"]] = true;
  }
  for (int i = 0; i < remaining.size(); i++)
    unassigned[remaining[i]] = true;
  for (int i = 0; i < remaining.size(); i++) {
    Variant seed = remaining[i];
    if (!unassigned.has(seed))
      continue;
    int node = weights.size();
    Array queue;
    queue.append(seed);
    unassigned.erase(seed);
    owner[seed] = node;
    for (int head = 0; head < queue.size(); head++) {
      int64_t id = queue[head];
      Array ns = PPFractureGraph::neighbors(id, width, count);
      for (int j = 0; j < ns.size(); j++) {
        Variant next = ns[j];
        if (!unassigned.has(next))
          continue;
        int64_t key = PPFractureGraph::bond_key(id, integer(next), count);
        if (mutable_bonds.has(key) || number(bonds.get(key, 0.0)) >= 1.0)
          continue;
        unassigned.erase(next);
        owner[next] = node;
        queue.append(next);
      }
    }
    weights.append(queue.size());
    adjacency.append(Array());
  }
  for (int i = 0; i < candidates.size(); i++) {
    Array bs = dict(candidates[i])["bonds"];
    for (int j = 0; j < bs.size(); j++) {
      Dictionary bond = bs[j];
      if (!owner.has(bond["id"]) || !owner.has(bond["other"]) ||
          number(bonds.get(bond["key"], 0.0)) >= 1)
        continue;
      int64_t a = owner[bond["id"]], b = owner[bond["other"]];
      if (a == b)
        continue;
      Vector2i pair(std::min(a, b), std::max(a, b));
      if (!pairs.has(pair)) {
        int index = links.size();
        pairs[pair] = index;
        Dictionary link;
        link["a"] = pair.x;
        link["b"] = pair.y;
        link["keys"] = Array();
        links.append(link);
        arr(adjacency[pair.x]).append(index);
        arr(adjacency[pair.y]).append(index);
      }
      arr(dict(links[integer(pairs[pair])])["keys"]).append(bond["key"]);
    }
  }
  visited.resize(weights.size());
  visited.fill(0);
}
void PPFractureConnectivity::prepare() { dirty = false; }
bool PPFractureConnectivity::allows_cut(Array b, int64_t limit) {
  profile_begin(world, "CUT_CHECK");
  bool r = allows_cut_unprofiled(b, limit);
  profile_end(world);
  return r;
}
bool PPFractureConnectivity::allows_cut_unprofiled(Array, int64_t limit) {
  visit_stamp++;
  PackedByteArray open;
  open.resize(links.size());
  Dictionary bonds = world->get("bonds");
  for (int i = 0; i < links.size(); i++) {
    Array keys = dict(links[i])["keys"];
    for (int j = 0; j < keys.size(); j++)
      if (number(bonds.get(keys[j], 0.0)) < 1) {
        open[i] = 1;
        break;
      }
  }
  int count = 0;
  for (int seed = 0; seed < weights.size(); seed++) {
    if (visited[seed] == visit_stamp)
      continue;
    Array queue;
    queue.append(seed);
    visited[seed] = visit_stamp;
    int size = 0;
    for (int head = 0; head < queue.size(); head++) {
      int64_t node = queue[head];
      size += weights[node];
      Array adj = adjacency[node];
      for (int j = 0; j < adj.size(); j++) {
        int64_t index = adj[j];
        if (!open[index])
          continue;
        Dictionary link = links[index];
        int64_t next = integer(link["a"]) == node ? integer(link["b"])
                                                  : integer(link["a"]);
        if (visited[next] != visit_stamp) {
          visited[next] = visit_stamp;
          queue.append(next);
        }
      }
    }
    if (size >= 4 && ++count > limit)
      return false;
  }
  return true;
}
void PPSectionGraph::_bind_methods() {
  ClassDB::bind_method(D_METHOD("setup", "world", "source_ids", "supports"),
                       &PPSectionGraph::setup);
  ClassDB::bind_method(D_METHOD("update_supports", "supports"),
                       &PPSectionGraph::update_supports);
  ClassDB::bind_method(D_METHOD("supported", "id", "cut_row"),
                       &PPSectionGraph::supported);
  ClassDB::bind_method(D_METHOD("_reset_upper"), &PPSectionGraph::_reset_upper);
  ClassDB::bind_method(D_METHOD("_root", "index"), &PPSectionGraph::_root);
  ClassDB::bind_method(D_METHOD("_join", "a", "b"), &PPSectionGraph::_join);
  ClassDB::bind_method(D_METHOD("belongs", "id", "tag"),
                       &PPSectionGraph::belongs);
  ClassDB::bind_method(D_METHOD("summaries", "cut_row"),
                       &PPSectionGraph::summaries);
  ClassDB::bind_method(D_METHOD("_walk", "seed", "cut_row"),
                       &PPSectionGraph::_walk);
  ClassDB::bind_method(D_METHOD("members", "tag", "cut_row"),
                       &PPSectionGraph::members);
  ClassDB::bind_method(D_METHOD("upper", "cut_row"), &PPSectionGraph::upper);
  ClassDB::bind_method(D_METHOD("_tag_less", "a", "b"),
                       &PPSectionGraph::_tag_less);
  ClassDB::bind_method(D_METHOD("_count_greater", "a", "b"),
                       &PPSectionGraph::_count_greater);
}
void PPSectionGraph::setup(Node *world, Array source_ids, Variant supports) {
  ids.clear();
  index_of.clear();
  rows.clear();
  points.clear();
  links.clear();
  stamp = 0;
  member_cache.clear();
  exact_half_points = true;
  int64_t maximum_row = 0, width = world->get("width"),
          height = world->get("height");
  PackedVector2Array original_points = world->get("_original_points");
  for (int i = 0; i < source_ids.size(); i++) {
    int64_t id = source_ids[i];
    if (index_of.has(id))
      continue;
    index_of[id] = ids.size();
    ids.append(id);
    int64_t row = std::floor(double(id) / width);
    rows.append(row);
    Vector2 point = original_points[id];
    points.append(point);
    exact_half_points = exact_half_points && point.x >= 0 && point.y >= 0 &&
                        point.x * 2.0 == std::floor(point.x * 2.0) &&
                        point.y * 2.0 == std::floor(point.y * 2.0);
    maximum_row = std::max(maximum_row, row);
  }
  int64_t cell_count = width * height;
  Dictionary bonds = world->get("bonds");
  for (int i = 0; i < ids.size(); i++) {
    int64_t id = ids[i];
    PackedInt32Array ns;
    Array neighbors = PPFractureGraph::neighbors(id, width, width * height);
    for (int j = 0; j < neighbors.size(); j++) {
      int64_t other = neighbors[j];
      if (index_of.has(other) &&
          number(bonds.get(
              std::min(id, other) * cell_count + std::max(id, other), 0.0)) < 1)
        ns.append(integer(index_of[other]));
    }
    links.append(ns);
  }
  visited.resize(ids.size());
  visited.fill(0);
  row_nodes.resize(maximum_row + 1);
  for (int row = 0; row < row_nodes.size(); row++)
    row_nodes[row] = PackedInt32Array();
  for (int i = 0; i < ids.size(); i++) {
    PackedInt32Array ns = row_nodes[rows[i]];
    ns.append(i);
    row_nodes[rows[i]] = ns;
  }
  _reset_upper();
  update_supports(supports);
}
void PPSectionGraph::update_supports(Variant supports) {
  support_height.resize(ids.size());
  support_height.fill(-1);
  if (supports.get_type() == Variant::NIL)
    return;
  int maximum_row = row_nodes.size() - 1;
  Array buckets;
  buckets.resize(maximum_row + 1);
  for (int i = 0; i < buckets.size(); i++)
    buckets[i] = Array();
  // Variant iteration preserves Array, packed-array and Dictionary key order.
  Variant iterator;
  bool valid = false;
  bool more = supports.iter_init(iterator, valid);
  while (more && valid) {
    Variant id = supports.iter_get(iterator, valid);
    int64_t index = index_of.get(id, -1);
    if (index >= 0 && support_height[index] < rows[index]) {
      support_height[index] = rows[index];
      arr(buckets[rows[index]]).append(index);
    }
    more = supports.iter_next(iterator, valid);
  }
  for (int row = maximum_row; row >= 0; row--) {
    Array bucket = buckets[row];
    while (!bucket.is_empty()) {
      int64_t index = bucket.pop_back();
      if (support_height[index] != row)
        continue;
      PackedInt32Array ns = links[index];
      for (int j = 0; j < ns.size(); j++) {
        int next = ns[j], reach = std::min(row, rows[next]);
        if (reach > support_height[next]) {
          support_height[next] = reach;
          arr(buckets[reach]).append(next);
        }
      }
    }
  }
}
bool PPSectionGraph::supported(int64_t id, int64_t cut_row) {
  int64_t index = index_of.get(id, -1);
  return index >= 0 && support_height[index] > cut_row;
}
void PPSectionGraph::_reset_upper() {
  parents.resize(ids.size());
  parents.fill(-1);
  counts.resize(ids.size());
  firsts.resize(ids.size());
  sums_x.resize(ids.size());
  sums_y.resize(ids.size());
  roots.clear();
  upper_row = -1;
}
int64_t PPSectionGraph::_root(int64_t index) {
  while (parents[index] != index) {
    parents[index] = parents[parents[index]];
    index = parents[index];
  }
  return index;
}
void PPSectionGraph::_join(int64_t a, int64_t b) {
  a = _root(a);
  b = _root(b);
  if (a == b)
    return;
  if (counts[a] < counts[b])
    std::swap(a, b);
  parents[b] = a;
  counts[a] += counts[b];
  firsts[a] = std::min(firsts[a], firsts[b]);
  sums_x[a] += sums_x[b];
  sums_y[a] += sums_y[b];
  roots.erase(b);
}
bool PPSectionGraph::belongs(int64_t id, int64_t tag) {
  int64_t index = index_of.get(id, -1);
  return index >= 0 && parents[index] >= 0 && firsts[_root(index)] == tag;
}
bool PPSectionGraph::_tag_less(Dictionary a, Dictionary b) {
  return integer(a["tag"]) < integer(b["tag"]);
}
bool PPSectionGraph::_count_greater(Dictionary a, Dictionary b) {
  return integer(a["count"]) > integer(b["count"]);
}
Array PPSectionGraph::summaries(int64_t cut_row) {
  if (cut_row < upper_row)
    _reset_upper();
  for (int64_t row = std::max<int64_t>(0, upper_row + 1);
       row < std::min<int64_t>(cut_row + 1, row_nodes.size()); row++) {
    PackedInt32Array ns = row_nodes[row];
    for (int i = 0; i < ns.size(); i++) {
      int index = ns[i];
      parents[index] = index;
      counts[index] = 1;
      firsts[index] = index;
      sums_x[index] = points[index].x;
      sums_y[index] = points[index].y;
      roots[index] = true;
      PackedInt32Array others = links[index];
      for (int j = 0; j < others.size(); j++)
        if (parents[others[j]] >= 0)
          _join(index, others[j]);
    }
  }
  upper_row = cut_row;
  Array groups, keys = roots.keys();
  for (int i = 0; i < keys.size(); i++) {
    int64_t root = keys[i];
    Vector2 center_sum(sums_x[root], sums_y[root]);
    if (!exact_half_points || sums_x[root] > 8388608.0 ||
        sums_y[root] > 8388608.0)
      center_sum = _walk(firsts[root], cut_row)["center_sum"];
    Dictionary group;
    group["count"] = counts[root];
    group["center_sum"] = center_sum;
    group["tag"] = firsts[root];
    groups.append(group);
  }
  groups.sort_custom(Callable(this, "_tag_less"));
  groups.sort_custom(Callable(this, "_count_greater"));
  return groups;
}
Dictionary PPSectionGraph::_walk(int64_t seed, int64_t cut_row) {
  Vector2i key(seed, cut_row);
  if (member_cache.has(key))
    return member_cache[key];
  stamp++;
  PackedInt32Array queue;
  queue.append(seed);
  Array group;
  group.append(ids[seed]);
  Vector2 center_sum;
  visited[seed] = stamp;
  for (int head = 0; head < queue.size(); head++) {
    int index = queue[head];
    center_sum += points[index];
    PackedInt32Array ns = links[index];
    for (int j = 0; j < ns.size(); j++) {
      int next = ns[j];
      if (rows[next] <= cut_row && visited[next] != stamp) {
        visited[next] = stamp;
        queue.append(next);
        group.append(ids[next]);
      }
    }
  }
  Dictionary result;
  result["ids"] = group;
  result["center_sum"] = center_sum;
  result["tag"] = seed;
  member_cache[key] = result;
  return result;
}
Array PPSectionGraph::members(int64_t tag, int64_t cut_row) {
  return _walk(tag, cut_row)["ids"];
}
Array PPSectionGraph::upper(int64_t cut_row) {
  Array groups, components = summaries(cut_row);
  for (int i = 0; i < components.size(); i++)
    groups.append(_walk(integer(dict(components[i])["tag"]), cut_row));
  return groups;
}
