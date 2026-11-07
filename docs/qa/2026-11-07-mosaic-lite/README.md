#6-Boss reduced-pixel comparison ·2026-11-07

The user approved one final-boss comparison before deciding whether to reduce other maps. This candidate is on branch codex/mosaic-boss-lite-20261107; it is not a public rollout.

## Static authored geometry

- Boss: mosaic-boss-mosaic-terrain-frame-v1 / Patchwork Crown.
- Occupied pixels:47,156 →30,394 (35.55% fewer).
- Grid:640×512 =327,680 →512×410 =209,920 (35.94% fewer slots).
-24 role modules remain:12 pillars, six bodies, six roofs;24 module links and two connected assemblies remain.
- Original two-cell pillars retain at least two cells. Terrain, preview and role/module topology are rebuilt consistently. File-data inspection finds no buried cells, cliff-side attachments or ungrounded cells.
- All42 other campaign/tutorial maps and fallback remain byte-identical to0.5.50; physics, skills, pricing, profiles and collection source is unchanged.
- Original map ID is retained and campaign record_total_limit preserves old clear records. App ID and save directory are retained, with no reset/migration.

The side-by-side geometry-comparison.png is a static data rendering, with baseline at left and candidate at right fitted to the same image area. It is not a gameplay screenshot or runtime stability check. In-game camera fitting uses the same camera code; remaining logical cells become larger.

## Known comparison differences

This is lower-resolution authored geometry, not an exact physical equivalence. Mass, cut granularity and tool coverage relative to a building can differ. Per-pixel rewards and first/repeat boss bonuses are unchanged, so maximum raw pixel income is30,394 instead of47,156. A reward multiplier is deliberately not added to an unadopted experiment; pacing/reward adoption needs the user's decision after the performance comparison. No FPS or loading improvement is claimed.

## Delivery

Native0.5.51(61) imported/compiled/exported, Release Xcode build completed, signature/bundle/PCK hashes checked, update-installed as sequence4284. No app launch was performed. Native source/current routing and install evidence are in variants/godot-paid-port/CURRENT.json and qa/ios-mosaic-lite-2026-11-07. Local web package free-0541-ff1c89611183 compiled/exported to qa/ios-mosaic-lite-2026-11-07/local-web/public. Public web remains free-0541-ae30a3e88329.

User checks6-Boss first entry and large simultaneous collapses with the same equipment as0.5.50. Battery five-tap diagnostics remain optional/default off. Compare both FPS/hitches and whether columns, falls and chain collisions still feel good. Testing every other map is unnecessary until this comparison is accepted.

## Rollback/reproduction

Install the preserved0.5.50(60) app from native/build/ios-sparse-maps-2026-11-07-derived/Build/Products/Release-iphoneos/PPGodotCompare.app without deleting the app. Restore CURRENT.json from this QA candidate's prior-current.json only after installing it. All original data/builds remain intact. Reproduce the static map using scripts/make-mosaic-boss-lite.py with --source-boss and --source-campaign from qa/ios-mosaic-lite-2026-11-07/before/data, and output to a separate directory. The script pins the original boss hash and asserts the intended reduction and topology before writing.
