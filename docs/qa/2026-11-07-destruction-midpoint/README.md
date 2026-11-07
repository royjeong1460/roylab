# Destruction midpoint comparison ·2026-11-07

The user chose the midpoint between the current0.5.52 destruction tuning and the proposed initial values. This is a fixed-default comparison, not a new purchase/unlock system.

| Setting | Previous | Proposed initial | Applied |
| --- | ---: | ---: | ---: |
| Non-fall collision speed response |10|6|8|
| Base cross-building chain power |10|6|8|
| Internal fall severity start/full (cells/s) |14/32|18/40|16/36|
| Fall bond resistance |0.02|0.04|0.03|
| Fall crack propagation |3|2|2.5|

Only five literals at the existing computation sites change: three in world.gd, one in chain_physics.gd and one in world_kernel.cpp. No extra damage multiplier or framework is added. Fall severity is clamp((speed−16)/20,0,1). Minimum fall contact speed14, its activation curve, normal collision start40, ordinary propagation3, chain gates/cooldowns/eight-stage rule, gravity, tilt assistance and body overflow are retained.

## Retained data and scope

All44 maps (43 campaign/tutorial plus fallback) are byte-identical to the adopted reduced-map0.5.52 candidate. Economy, purchases, reward formulas, skills, collection, profile and save paths are unchanged by source hash comparison. The same iOS bundle is update-installed without deleting the app. Existing saves are not rewritten by this change; actual restoration/progression is a user check. Earlier proposed trait caps remain10/10/14–32/0.02/3, and costs/10-level purchases are still draft.

## Delivery and verification

- iPhone0.5.53(63) Release build/signature verified and update-installed, receipt sequence4300. No launch performed.
- Native core rebuilt from the one-literal C++ change for iOS arm64, macOS arm64, Web wasm32 and retained Android arm64/arm32 libraries. No APK was requested or generated.
- Godot import, compile-only and export logs contain no errors. Updated iOS archive is present in the Xcode export; exported and installed-app PCK hashes match.
- Local Web package `free-0541-299c1579848c`, engine `godot-web-ec83eba66e3c`.13 files and all8 transport/decoded payload hashes verified. Source and core match this comparison.
- Public web remains `free-0541-ae30a3e88329`; no public publish/push was done.
- Assistant ran no game/test/scene/simulation/replay/browser/device app. Feel, FPS, load time and save behavior remain user verification.

Local package root: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-destruction-midpoint-2026-11-07/local-web/public`. Entry: `/planet-patchup/play/`. QA native source: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-destruction-midpoint-2026-11-07/project`; C++ source: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-destruction-midpoint-2026-11-07/extension/src`.

## Rollback

Update-install the preserved0.5.52(62) app at `/Users/roy/Developer/sand/variants/godot-paid-port/native/build/ios-campaign-lite-2026-11-07-derived/Build/Products/Release-iphoneos/PPGodotCompare.app` without uninstalling, then restore CURRENT.json from `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-destruction-midpoint-2026-11-07/prior-current.json`. The previous local Web package and all original map candidates are retained. This rollback does not require deleting player data.

Detailed source, core library, application/PCK, payload and install evidence is recorded beside this file and in `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-destruction-midpoint-2026-11-07`.
