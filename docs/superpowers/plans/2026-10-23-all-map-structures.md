# All-map structural conversion

Approved scope: current free/tutorial campaign, paid seven maps plus original yard, wide/tall/open experiments. Preserve historical comparison bundles and saves, IDs, artwork/pixel totals, upgrades and stage gates. Current structure lab becomes the all-map inspection page.

1. Compile structural modules from final occupancy, not color: slender vertical load paths (including slanted lattice), connected bodies, roof caps; connected module interfaces remain welded until actual bonds fail. Run on final runtime coordinates so apron/resampling/editor changes cannot stale IDs.
2. Share structural failure machinery in a mixin over existing gameplay worlds. Keep historical physics classes unchanged. Calculate each connected upper load and all its remaining bearings, avoiding binding disconnected houses into one compound. Calibrate pristine capacity to a stable reserve per map; retain width/mass/lever dependence after damage. Do not stress freefall or bypassed pillars after roof-ground contact.
3. Wire free journey (including tutorial), paid, ideas and structure entries. Structure map selector includes all authored maps and module outlines/counts. Do not add lab controls to campaign UI.
4. Tests first: all map coverage, initial stability, thinner support vs weight, one-post blast, disconnected upper loads, material accounting/caps, settings/save preservation. Run complete free suite and relevant physics suites. Browser verify free tutorial and multiple structure maps desktop/mobile.
5. Build/publish only free, paid, ideas, structure routes; retain existing historical comparison assets. Report real-device/balance limits honestly.


## Implementation and verification

- Current free/tutorial 8, paid culture 7 + original yard 1, layouts 3: 19 maps use shared structural failure. Culture kit writes explicit pillar/body/roof roles; older maps derive roles from geometry. Module interfaces remain welded until live bonds fail.
- `structure.version: 1` / packed `structure.roles` (1 pillar, 2 body, 3 roof) is optional map JSON metadata. Coverage is validated; apron coordinates move with it. Editor local documents retain it when unmodified. Pixel edits drop stale annotations; compiler then infers roles from current geometry. Undo to original pixels restores authored roles.
- Initial support reserve is fixed at map construction, then remaining thickness, overhead mass, and center-of-mass offset determine load. This is a gameplay approximation, not engineering stress analysis.
- IDs, pixel totals, progress storage, upgrade pricing and tutorial/stage gates unchanged. Culture maps 3/4/6 recommended first attack points now target supports that visibly release a load under the new rules.
- 63 free tests, 67 physics/ideas/paid regression tests, 11 current-map/editor/culture tests passed (141 total). Free boss probe starter fails; developed bomb/mixed/black-hole routes reach 70%. Black-hole fixture capacity changed from 15 to 18 for an eighth attack; this does not prove unchanged difficulty or a 30-minute play time.
- Desktop browser: 19-map selector, free-map blast and collapse, free tutorial attack/recovery, 390×844 layout checked. Physical iPhone performance and campaign pacing still require replay.
- Historical comparison classes and published bundles are preserved. Build/publish targets are only free, paid-test, ideas, and structure.
