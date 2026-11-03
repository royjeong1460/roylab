#pragma once
#include <godot_cpp/classes/node.hpp>
#include <godot_cpp/classes/physics_direct_body_state2d.hpp>
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/classes/rigid_body2d.hpp>
#include <godot_cpp/variant/dictionary.hpp>
#include <godot_cpp/variant/vector2.hpp>
namespace godot {
class PPContactKernel : public RefCounted {
  GDCLASS(PPContactKernel, RefCounted)
protected:
  static void _bind_methods();

public:
  Dictionary sample(RigidBody2D *self, PhysicsDirectBodyState2D *state,
                    Node *world, Dictionary previous_contacts,
                    Vector2 previous_velocity, double previous_angular,
                    double last_impact) const;
};
} // namespace godot
