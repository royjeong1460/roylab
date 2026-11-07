# All-map reduced-pixel iPhone comparison

The user approved extending the6-Boss reduced-pixel comparison to other maps, keeping pillars/structure and preserving originals, then update-installing iPhone for continued user testing.

## Design and constraints

- Use the preserved0.5.50 original data as the source, not already reduced maps. Apply0.8 coordinate scaling once to all43 campaign/tutorial maps and the standalone fallback. The accepted0.5.51 final boss must remain byte-identical.
- Sample cell/role/color data together. Preserve pillar horizontal row spans with at least two cells where the source has two or more; keep source one-cell details at least one cell. This also supports the irregular Arch feet and bridge supports. Scale terrain and preview targets consistently.
- Rebuild role modules/links using the existing static authoring helper. Require every original module to correspond to one connected output module, the same module adjacency graph, no buried/cliff-attached/ungrounded pixels, and valid bounds. Fix narrow geometry explicitly where sampling removes a connector; do not silently accept collapsed/split/merged structures to meet a percentage target.
- Preserve map IDs, campaign memberships and historical record_total_limit. Keep original0.5.50 maps and the installed0.5.51 boss-only comparison. Existing saves, app ID, economy, skills, physics code and per-pixel reward stay unchanged. Fewer collectible pixels mean lower raw maximum payouts, as already explained for6-Boss.
- This is an iPhone/local-web comparison, not a public web deployment. Do not change primary production map files. Native0.5.52(62) keeps com.roy.planetpatchup.godotcompare and PlanetPatchupGodotPaid; no reset or app launch.

## Work

- [x] Snapshot adopted/current registry, original44 files, catalog and source hashes outside the new package.
- [x] Build deterministic batch map-authoring tool; statically inspect all data/topology and record per-map and per-region reductions. Preserve the accepted6-Boss golden output.
- [x] Prepare0.5.52(62) native project and matching local web data/package. Confirm only intended geometry/catalog/build identifiers changed and all physics/skill/profile/economy source is unchanged.
- [x] Import/compile/export, build/sign and update-install connected iPhone without launch. Verify local web artifact transport/decoded hashes; retain public baseline entries.
- [x] Record comparison routing, install evidence and rollback. User performs loading/FPS/physics/collection/save testing; static source/package checks are not runtime evidence.
