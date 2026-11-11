# Local size-aware structure outlines ·2026-11-11

Approved scope: local presentation-only follow-up to the v1 outline test. Keep tiny-remnant shattering, physical behavior, skill power, rewards, native modules, maps and user saves unchanged.

Design: size is the number of pixels in a connected visual structure, not the aggregate static map mesh. Small(<=36pixels): dark teal core3.0 world pixels + cream/gold rim5.6. Medium(<=144): core2.4 + rim4.6. Large: original core1.8 + rim3.6. No pulse or flashing. Detached bodies use their current ID count. Fixed geometry uses native geometric connected components ignoring damaged bonds, cached with the existing geometry snapshot. Contours remain batched into3styles, not one draw node per remnant. Calculate/cache only when geometry changes; no new per-frame scans.

Plan: preserve v1 package/source; update outline styles and callers; import/compile/export only; inspect source hashes and serve the same8805origin. User performs all gameplay, visual and performance verification. Public Web/iPhone and CURRENT.json are unchanged.

Rollback: restore before/public, the4source files in before/project, build.py, build-manifest.json and README.md. Keep lab/records and browser save data. Before/source-hashes.json inventories the v1 baseline.

## Delivery evidence

- Served at http://127.0.0.1:8805/game.html?v=remnants-outline-2, same origin/save namespace as v1.
- Godot4.6.2 import/compile-only/Web export passed; no script, parse or error markers. Logs in candidate/logs.
- Four inputs changed: outline script, world presentation/cache wiring, project version label and local trace label. Other1374 source inputs match v1, including physics/skill kernels, tiny cleanup, profile, maps, economy and native libraries.
- All10 HTTP artifacts match the export hashes with the expected COOP/COEP headers. No browser, scene, tests or runtime probes were run. User visual/feel/FPS checks remain pending.
- No public Web release or iPhone build/install. CURRENT.json unchanged. Existing local records and browser saves are not rewritten by this change.
- before/live-public retains the exact prior served package, in addition to before/public. The zero-context source.patch applies with git apply --unidiff-zero.
