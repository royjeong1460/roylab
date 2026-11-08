# Readonly static-coordinate fix ·0.5.56(66)

The user approved correcting the static-body lookup fault documented in BUG-015. This delivery changes two ID-to-coordinate assignments in the shared pressure/halo native kernel. Each ID and Vector2 is copied before the next readonly Dictionary lookup, preventing the reusable temporary from replacing a coordinate with an integer ID. Readonly caching stays enabled.

All radius/strength/timing, scope, bond-damage formulas, fall/chain/tilt, body limits, small-fragment criteria,44map inputs, economy, collection and save namespaces remain configured as before. Corrected fixed buildings may now receive previously missing bond damage; this is not a reduction of detached-body damage. Inverting the two replacements restores the baseline effect source byte-for-byte. Source verification confirms all other native sources and project inputs match0.5.55 except version labels and rebuilt native libraries.

## Delivery evidence

- iOS/macOS/Web native compilation/linking passed with pinned Godot4.6.2/godot-cpp; Web threading correction is recorded below. Native logs are under `variants/godot-paid-port/qa/ios-static-fracture-2026-11-08/evidence/`.
- Godot import, compile-only and native pack/Web export passed. The initial sandboxed import encountered macOS certificate/editor-settings access restrictions; rerunning with build permissions completed cleanly.
- Xcode Release build and strict signature/PCK/app identity checks passed. iPhone0.5.56(66), bundlecom.roy.planetpatchup.godotcompare, update-installed successfully as sequence4372. The app was not launched or reset.
- The same-origin all-skills local lab at http://127.0.0.1:8805/game.html is updated. Existing browser progress/configuration and local record receiver are retained; the user refreshes the tab. Ten static HTTP files match the staged package hashes.
- Shared free Web source/native module pair and candidate free-0541-2217fbb38ec0 are prepared locally. All eight transport/decoded artifact hashes were checked. Engine remains godot-web-ec83eba66e3c. No public deployment was performed.
- No tests, scenes, simulation, browser driving, gameplay or device-app launch were performed. User confirmation of feel, recurrence, saves and performance is pending. No new Android package is claimed.

## Source and rollback

Native project: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-static-fracture-2026-11-08/project`. Native source: sibling `extension/src`. Previous0.5.55 project/native source and signed app were checked unchanged. The current pointer now references this candidate.

Rollback iPhone app: `/Users/roy/Developer/sand/variants/godot-paid-port/native/build/ios-blast-trace-2026-11-08-derived/Build/Products/Release-iphoneos/PPGodotCompare.app`. Update-install in place without deleting data, then restore `qa/ios-static-fracture-2026-11-08/prior-current.json`. The local lab's old project/public package is retained under `qa/ios-static-fracture-2026-11-08/before/local-lab/`; keep the same origin, save namespace and records.

Compare the same target/upgrades while fixed and after separation. The diagnostic overlay/attackTrace is retained; the local default expand+wave loadout remains available. Real pre/post gameplay interpretation belongs to the user.

## Web startup correction and user confirmation

BUG-016 records that the first Web module used default threads=true against the retained non-threaded engine. HTTP/hash checks had passed but did not prove ABI compatibility. Explicit threads=no production=yes lto=full optimize=speed restores memory flags0/no atomics, matching the prior engine. User confirmed the local starting screen on2026-11-08. Physics source and installed iPhone0.5.56 remain unchanged. Corrected free candidate is free-0541-2217fbb38ec0. Follow-up user approval requests public Web adoption; release evidence will be recorded separately.
