# All-map reduced-pixel comparison ·2026-11-07

The user approved applying the accepted6-Boss reduction method to other maps, retaining pillars/structure and originals, and installing an iPhone comparison for continued play. The public web is not deployed by this task.

## Authored geometry

- All43 campaign/tutorial maps:608,590 →391,069 occupied pixels (35.74% fewer). The separate fallback is also reduced; all44 total610,590 →392,410.
- Each coordinate axis scales to0.8 once, using the original0.5.50 data. Per-map pixel reduction is32.06–37.30%, because pillar minimum widths are retained.
- The accepted0.5.51 final boss remains byte-identical:30,394 pixels /512×410 grid. It is not reduced a second time.
- Every original role module maps to exactly one connected output module. The original pillar/body/roof adjacency graph remains identical in all44 files. There are no buried, cliff-side-attached or ungrounded occupied cells in static geometry inspection.
- Pillar row spans retain at least two cells when the original span has two or more; original one-cell details retain at least one. This preserves irregular Arch feet and bridge supports as well as rectangular posts.
- In Mosaic3 and4, eight neighboring junction cells are reassigned to keep two-cell pillar slots through connected roof/body modules. The same module graph is required after this adjustment. The detailed per-cell list is in geometry-report.json.
- Terrain boundaries, preview hints and legacy fallback action coordinates are transformed consistently. Original map IDs, campaign membership and historical record_total_limit remain compatible with older clear records.

boss-geometry-comparison.png renders all six bosses in region order, original at left and reduced at right. It is a static map-data rendering, not a gameplay screenshot or a simulation.

## Scope and saves

Physics/C++ kernels, skills, force values, price formulas, collection/reward code, profile schema, UI, audio and save paths are unchanged. Per-pixel reward and boss bonuses remain unchanged, so fewer total pixels lower maximum raw payouts. Existing progress is not reset; the same bundle and save directory are used for update installation. Actual save loading, structural behavior, timing, FPS and collection remain user checks.

Native candidate:0.5.52(62), qa/ios-campaign-lite-2026-11-07/project. The previous0.5.51 boss-only comparison and0.5.50 full original campaign remain preserved. Delivery/install status and local web package stem are recorded in delivery.json and the local native CURRENT.json registry. No app launch, gameplay tests, scenes, replay, simulation or browser driving is performed by the agent.

## Reproduce and roll back

scripts/make-campaign-lite.py consumes --source data from the preserved before/data snapshot and writes a separate --destination. --golden-boss points at before/accepted-mosaic-boss.json, so repeated scaling or changing the accepted boss fails before any output map is written. The report is completed before writing; any lost/merged/split module, changed adjacency or invalid ground contact aborts the batch. Map serialization is occupied-runs-v1 and roundtrips every output dictionary statically.

For rollback, update-install the preserved0.5.51(61) app from native/build/ios-mosaic-lite-2026-11-07-derived/Build/Products/Release-iphoneos/PPGodotCompare.app without deleting the application; after installation restore the previous registry from qa/ios-campaign-lite-2026-11-07/prior-current.json. The older0.5.50(60) app remains the all-original alternative. No app data deletion is required.

The user continues normal progression and checks the same loadouts in early maps, irregular supports/bridges, late bosses and large simultaneous collapses. This source/package change alone is not proof of a given FPS target.

## Final delivery evidence

iOS0.5.52(62) was update-installed successfully as sequence4292 after build, PCK, bundle and code-signature verification. The local web package is `free-0541-b4b579deabb8`; all eight payload transport/decoded hashes match. Public web remains `free-0541-ae30a3e88329`. No app/browser/game execution was performed by the assistant.

## 2026-11-07 user direction approval

The user said to continue with the reduced-map configuration and moved on to planning destruction-stat upgrades. This adopts the0.5.52 map direction while retaining all original data and rollback candidates. It does not establish numeric FPS/load-time results or authorize public web deployment. The new upgrade proposal is in docs/destruction-traits-plan-2026-11-07.md and is not implemented.
