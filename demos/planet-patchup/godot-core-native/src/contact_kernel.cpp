#include "contact_kernel.h"
#include <algorithm>
#include <cmath>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/variant/array.hpp>
namespace godot {
void PPContactKernel::_bind_methods() {
  ClassDB::bind_method(D_METHOD("sample", "self", "state", "world",
                                "previous_contacts", "previous_velocity",
                                "previous_angular", "last_impact"),
                       &PPContactKernel::sample);
}
static String patch_key(int64_t other, int64_t local, int64_t shape) {
  return String::num_int64(other) + ":" + String::num_int64(local) + ":" +
         String::num_int64(shape);
}
Dictionary PPContactKernel::sample(RigidBody2D *self,
                                   PhysicsDirectBodyState2D *state, Node *world,
                                   Dictionary previous_contacts,
                                   Vector2 previous_velocity,
                                   double previous_angular,
                                   double last_impact) const {
  Dictionary patches, contacts;
  for (int64_t i = 0; i < state->get_contact_count(); ++i) {
    int64_t other_id = state->get_contact_collider_id(i);
    int64_t local_shape = state->get_contact_local_shape(i),
            other_shape = state->get_contact_collider_shape(i);
    String key = patch_key(other_id, local_shape, other_shape);
    contacts[key] = true;
    if (!patches.has(key)) {
      int64_t own_id = self->get_instance_id();
      String pair_key = own_id < other_id
                            ? String::num_int64(own_id) + ":" +
                                  patch_key(local_shape, other_id, other_shape)
                            : String::num_int64(other_id) + ":" +
                                  patch_key(other_shape, own_id, local_shape);
      Dictionary patch;
      patch["points"] = Array();
      patch["normal"] = state->get_contact_local_normal(i);
      patch["other"] = state->get_contact_collider_object(i);
      patch["other_v"] = state->get_contact_collider_velocity_at_position(i);
      patch["impulse"] = 0.0;
      patch["pair_key"] = pair_key;
      patches[key] = patch;
    }
    Dictionary patch = patches[key];
    Array points = patch["points"];
    points.append(state->get_contact_local_position(i));
    Vector2 normal = patch["normal"];
    patch["impulse"] =
        double(patch["impulse"]) +
        std::abs(double(state->get_contact_impulse(i).dot(normal))) / 240.0;
  }
  Array pending;
  Array keys = patches.keys();
  for (int64_t i = 0; i < keys.size(); ++i) {
    Dictionary patch = patches[keys[i]];
    Array source_points = patch["points"], points;
    Vector2 center;
    for (int64_t j = 0; j < source_points.size(); ++j) {
      Vector2 q = source_points[j];
      points.append(q / 4.0);
      center += q / (4.0 * source_points.size());
    }
    Vector2 arm = center * 4.0 - state->get_transform().get_origin();
    Vector2 velocity = state->get_linear_velocity() +
                       Vector2(-arm.y, arm.x) * state->get_angular_velocity();
    Vector2 other_velocity = patch["other_v"];
    Object *other = patch["other"];
    RigidBody2D *body = Object::cast_to<RigidBody2D>(other);
    if (body) {
      Vector2 other_arm = center * 4.0 - body->get_position();
      other_velocity =
          body->get_linear_velocity() +
          Vector2(-other_arm.y, other_arm.x) * body->get_angular_velocity();
    }
    Dictionary entry;
    entry["piece"] = self;
    entry["other"] = body ? Variant(body) : Variant();
    entry["collider"] = other;
    entry["normal"] = patch["normal"];
    entry["points"] = points;
    entry["point"] = center;
    entry["normal_impulse"] = patch["impulse"];
    entry["relative_velocity"] = (velocity - other_velocity) / 4.0;
    entry["friction"] = 0.7;
    entry["pair_key"] = patch["pair_key"];
    pending.append(entry);
  }
  Dictionary best, static_best;
  bool own_ready = double(world->get("elapsed")) - last_impact >= 0.15;
  Object *static_body = world->get("static_body");
  for (int64_t i = 0; i < keys.size(); ++i) {
    Variant key = keys[i];
    if (previous_contacts.has(key))
      continue;
    Dictionary patch = patches[key];
    Array source_points = patch["points"];
    Vector2 contact;
    for (int64_t j = 0; j < source_points.size(); ++j) {
      Vector2 q = source_points[j];
      contact += q / real_t(source_points.size());
    }
    Vector2 normal = patch["normal"],
            arm = contact - state->get_transform().get_origin();
    Vector2 own_v =
        previous_velocity + Vector2(-arm.y, arm.x) * previous_angular;
    Vector2 other_v = patch["other_v"];
    double inverse =
        1.0 / self->get_mass() +
        std::pow(double(arm.cross(normal)), 2) / self->get_inertia();
    Object *other = patch["other"];
    RigidBody2D *body = Object::cast_to<RigidBody2D>(other);
    if (body) {
      Vector2 other_arm = contact - body->get_position();
      inverse +=
          1.0 / body->get_mass() +
          std::pow(double(other_arm.cross(normal)), 2) / body->get_inertia();
      Variant previous = body->get("previous_velocity");
      if (previous.get_type() != Variant::NIL) {
        Vector2 previous_v = previous;
        other_v = previous_v + Vector2(-other_arm.y, other_arm.x) *
                                   double(body->get("previous_angular"));
      }
    }
    double speed = std::max(0.0, -double((own_v - other_v).dot(normal))) / 4.0;
    if (speed < 4 || inverse <= 0)
      continue;
    int recipients = other == static_body || body ? 2 : 1;
    double energy = 0.5 / (inverse * 0.002) *
                    std::pow(std::min(speed, 180.0) / 60.0, 2) / recipients;
    Array segments, static_segments;
    for (int64_t j = 0; j < keys.size(); ++j) {
      Variant candidate_key = keys[j];
      Dictionary candidate = patches[candidate_key];
      Vector2 candidate_normal = candidate["normal"];
      if (!previous_contacts.has(candidate_key) &&
          std::abs(double(candidate_normal.dot(normal))) >= 0.7) {
        Array ps = candidate["points"];
        Dictionary segment;
        Vector2 a = ps[0], b = ps[ps.size() - 1];
        segment["a"] = a / 4.0;
        segment["b"] = b / 4.0;
        segments.append(segment);
        Object *candidate_other = candidate["other"];
        if (candidate_other == static_body)
          static_segments.append(segment);
      }
    }
    Dictionary hit;
    hit["piece"] = self;
    hit["source_piece"] = self;
    hit["source_normal"] = normal;
    hit["source_velocity"] = own_v / 4.0;
    hit["other_velocity"] = other_v / 4.0;
    hit["other"] = body ? Variant(body) : Variant();
    hit["collider"] = other;
    hit["point"] = contact / 4.0;
    hit["speed"] = speed;
    hit["energy"] = energy;
    hit["normal"] = normal;
    hit["segments"] = segments.slice(0, 16);
    hit["downward"] = normal.y < -0.35 && double(own_v.y) / 4.0 > 14;
    if (own_ready && (best.is_empty() || energy > double(best["energy"])))
      best = hit;
    if (other == static_body &&
        (static_best.is_empty() || energy > double(static_best["energy"]))) {
      static_best = hit.duplicate();
      static_best["piece"] = Variant();
      static_best["normal"] = -normal;
      static_best["downward"] = false;
      static_best["segments"] = static_segments.slice(0, 16);
    }
  }
  Dictionary result;
  result["pending"] = pending;
  result["best"] = best;
  result["static_best"] = static_best;
  result["contacts"] = contacts;
  return result;
}
} // namespace godot
