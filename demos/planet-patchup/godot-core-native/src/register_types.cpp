#include "bearing_kernel.h"
#include "contact_kernel.h"
#include "effect_kernel.h"
#include "grain_kernel.h"
#include "graph_kernels.h"
#include "pixel_kernel.h"
#include "render_kernel.h"
#include "structure_kernel.h"
#include "world_kernel.h"
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/godot.hpp>
using namespace godot;
static void initialize_core(ModuleInitializationLevel level) {
  if (level != MODULE_INITIALIZATION_LEVEL_SCENE)
    return;
  GDREGISTER_CLASS(PPFractureGraph);
  GDREGISTER_CLASS(PPFractureConnectivity);
  GDREGISTER_CLASS(PPSectionGraph);
  GDREGISTER_CLASS(PPGrainPhysics);
  GDREGISTER_CLASS(PPStructureKernel);
  GDREGISTER_CLASS(PPPixelKernel);
  GDREGISTER_CLASS(PPRenderKernel);
  GDREGISTER_CLASS(PPBearingKernel);
  GDREGISTER_CLASS(PPContactKernel);
  GDREGISTER_CLASS(PPWorldKernel);
  GDREGISTER_CLASS(PPEffectKernel);
}
static void uninitialize_core(ModuleInitializationLevel) {}
extern "C" {
GDExtensionBool GDE_EXPORT
pp_core_init(GDExtensionInterfaceGetProcAddress get_proc,
             GDExtensionClassLibraryPtr library,
             GDExtensionInitialization *initialization) {
  GDExtensionBinding::InitObject binding(get_proc, library, initialization);
  binding.register_initializer(initialize_core);
  binding.register_terminator(uninitialize_core);
  binding.set_minimum_library_initialization_level(
      MODULE_INITIALIZATION_LEVEL_SCENE);
  return binding.init();
}
}
