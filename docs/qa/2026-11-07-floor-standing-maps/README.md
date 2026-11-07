# Floor-standing map repair

Static authoring changes for the reported difficult 5-5 map and matching terrain contacts. No tests, scenes, game runtime, browser, device app or simulation were started. The SVG is a source-data illustration, not an in-game screenshot. Gameplay, entry stability, difficulty, saves and feel remain user validation.

| Map | Exact cells before / after | Change |
| --- | --- | --- |
| 5-5 Ridge Notch Sanctum | 23,120 / 23,120 | Lift the entire central notched hall, tongue, crowns and existing joints 24 cells. Replace its 168-cell-wide ground contact with two 2×24 floor posts. Two 6×8 body windows offset the 96 added support cells. |
| 5-6 Hanging Crown Escarpment | 27,608 / 27,608 | Move the complete middle upright and crown 2 cells left. This removes 24 cells touching the vertical cliff face. |
| 6-6 Ridge Notch Confluence | 37,192 / 37,192 | Lift the central notched hall and connected upper assembly 24 cells, add two 2×24 floor posts and two 6×8 body windows. Move the complete middle upright and crown 2 cells left, removing 28 cliff-side contact cells. |

The 5-5 hall now bears at x=220..221 and x=354..355 above terrain y=296. The 6-6 hall bears at x=330..331 and x=480..481 above terrain y=336. Each hall has 24 cells of empty space underneath except the posts. Their support spans contain the assembly centers (approximately x=287.5 and x=405.3). Existing tongue/joint relationships move together.

All 43 authored map JSONs were inspected for buried cells, vertical cliff contacts and four-neighbor connectivity to the downward terrain surface. After the repair, all three counts are zero across the campaign. The other 40 map files retain their input hashes. Map IDs, dimensions, terrain profiles, catalog initial totals, layout keys and actions are unchanged. Preserving initial totals avoids tightening historical stage-record limits. All roles, modules, module ownership, links and affected preview positions were reconstructed together. The machine-readable evidence and SHA-256 values are in `static-authoring-report.json`.

## Support arithmetic and its limits

This is source arithmetic, not a runtime stability result. `godot-free/world.gd:320–327` retains the authored layout-key calibration: it raises each original group's reserve by its pristine peak demand divided by 0.65. `godot-core-native/src/structure_kernel.cpp:549–560` considers intact pillar sections; they are not exempt. Lines 183–218 calculate slender-column demand, and lines 673–697 divide demand by the calibrated reserve. Lines 651–653 clamp the pivot within the bearing span.

For two intact 2-cell-wide, 24-cell-high floor posts, the native axial capacity is `180000 × 2 × 2³ / 24² = 5000` cells. The central assembly totals remain 19,008 and 26,856 cells; nominal raw floor demand is therefore approximately 3.80 and 5.37 before reserve normalization. Axial demand using `1800 × bearing width` is approximately 2.64 and 3.73. The existing 38-cell tongue posts in 6-6 can dominate the pristine reserve: their nominal column capacity is about 1,994 cells under an approximately 12,168-cell assembly. Keeping the nonempty layout key preserves that calibration path. Removing one floor post reduces the support span and capacity; actual collapse timing and stability still require user play.

## Replay and preservation

The deterministic pure-JSON authoring script is `scripts/repair-floor-standing-maps.py`. It checks the exact original input hashes, transforms the compiled occupancy/roles/colors, reconstructs topology using the same role-group and down/right-link semantics as `src/structure/model.js`, and asserts the geometry and cell ledger before writing. It does not import runtime modules.

Original inputs and the all-43-map before-hash manifest were retained outside publication at `/private/tmp/planet-floor-standing-20261107/`. Replay from those originals:

```sh
python3 scripts/repair-floor-standing-maps.py \
  --source /private/tmp/planet-floor-standing-20261107/original-maps \
  --destination demos/planet-patchup/godot-free/data/maps \
  --report docs/qa/2026-11-07-floor-standing-maps/static-authoring-report.json
```

The original authored generators reside in the separate primary checkout's `paid-app/src/terrace/maps.js` and `paid-app/src/mosaic/maps.js`; they were reviewed but not edited. A full content re-export from those generators must explicitly reapply this repair before adopting the output. The authoritative compiled silhouettes are transformed directly because the old Terrace generator's opening erasures overlap earlier bodies; regenerating a superficially equivalent new shape could alter the historical cell totals.

Restoring only map data preserves the separate economy policy. Do not roll the app back to legacy upgrade pricing after purchases under the new economy policy.
