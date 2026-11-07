# Shockwave price scope and floor maps · 2026-11-07

The user clarified that the adopted10% late-price rule was intended for all three Shockwave tracks: Blast Force, Blast Radius and Blast Reach. The same first5 original prices are retained. Thereafter, through each original cap, the raw growth is10% with10-scrap rounding; the existing unlimited polynomial then uses the new lower final original-cap quote as its anchor. Force quotes remain exactly the preceding release's policy. Black Hole, skill costs, stats and physical force are unchanged.

The original balance.json growth values remain the immutable historical price reference. Changing that reference would invalidate existing purchaseTotals. The shared economy allocator and mixed old/new purchase validator now accept all three discounted tracks. Existing spent/earned totals, balances, transaction receipts and levels are not recalculated or refunded. Price examples in price-examples.csv are source arithmetic, not Godot or save-runtime tests.

[Map authoring record](../2026-11-07-floor-standing-maps/README.md) documents the5-5/6-6 floor-post conversion and5-6/6-6 cliff clearance. Exact mapIDs, initial totals and terrain are retained;40 other maps are unchanged. This keeps historical stage-record bounds intact. World physics, skills and collection are unchanged.

Compile/import/export, package hashes, HTTP publication and native build/install are recorded separately in delivery.json. Game tests, scenes, browsers, simulations and device apps are not executed by the assistant; actual difficulty and existing-save replay remain user-owned.

## Save-compatible rollback

After new cheaper Radius/Reach purchases, do not reinstall the preceding app's old validator. To reverse map difficulty changes, restore the three previous map JSON files while keeping the new economy allocator/validator. A copy of the retained policy is stored at variants/godot-paid-port/qa/ios-shockwave-floor-maps-2026-11-07/rollback-economy-compatible.gd. This is source material, not a separately built or installed rollback app. Future pricing reversals require a separately designed ledger-compatible migration; they are not implemented here.
