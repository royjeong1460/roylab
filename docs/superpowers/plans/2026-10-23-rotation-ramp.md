# Rotation ramp and 1/3/5-column comparison

User-approved adjustment: rotation response starts at1x and increases to5x across5 simulation seconds from the onset of rotation. Compare identical buildings on1,3,5-cell columns. Keep previous published experiments unchanged.

- New RampWorld extends BearingWorld, changing only rotation-response inertia. Start timing per rotating piece, inherit timing across fracture, clamp at5x. Use simulation time so pause does not advance the ramp. Preserve gravity, velocity cap, angular velocity, support/impact models.
- New maps: triple comparison, single1/3/5, centered and heavy-centered loads.160-cell spacing,400-cell authored width, existing side aprons. Export/import and thumbnails accept the existing1024 editor limit. No shared validator limit changes.
- New entry/build/storage namespace at planet-patchup-ramp. Default gravity1, maximum rotation5, speed1. Label rotation control as maximum response; fixed5-second ramp explained explicitly.
- Regression checks:1/3/5 identical roofs, monotonic strength, ramp1/3/5 at0/2.5/5seconds, cap/pause/child inheritance, no direct speed injection, real-runtime map conservation and no cross-specimen collapse. Browser desktop/mobile and public deployment checks.
