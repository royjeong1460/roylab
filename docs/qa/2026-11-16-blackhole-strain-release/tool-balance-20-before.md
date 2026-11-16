# Tool balance at level20 — source audit

Baseline: native0.5.70(80), `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project` and `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-static-fracture-2026-11-08/extension/src`. Current selection verified against CURRENT.json and delivery.json. Read-only gameplay-source audit; only these report artifacts were written.

All eight tool tracks are20. Battery20 is included separately. No active/equipped skill contribution is included; no save was read.

## Stats and current purchase costs

| Track | Value at20 | Next upgrade20→21 (parts) | Fresh0→20 total (parts) |
| --- | ---: | ---: | ---: |
| blastForce | 2.0 | 1,900 | 15,930 |
| blastRadius | 5.0 | 3,670 | 28,130 |
| blastReach | 28.0 | 1,670 | 12,880 |
| wellPull | 2.0 | 11,310 | 48,480 |
| wellReach | 40.0 | 9,450 | 42,920 |
| wellDuration | 4.0 | 10,490 | 47,690 |
| mix | 6.0 | 6,910 | 33,700 |
| wear | 6.0 | 6,910 | 33,700 |
| battery | 160 | 5,760 | 28,090 |

Shockwave's three tracks total56,940parts. Black Hole's five tracks total206,490parts, plus2,000 unlock. Equal track levels are therefore not equal resource investment. Existing purchases retain their historical ledger, so these fresh totals are not a refund or a claim about this user's spending.

| Behavior | Shockwave20 | Black Hole20 |
| --- | --- | --- |
| Energy/use |12 |24 |
| Direct pixel cut | Radius5cells, one cut | None on activation |
| Loose-body/grain influence | One outward impulse, reach28cells | Repeated inward influence, radius40cells for4simulated seconds |
| Power parameter |2 |0.4; units/formulas differ from Shockwave |
| Static structural damage | One radial halo, reach13.4cells, strength1.77 | Activation0.56 and0.24 every0.2sec on selected supports |
| Static support footprint | Halo centered on tap | Scans static original groups within40cells, selects narrowest eligible row per group; damages run midpoint(s), radius parameter6 |
| Actual local pressure metric | Halo radial distance | `sqrt((along*.8)^2+(across*1.25)^2) <6`: along extent7.5, across4.8cells around each selected support point |
| Core behavior | Cut5 plus outward impulse | Core radius16cells; mix6; `power*mix=2.4` for inward braking/stirring |
| Grinding | No Black Hole contact-wear path | Maximum6× after about1sec continuous qualifying rubbing; two live dynamic bodies, positive pressure/friction, tangential slip>3, contact and selected surface pixel inside16cells |
| Chain seeding | Radius6cells | Radius40cells |
| Passive attack counters | Effective primary Shockwave advances counters | Activation does not call primary-blast counter handler |

Battery20 provides160energy. Code permits a final full-effect use whenever any positive residual remains, so nominal full battery counts are14Shockwaves or7Black Holes (last use consumes residual). Only one Black Hole well can exist at a time; Shockwave is accepted while a well exists. No real use counts or play efficiency were observed.

## Why Black Hole can feel stronger at20

The relevant asymmetry is broad repeated support targeting followed by pulling and contact grinding, not0.4 versus2 as raw coefficients. Each Black Hole pass re-evaluates the remaining static groups. Narrow rows may be picked across a40cell neighborhood, then newly detached pieces enter the pull/core/collision/wear systems. One pass can emit more than one impact if there are multiple groups or separated runs in the chosen row. This is not uniform circular40cell damage: its damage is local to those selected support points and can extend a little beyond the40cell selection circle through the anisotropic local kernel.

Shockwave instead guarantees a direct5cell cut where material exists, adds one13.4cell structural halo, and pushes nearby detached bodies out to28cells. Its halo strength follows `(0.65+4*.28)*1=1.77`; its impulse magnitude before mass/inertia and motion limits is216 in Godot impulse units. Black Hole's native pull has mass and distance dependence, adds continuously, brakes outward motion in the core, and stirs only inside the core. Summing either impulse stream into a common damage number would be misleading.

For static pressure the native bond increment is `strength*.58*(1-distance/6)*(.55+.45*alignment)/toughness`, toughness0.85–1.15, capped at accumulated bond damage1. Static hits have no long seam-propagation branch because piece=null. The halo increment is `1.77*(1-distance/13.4)/toughness`, also capped. These different locations/falloffs and state changes prevent interpreting input-strength totals as destroyed pixels or win rate.

