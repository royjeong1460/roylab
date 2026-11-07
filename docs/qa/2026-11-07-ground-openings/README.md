# Campaign underside openings · 2026-11-07

The supplied sketch asks for substantial feet and empty space underneath a connected body. All43 maps were reviewed, including the tutorial.30 maps /69 floor spans were reshaped; the other13 retain identical input hashes. The six SVG sheets are drawings from authored JSON, not gameplay screenshots.

## Geometry and preservation

Openings leave two4–12-cell-wide feet with6–24cells of clearance. Floor feet carry pillar roles; existing body, roof and cultural colors remain. Where removing a lower sill would separate the assembly or detach its inner receiver, retain a six-cell sill.3-6 has only a six-cell lower sill: lift that complete courtyard12cells and add two12-cell feet instead.5-5 and6-6 replace the prior2-cell-post lift with integral underside bays from the earlier silhouette, while retaining the two-cell cliff clearance.

Current pixel totals follow actual occupied geometry.29 maps lose pixels;3-6 gains288 foot cells; all changes are in the table below. Historical stageRecords keep their own totals and recovered counts. The catalog record_total_limit retains the larger old/current bound, and profile_schema reads that authored bound without rewriting any player data. Prices, tool/skill stats, C++ physics, collection flow, region membership, IDs, dimensions, terrain and actions are unchanged.

| Map | Pixels before | Pixels after | Floor bays |
| --- | ---: | ---: | ---: |
| 3-1 | 6,844 | 6,684 | 1 |
| 3-2 | 9,832 | 8,836 | 2 |
| 3-3 | 11,960 | 11,090 | 3 |
| 3-4 | 13,584 | 13,200 | 1 |
| 3-5 | 15,140 | 14,152 | 3 |
| 3-6 | 16,508 | 16,796 | 1 |
| 3-Boss | 19,364 | 19,244 | 1 |
| 4-1 | 8,192 | 6,572 | 3 |
| 4-2 | 10,856 | 10,504 | 2 |
| 4-3 | 13,488 | 12,448 | 3 |
| 4-4 | 14,252 | 12,980 | 3 |
| 4-5 | 16,562 | 15,098 | 4 |
| 4-6 | 18,036 | 16,884 | 3 |
| 4-Boss | 19,928 | 18,016 | 5 |
| 2-3 | 6,068 | 5,620 | 2 |
| 2-5 | 8,060 | 7,574 | 2 |
| 2-6 | 8,932 | 8,440 | 2 |
| 6-1 | 17,928 | 15,864 | 1 |
| 6-2 | 24,196 | 22,980 | 2 |
| 6-3 | 28,296 | 26,436 | 3 |
| 6-4 | 31,468 | 30,884 | 1 |
| 6-5 | 35,392 | 33,454 | 3 |
| 6-6 | 37,192 | 32,344 | 3 |
| 6-Boss | 48,180 | 47,156 | 1 |
| 5-1 | 11,928 | 9,840 | 1 |
| 5-3 | 21,448 | 20,164 | 3 |
| 5-4 | 22,376 | 20,894 | 3 |
| 5-5 | 23,120 | 20,096 | 1 |
| 5-6 | 27,608 | 24,008 | 3 |
| 5-Boss | 33,092 | 31,460 | 3 |

## Static audit

All43 current occupied counts match map initial values. No occupied cell is buried, side-attached to a cliff or disconnected from a downward floor path. Each original assembly remains one connected assembly after authoring; modules, module ownership and down/right links are rebuilt. The static drawings for all43 maps were inspected; small floor cargo and structures already on open supports are retained. The22 remaining floor spans wider than12cells belong to low cargo/rubble of at most30cells high; locations are listed in retained-wide-floor-cargo.csv. This does not establish initial physical stability or difficulty in the running engine.

## Replay and rollback

Original43-map inputs plus campaign metadata are saved outside publication in /private/tmp/pp-ground-openings-20261107/before. The explicit authoring-plan.json records exact input hashes; scripts/reshape-grounded-buildings.py refuses another baseline. Its only historical references are the committed pre-lift5-5/6-6 map silhouettes at5b98142. It never imports or starts the game. Future full content exports must explicitly reapply the guarded map changes; legacy Phaser generators are untouched.

Retain the previous0.5.48(58) candidate and web payload as rollback. Keep its three-track10% economy. All new record totals remain within the old schema bounds (including3-6 under its existing20000 minimum), so this map update introduces no cheaper-price ledger transition.

## Verification boundary

Import/compile/export, package hashes, static HTTP, signing and install are recorded separately in delivery.json. No tests, scenes, simulations, browsers or apps are run by the assistant. Gameplay, save replay, entry stability, demolition, feel and device performance remain user verification.
