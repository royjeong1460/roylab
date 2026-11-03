#pragma once
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/array.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/vector2.hpp>
using namespace godot;
class PPEffectKernel : public RefCounted {
  GDCLASS(PPEffectKernel, RefCounted)
protected:
  static void _bind_methods();

public:
  int64_t pressure_bonds(Array material, Dictionary bonds, int64_t width,
                         int64_t count, Vector2 point, double strength,
                         Vector2 direction, double radius, bool propagates,
                         Vector2 position);
  int64_t halo_bonds(Array material, Dictionary bonds, int64_t width,
                     int64_t count, Vector2 point, double reach,
                     double strength);
  Array structure_material(Object *world);
  Array surface(Object *world, Object *piece);
  Dictionary nearest(Array material, Vector2 point, double radius,
                     bool inclusive);
  bool near_piece(Object *world, Object *piece, Vector2 point, double radius);
  Array near_pieces(Object *world, Vector2 point, double radius);
  void pull_grains(Array grains, Vector2 center, double radius, double power,
                   double dt);
  Dictionary pull_piece(Object *world, Object *piece, Vector2 center,
                        double radius, double power, double dt);
  Vector2 core_impulse(Vector2 position, Vector2 velocity, double mass,
                       Vector2 center, double radius, double power, double mix,
                       double cycle, double dt);
  Array strain_points(Array ids, Dictionary groups, int64_t width,
                      Vector2 center, double radius);
  Dictionary wear_additions(Object *world, Array samples, Array wells,
                            double dt);
  bool apply_wear(Dictionary wear, Dictionary pixels, double dt,
                  double multiplier);
  Dictionary split_wear(Array ids, Dictionary wear);
  void prune_wear(Dictionary wear, Array pieces);
  Array spaced(Array candidates, Array chosen, double gap);
  Dictionary grain_ids(Array grains, Vector2 point, double radius);
  Dictionary owned(Array ids);
  bool intersects(Array ids, Dictionary set);
  bool group_member(Array ids, Dictionary groups, int64_t group);
  Dictionary seed_groups(Array material, Dictionary groups, Vector2 point,
                         double radius);
  int64_t nearest_group(Array ids, Dictionary groups, int64_t width,
                        Vector2 point);
  Dictionary bounds(Array material);
  Dictionary columns(Object *world);
  double orbital_hit(Dictionary columns, double x, double radius,
                     double previous, double y, double ground);
  Dictionary seismic(Array material, double x, double span, Object *world);
  Dictionary sonic(Array material, double x, double span, double side,
                   double center, Dictionary groups, Dictionary hit);
  void kick_grains(Array grains, Vector2 point, double radius,
                   Vector2 direction, double strength, Variant ids);
  void gravity_grains(Array grains, double added);
  Dictionary gravity_contacts(Array samples, Array pieces, Dictionary supported,
                              Object *static_body);
};