Nominal cadence: activation hits once; `_advance_wells` repeats at0.2,0.4,…,4.0simulated seconds, then removes the expired well. `world.advance` subdivides steps to at most1/60sec; each repeat uses an `if`, not an unbounded catch-up loop, but the normal subdivision is smaller than0.2sec. Full uninterrupted lifetime therefore schedules20repeat passes plus activation. At60updates/sec that spans240substeps; at30updates/sec each update can be split, while stalls cap simulated progress to0.1sec per update. Thus4seconds means simulation time, not guaranteed wall time. Pause, early settlement, missing/changing supports, and floating timing/state determine actual impacts. No engine simulation was run.

For an unchanged selected support point, input strengths sum to `0.56+20*.24=5.36`; multiplication by the local kernel's0.58 gives3.1088 before geometric falloff/alignment/toughness/capping. This does not mean5.36actual damage, nor that all21passes hit the same bonds. Broken/released bonds stop accumulating and support targets move.

Grinding additionally deduplicates duplicate body contact reports and uses maximum per-pixel additions rather than blindly summing all contacts. Its ramp grows with qualifying additions and decays when no longer touching; merely resting in the core does not guarantee wear. At expiry wells are filtered before wear sampling, so the final substep can still pull/strain while no longer grinding.

## Recent0.5.70 change at equal20

No level20 numerical change. Source diff against ios-shockwave-range-2026-11-16 shows continuous reach/duration growth begins above20 and actual mixing growth above36. At20 the moved Pull-owned pressure tail is1, just as the old Reach/Duration/Mix pressure factors were1. Pull2, radius40, duration4, actual mix6, wear6, and gravityPower0.4 are unchanged. The earlier Shockwave range revision also preserves equal20 strength: its soft tail starts above20.

## Bounded proposal for user comparison

Change only Black Hole supported/static strain coefficients: activation1.4→1.0 and repeat0.6→0.3. Leave all other systems and growth untouched. This directly reduces automatic building release while preserving the tool's range, duration, continuous mixing growth, inward pull, core gathering, contact grinding, and24energy identity.

At20 the activation input becomes0.4 (−28.6%), repeats0.12 (−50%), nominal4sec sum becomes2.8 instead of5.36 (−47.76%). The local-kernel prefactor total becomes1.624 instead of3.1088 before geometry/toughness/capping. This is a scoped first comparison candidate, not a proven balance target. It also weakens static strain at lower and higher levels; later duration growth still increases the number of passes. Detached-body contact/collision chains may remain strong, which is a reason to preserve the other behaviors for the first user comparison instead of changing several systems together.

No implementation, tests, scenes, Godot runtime, engine simulation, browser/device launches, builds, commits, or push. All gameplay, feel, device, thermal and save-continuity validation remains user-owned.

## Source evidence

- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/campaign/economy.gd`: lines24–50, 170–214; SHA256 `d17bbb96416445c96d819e57328c1585cd1224a0595a856178a33ed0df09d5e1`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/campaign/catalog.gd`: lines75–99; SHA256 `e47c7ade1dd73e669ca4067996cdb090fb25b774ae5a4a1779ab241e999d66d9`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/data/balance.json`: lines1–1; SHA256 `7a99764e7084212ef82460ec22826c0bef3a6a0328835529e3f05b6a3d4a46dd`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/campaign/money.gd`: lines112–120; SHA256 `89c45b9fd76c7b8b07d5ff452af1b4c579ca9803ddcfc585acaa7fc09d9b7d33`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/world.gd`: lines617–704, 1041–1062; SHA256 `3aac290129e2ffbbd7313c0dd299e48bad1ede3d21d21bee0a51d4554fb68f4f`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/blackhole_physics.gd`: lines31–97, 123–186; SHA256 `3c3530b6564b9fb9aecaa8610c1231a93b4501c5e70a4dc21c4edc8afa14357b`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/impact_physics.gd`: lines18–41, 52–80; SHA256 `980e11f66d6d4979ab4b7dabf9b264bfb571e84b4149a6b706341d3de53c77fc`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/skill_physics.gd`: lines154–167; SHA256 `853b87d2a4d2b6328f559b1f9671fa0f94f44030e5b22d5f6522cc1e31f96142`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-blackhole-growth-2026-11-16/project/chain_physics.gd`: lines23–34; SHA256 `71bd5d6532e1a3efb47d43d93d84a7402966ff2a0bf0ba96855c222379e6e7b0`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-static-fracture-2026-11-08/extension/src/effect_kernel.cpp`: lines115–134, 167–177, 236–359, 380–476; SHA256 `36e1cc1349432d53fca59c659aaff3284fc2a373f0a445c39d05a01e1b228390`.
- `/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-static-fracture-2026-11-08/extension/src/world_kernel.cpp`: lines203–243; SHA256 `b62e358f0a31be4dfb92e9c1118e71059865ad8c66a63d2dcec02df28e913bbd`.
