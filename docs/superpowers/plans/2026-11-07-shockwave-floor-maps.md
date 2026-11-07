# Shockwave prices and floor-supported maps

User scope: extend the already adopted shockwave10% late-price rule to Blast Force, Blast Radius and Blast Reach, keeping Black Hole unchanged; ease5-5 and inspect similar grounded/terrain-attached structures. Preserve current saves and gameplay physics.

- [x] Trace current cost allocator and historic purchase-total validation. Keep the first5 original prices, apply10% thereafter through the original cap, then use the existing unbounded polynomial with the new lower anchor. Generalize the existing mixed-price validator to all3 tracks; do not recalculate spent parts or refund old transactions.
- [x] Repair5-5 loaded plinth so it rests on cuttable floor supports; repair matching6-6 plinth and5-6/6-6 sidewall contacts. Keep exact mapIDs, dimensions, terrain and pixel totals. Record deterministic static authoring inputs/outputs and constraints; no gameplay tests or simulations.
- [ ] Compile/import/export web and native candidates with the shared economy and map data. Verify package hashes, static site build, public HTTP and in-place iPhone install. Keep game/device replay with the user.
- [ ] Record delivery and a save-compatible rollback: do not revert the new purchase validator after cheaper purchases; restore previous map data while retaining the new economy quote and mixed-history validation policy. Do not install the old-price app after new purchases.
