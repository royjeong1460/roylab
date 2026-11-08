# Pressure skill scope fix ·2026-11-08

User approved keeping Pressure Bloom / Ground Pulse extra cracks inside their own range, retaining fall/chain collisions, preserving rollback and installing iPhone for user play. Investigation: BUG-015, equipped expand+wave at the pillar/body joint.

## Change

- The shared `_pressure` path passes its actual logical-cell center/radius into impact_physics and the native pressure_bonds kernel. Only the two endpoints of an in-circle bond may be included in its ID lookup. Both endpoints and therefore the segment remain in the convex circle, even when the artificial crack line would continue through a large body.
- Pressure Bloom uses its live2→11circle and Ground Pulse uses each8-cell pulse circle. The final Pressure Bloom burst passes the same scope into halo_bonds, including owned levels beyond the original cap.
- scope_radius defaults to−1 in both native bindings and adapters. All other impact/halo callers keep the previous unscoped path. No GDScript per-pixel filter is added.
- Existing strength/gain/timing/radius/impulses and within-area damage arithmetic remain unchanged. Full-body material still supplies the original attenuation reference; the new lookup limits writable bonds.

## Preserved

All44 reduced map files, catalog, skill levels/prices/thresholds, profile/collection/economy data and save directories are unchanged from0.5.53. `chain_physics.gd` and world_kernel.cpp (including midpoint fall tuning) are byte-identical; world.gd only forwards optional final-burst scope to blast_halo. Other C++ sources besides effect_kernel.cpp/.h are unchanged. Gravity/tilt/body limits are not altered.

Normal collapse and collision propagation may still cause damage beyond a pressure circle: only direct pressure bond writes are bounded by this fix. The pre-existing18-body overflow conversion remains unchanged and is a separate retained path; this delivery does not claim all outside-area pixelization is impossible.

## Delivery evidence

- iOS0.5.54(64) Release build/signature/PCK/core archive checked; update-installed successfully as receipt sequence4356. Same bundlecom.roy.planetpatchup.godotcompare; no uninstall/reset/launch.
- iOS/macOS/Web and retained Android native libraries rebuilt with pinned dependencies. No APK produced.
- Godot import, compile-only and export logs contain no errors. Original0.5.53 project and native source hashes were rechecked after the build.
- Local Web package `free-0541-6a230f74adea`, engine `godot-web-ec83eba66e3c`:13 files,8 encoded/decoded artifact hashes verified. Public web remains `free-0541-ae30a3e88329`; no public deployment/push.
- No test/scene/gameplay/replay/simulation/browser/device-app runtime was performed by the assistant. Recurrence, performance, save restoration and feel are user checks.

Native QA source:`/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-pressure-scope-2026-11-08/project`; native core:`/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-pressure-scope-2026-11-08/extension/src`. Local Web root:`/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-pressure-scope-2026-11-08/local-web/public`, entry`/planet-patchup/play/`. Detailed hashes and receipt summary are in delivery.json and adjacent evidence.

## Rollback and user check

Preserved0.5.53(63) app:`/Users/roy/Developer/sand/variants/godot-paid-port/native/build/ios-destruction-midpoint-2026-11-07-derived/Build/Products/Release-iphoneos/PPGodotCompare.app`. Update-install that app without deleting player data, then restore CURRENT.json from`/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-pressure-scope-2026-11-08/prior-current.json`. Old source, native libraries and local Web package remain retained.

User checks expand+wave with unchanged upgrades at the same pillar/body connections, including first hit, nearby follow-up, passive trigger and final burst. The expected change is no extra pressure crack continuing beyond the live circle. Physical tipping/fall and causal cross-building collisions remain part of normal play. If sudden wide pixelization persists, identify overflow/real collision events separately.
