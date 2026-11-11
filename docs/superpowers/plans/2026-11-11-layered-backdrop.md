# Terrain-aware layered backdrop implementation plan

> Execute inline in the existing isolated release worktree. The user approved the layer rules and requested local, Web and app integration. Do not repeat approval. Follow executing-plans for implementation; project instructions prohibit game/tests/browser/device launches.

**Goal:** Use independent sky, viewport weather, fixed cultural scenery and terrain-aligned waste on all six regions, Web/iPhone and the isolated cascade lab.

**Architecture:** Reuse CultureBackdrop for every playable region. A shared placement helper derives local support surfaces and deterministic scenery positions; waste caps and dense fill follow those surfaces. CloudLayer becomes a viewport-sized weather layer with entry-random cloudy/sunny modes. Cultural buildings never animate or follow the viewport. Weather choices never depend on restoration.

**Tech Stack:** Godot4.6.2 Compatibility, existing PNG assets and JSON catalog, existing Godot Web export and signed iOS Xcode project.

## Constraints

- Preserve every map pixel, collision/physics/skill/economy/progression input, save namespace, app identity, original art and rollback package.
- Restore from the best record at entry: below70% full waste, at70% about30% waste remains, at100% no waste. No live cleanup while playing.
- Main cultural building at the map horizontal center. Other existing objects randomized inside the existing composition footprint using the site identity as seed; never move after construction.
- Weather occupies the upper half of the actual camera viewport: random Y, horizontal cloud drift, or a stationary pixel sun with short rays. Weather is random per entry and independent of restoration.
- Terrain rises move the local background base upward. Floating side ledges remain unchanged and get their own waste caps in the local lab.
- No gameplay/tests/scenes/replays/browser or device launch. Compile/import/export, source/package inventories, static HTTP, signing and update-install only.

## Tasks

- [x] Snapshot latest adopted iOS0.5.58 into isolated0.5.60(70) candidate; keep pending0.5.59 diagnostic untouched. Keep existing clean linked Web release worktree and snapshot changed paths.
- [x] Implement shared placement/support helper, centered cultural layout, terrain-aligned waste and upper-half random weather. Add Arch assets as region0 catalog data; route every playable culture through CultureBackdrop.
- [x] Copy only the approved presentation files/catalog into current Web and native candidate. Adapt the existing g40 cascade lab to use the same presentation without refreshing its physics.
- [x] Compile/import/export all three projects; statically verify shared-file equality, asset references, all original map/native/skill/save inputs and packaged resources. Do not run project tests.
- [ ] Build signed iOS0.5.60(70), verify bundle/version/PCK/signature, attempt update-install without launch. Build Web/static site, publish through isolated release branch, verify transport and decoded hashes.
- [ ] Record local URLs, public deployment, package/build/install evidence separately; retain rollback. User validates visuals, gameplay, camera feel and device saves.

## Verification details

- Pinned engine: `/Users/roy/Developer/breakout/.tools/Godot.app/Contents/MacOS/Godot` with `--headless --editor --import --quit`, `--check-only --script`, and export/pack only.
- Web: `node demos/planet-patchup/scripts/build-godot-free.mjs`; inspect manifest allowlist and gzip transport/decoded SHA256; static site `npm run build -- --webpack`.
- Native: copy existing signed-project configuration into a new export directory, update only marketing/build versions, export pack, `xcodebuild ... generic/platform=iOS`, `codesign --verify --deep --strict`, CoreDevice install only.
- Lab: export the existing project directly after presentation-only changes; retain its existing g40 native kernel and map conversion. The historical prepare script must not pull latest physics into this experiment.

## Design review

The requested weather and restoration are independent. Background waste is decorative and cannot change collectible pixels. Background floor data never changes physical terrain. Per-site random scenery is stable across restoration tiers; only weather rerolls at entry. Screen weather clips before the viewport midpoint, while buildings remain world anchored.
