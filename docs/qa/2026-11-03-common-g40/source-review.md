# Independent g40 free source and packaging review

Date: 2026-11-03. Reviewer scope: source reads, baseline comparisons, file hashes, archive/PCK metadata and generated-package inspection only. No test, scene, simulation, replay, probe, browser, gameplay or device was run by this reviewer. Import/compile/export, Next build, public HTTP and deployment evidence are owned by the release coordinator.

What this change does: The free Godot project adopts the frozen common 0.5.40 physics/native/render source and retains the free edition's content, saves, presentation and browser adapters. It adds the matching single-thread Web native module and packages both engine WASM modules plus native WASM with explicit gzip-payload decoding.

Verdict: **Source and inspected package approved. No remaining Critical, Important or Minor source/integration finding.** This approval does not establish runtime compatibility, save persistence, visual correctness, performance or gameplay quality.

## Inputs

- Isolated release checkout: `variants/free-web-g40-20261103`, baseline `bda560151008e9288cbe1059b4f27d1cd6062938`.
- Canonical common source: `variants/godot-paid-port/qa/perf-g40-2026-11-03/project` and `extension/src`.
- Read root and free-local `AGENTS.md`, `qa/web-release-g40-2026-11-03/plan.md`, `evidence/free-integration-report.md`, its per-file SHA-256 tables, native compile/static-inspection evidence and `evidence/native-web-report.md`.
- Generated artifact snapshot inspected: `free-0540-12d5f3263529`, source hash `1b806d3dcc27598012a30f1c76e5f094c3f88d2ffabeee2f8236d2fb771d8b7c`. A later source/build change requires the coordinator to refresh package evidence.

## Findings and resolved review item

### Resolved — Vendored native rebuild entry point now preserves the Web output suffix

Location: `demos/planet-patchup/godot-core-native/SConstruct:11-12` and its `README.md:7`.

The initial reviewed script added an explicit suffix only for macOS. With `platform=web arch=wasm32`, SCons treats `.wasm32` as an existing extension and emits that name rather than the `.wasm` artifact needed by Godot. The native build report documents this exact condition and the successful Web-only suffix correction in its isolated build copy.

The coordinator replaced the vendored script with the working Web-suffix version during review; the reviewer reread the actual file and confirmed `.wasm` when `platform == web`. All 19 kernel sources remain unchanged. The retained `../project/native_core/bin/` destination belongs to the isolated `extension` / sibling `project` layout described by the native build report; it is not a direct in-tree free-project build destination. The coordinator is also documenting that layout in the vendored README. The shipped native module already has the correct hashed `.wasm` name and verified bytes. No current release blocker remains.

## Integration checks

- Fourteen changed common `.gd` files match frozen g40 after trailing-whitespace-at-EOF normalization: bearing, black hole, final collection, chain, both fracture helpers, grain, impact, performance probe, piece, grain surface, pixel surface, section and structure. `world.gd` matches exactly after the single preserved free fallback-map substitution. No physics/skill/collection retuning was found in the free merge.
- Read the two intentional overlap adapters separately. `skill_physics.gd` retains only Aftershock/Relay/Orbital, one passive slot and one active slot, and uses matching native signatures for its changed selection/geometry helpers. `app/screens.gd` retains free locking and browser feedback while adding the same hidden diagnostics interaction and g40 label.
- All 19 vendored C++/header files match both the frozen `extension/src` and the checked-in source hash inventory. The 11 instantiated/inherited PP classes are registered. The inspected native WASM and macOS library match their provenance digests; WASM is `933aa18db7e2de4a19c87ab439960650474a783da188de42cf901347db25f2d7`.
- Single-thread extension support is explicit in `export_presets.cfg`; `.gdextension` selects `web.release.nothreads.wasm32` and the content-addressed native filename. The selected official 4.6.2 dlink template hash in the generated manifest matches the native build report, `d19564ebc3602f80e78d6b9c3951affc90b5512d0471f8ac74f6c603c912aab5`.
- The g40 grain roster callbacks and renderer journal/reset fields remain paired. Final absorption calls `grain_roster_changed` for removals. Dormant chunks retain 32 logical cells / 128 image pixels, native chunk images and the moving MultiMesh path. Their runtime behavior is untested here.
- `diagnostics/performance_overlay=false` remains the initial setting. The new diagnostics helper uses that default and an optional separate `user://diagnostics.cfg`; the five-tap toggle updates the HUD and probe together. Existing profile/settings directories are unchanged.
- All 177 previously tracked data/assets files and all 13 existing platform files match baseline bytes. All existing campaign files other than the required final-collection roster callback match baseline bytes. Catalog, free edition guard, profile schema/store, legacy import, journal, economy, audio, browser bridge and presentation-specific code retain their free implementations.
- The browser shell diff changes only the analytics build version. Existing original-localStorage read-only snapshot/import lock, separate free Godot lock, feedback and analytics code remain. The Godot application user directory and injected persistent path both remain `PlanetPatchupGodotFreeWeb`. No runtime persistence or ingestion claim follows from this source check.
- Quiet v5 MP3 catalog/import files and audio adapter remain unchanged, including loop from zero; source WAV remains preserved and excluded from export. No browser/M4A playback path was added.

## Static packaging checks

- Parsed the generated PCK v3 directory: 295 entries, exactly tutorial plus `arch-1` through `arch-7`, no paid map path, test/QA path, native dylib or source C++ in the PCK. Free catalog/skill definitions remain baseline bytes; only the three approved skills are defined, and other five regions contain no playable sites. Existing public free-map provenance is retained; paid `data/source-manifest.json` is excluded.
- The generated initializer references the hashed native module in `gdextensionLibs`. The engine JavaScript's dynamic-library list includes the engine `.side.wasm` and this module. Its Web loading path uses fetch, which the generated startup wrapper intercepts before `startGame` runs.
- Main WASM, engine side WASM, native WASM and PCK all appear in the explicit gzip decode map and have matching `Content-Type: application/gzip` / immutable header entries. Decoded main/side/native/PCK hashes and every artifact's transport hash were independently recalculated and matched the generated manifest. All eight artifact bytes match the corresponding public target files.
- The release stem includes source identity and all exported `.wasm` / `.pck` bytes, including both side modules. Native WASM also has its own content-derived filename. No mutable engine/native URL was introduced.
- All final artifacts are below 25 MiB. Largest transport payload is the engine side WASM, 10,041,388 bytes; its decoded size is 41,124,149 bytes. This is a packaging-size observation, not memory/load-time/performance verification.
- Compared all 284 baseline paths under the free public target and Phaser archive. No path was deleted; old payload bytes are preserved. Only the mutable target index and shell manifest changed. Map-editor/Phaser assets remain available.
- `git diff --check` passed at review time. No source was edited by this reviewer; only this report was added.

Not checked: gameplay, touch, visual/audio playback, actual WebAssembly loading, browser-save durability, analytics delivery, FPS/thermals, public HTTP/deployment. Those scopes remain with the coordinator or user as specified above.
