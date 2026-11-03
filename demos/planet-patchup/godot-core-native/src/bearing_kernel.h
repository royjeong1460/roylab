#pragma once
#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/variant/dictionary.hpp>
namespace godot {
class PPBearingKernel : public RefCounted {
  GDCLASS(PPBearingKernel, RefCounted)
protected:
  static void _bind_methods();

public:
  void phase(Dictionary body, Dictionary constraint, int64_t iterations = 4,
             double time_scale = 1.0);
};
} // namespace godot
