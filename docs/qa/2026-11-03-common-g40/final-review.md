# Final independent g40 release gate

Date: 2026-11-03. Base: `bda560151008e9288cbe1059b4f27d1cd6062938`. Reviewed checkout: `variants/free-web-g40-20261103`.

What this change does: The free edition adopts the accepted frozen common g40 native kernels and matching Godot adapters, including dormant-grain chunk rendering. The release keeps the free content, economy, audio and storage adapters and adds the matching single-thread Web GDExtension package.

**Verdict: Approved for the coordinator's authorized publication and HTTP verification. No Critical, Important or Minor release-gate finding remains in the reviewed source and static package.** This is not browser/runtime or gameplay approval.

## Exact candidate

- Version: `0.5.40-free`, common baseline `g40`.
- Final stem: `free-0540-4cd73924be76`.
- Source SHA-256: `1b806d3dcc27598012a30f1c76e5f094c3f88d2ffabeee2f8236d2fb771d8b7c`, independently recalculated from the builder's complete source input list and matched to `release-manifest.json`.
- Native Web decoded SHA-256: `933aa18db7e2de4a19c87ab439960650474a783da188de42cf901347db25f2d7`.
- Final shell: `godot-shell-assets/shell-d00lwLHI.js`.
- The earlier `source-review.md` inspected the intermediate `free-0540-12d5f3263529` package. This final review supersedes that artifact snapshot only. `discarded-unpublished-draft.json` records removal of that never-published draft; the final checks below apply to the new stem.

## Independently checked

1. Read root/free `AGENTS.md`, the complete changed builder and free overlap diffs, prior source/native/integration reports, release/static manifests, both final build logs, native source/provenance/dependency records, version ledger, optimization history and rollback references. `git diff --check` passed.
2. All 14 common physics/render/probe wrappers match frozen `qa/perf-g40-2026-11-03/project` after trailing-whitespace normalization. `world.gd` matches exactly after the documented free fallback-map substitution. All 19 vendored native source files match both the frozen C++ source and their checked-in SHA-256 inventory. Free skills retain Aftershock/Relay/Orbital and one passive plus one active slot. The reviewed skill diff substitutes native geometry/selection helpers without adding paid skill definitions or changing free skill tuning.
3. All 177 baseline content/asset/locale files and all 13 existing platform files are byte-identical to `bda5601`. Existing campaign/economy/storage/audio adapters are retained; the final-collection change adds the matching grain-removal journal callback. Project user-directory identity and browser persistent path remain `PlanetPatchupGodotFreeWeb`. Shell source changes only its analytics version label. The optional five-tap diagnostics preference is separate from campaign progress and starts from the project's false default.
4. Parsed the final PCK v3 directory, not only strings: 295 entries and exactly tutorial `arch-0` plus `arch-1` through `arch-7`. No paid map, paid provenance, C++ source/header, macOS library, WAV, test or QA path is packaged. The embedded campaign, balance, skill-expansion and asset catalogs exactly match the unchanged free source bytes and their PCK MD5 entries. Thus the eight-map/three-skill free content boundary and empty locked-region site lists are preserved in this artifact.
5. Independently recalculated transport and decoded SHA-256 digests and sizes for all eight final artifacts. All match `release-manifest.json`, the export output, checked-in public target and generated Next `out/` target. Four gzip payloads are present: engine main WASM, engine side WASM, native WASM and PCK. Largest transport file is the engine side module at 10,041,388 bytes, below the 25 MiB artifact limit.
6. The generated initializer selects the content-addressed native module in `gdextensionLibs`. The engine JavaScript builds its dynamic-library list from `${loadPath}.side.wasm` plus the extension list. All four gzip assets are covered by the startup fetch/decompression map and explicit `application/gzip`, immutable, no-transform header entries. Final shell script/CSS paths exist and match the Next output. This establishes the static load path, not actual browser loading.
7. Native source `.gdextension` selects `web.release.nothreads.wasm32`; export enables extensions and disables threads. Actual raw native Web/macOS library and official dlink template digests match provenance. The existing native static-inspection evidence records `dylink.0`, `pp_core_init` and nonshared memory. Emscripten 4.0.20, Godot 4.6.2, pinned godot-cpp, single precision, disabled fast-math and FP contraction are documented. The vendored SConstruct retains the resolved `.wasm` suffix and its README explains the isolated rebuild layout.
8. All 282 baseline immutable/public/archive paths, excluding the two intentionally mutable target entry/manifest files, remain byte-identical. The final route and manifests reference the new candidate. Earlier public assets remain available for rollback. Source WAV and archived Phaser/map-editor assets are preserved; the unchanged MP3 import loops from zero and the export excludes the large WAV.
9. Existing `build-free.log` records successful import, check-only compile, export and shell build for this exact stem; `build-next.log` records successful site compile and static generation. No build was repeated by this reviewer. Existing analytics configuration preservation is recorded by `static-package-verification.json` and the coordinator; this reviewer did not read environment values or independently claim analytics delivery.

## Records and remaining boundaries

- `planet-patchup-versions.json` correctly records free `published: false` at this gate. Publication and HTTP evidence files referenced by the QA index are the coordinator's next stage, not evidence already established by this approval. Update the ledger and delivery/HTTP records only after those actions succeed.
- Version history distinguishes accepted g40, rejected v35, the previous free baseline, prior user/device observations and compile/export/static evidence. It does not claim equal cross-platform FPS or treat an unconfirmed freeze as reproduced or fixed. Historical paid install and video observations are carried forward as existing records; raw user media/device receipts were not accessed or revalidated here.
- Free rollback remains baseline commit `bda5601` with preserved 0.5.34 immutable assets; paid rollback remains g39/0.5.39(48) and its existing guarded procedure. Neither path authorizes deleting or resetting saves. The reviewed changes do not edit or reinstall the paid project.
- Runtime loading of all WASM modules, touch/HUD behavior, actual save migration and persistence, audio playback/looping, analytics ingestion, physics/collection feel, FPS and thermals remain user validation. Source identity and successful compilation do not prove those outcomes.

Not checked/run: games, tests, scenes, simulations, probes, replays, browsers, device apps, new builds, public HTTP or publishing. Review actions were source reads, baseline/hash comparisons, existing-log reads and read-only archive/PCK inspection. Only this report was written.
