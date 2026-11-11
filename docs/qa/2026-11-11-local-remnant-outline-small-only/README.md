# Local outlines only on small structure remnants ·2026-11-11

User-approved follow-up: remove outlines from large buildings; retain increasing emphasis as pieces become smaller. Over144pixels: no contour generation or drawing.37–144pixels: existing medium outline. Up to36pixels: existing strongest outline. No blink, material tint, physical size, skill, reward, map or cleanup changes. Existing fixed-island classification and mesh caching are reused.

Plan: preserve v2 source/package; change only outline presentation and local version/trace labels; import/compile/export; verify static package/HTTP; serve at the same127.0.0.1:8805origin and save namespace. User performs gameplay/visual/FPS verification. No public release or iPhone update.

Rollback: restore before/live-public to the lab public path, the3files from before/project, and before/build.py, build-manifest.json and README.md. Keep lab/records and browser saves. Before/source-hashes.json inventories the baseline.

## Delivery

Local URL: http://127.0.0.1:8805/game.html?v=remnants-outline-3

Godot4.6.2 import, compile-only and Web export passed without script/parse/error markers. All10 HTTP files matched package hashes and expected isolation headers. Only the contour script and local version/trace labels changed; other1375 inputs match v2. Native modules, world renderer/cache wiring, tiny cleanup, physics, skill values, maps, rewards and save namespace are unchanged. No tests, scenes, gameplay, browser, runtime probes or device launches were run. User visual/feel/FPS checks are pending. Public Web/iPhone/CURRENT.json unchanged.

The prior served package is preserved in before/live-public. The source patch uses zero context(git apply --unidiff-zero). No records or browser save data are part of rollback.
