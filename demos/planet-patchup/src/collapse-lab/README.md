# Local collapse mini-maps

Three local playable map tests with an original/chain comparison. The selective chain helper is now shared with the public Arch campaign at default 10. Original mode preserves the pre-chain physics. Lab controls and saves remain local and never change campaign progress or tuning.

## Run

From `demos/planet-patchup`:

```sh
./node_modules/.bin/vite --config vite.collapse-lab.config.js
```

Open `http://127.0.0.1:8793/collapse-lab.html`. It binds to loopback only. The live process was left running after verification.

- Select staggered stack, suspended bridge, or tower domino.
- The UI defaults to `연쇄 붕괴`. Select `기존 물리` for the unchanged comparison. Changing modes resets the run.
- A successful attack arms its touched structures. Actual impacts propagate a chain, with local `N CHAIN` labels, short pixel sparks, and a best-chain summary. Stationary contacts and empty-space attacks do not qualify.
- `연쇄 파괴력`: slider or number input from 0 to 30 in 0.5 steps; default 10. Presets: 3/10/12/30. Zero disables the entire assist and matches original physics. Applies to future collisions without resetting the scene. The private lab setting survives reset, map changes and reload; original mode disables it.
- JSON exports retain the current starting multiplier and time-stamped changes, so mixed-strength runs can be identified.
- Base Blast: radius 3, power 1, force reach 18. All three maps share this.
- Player preset: Blast Force 10 / Radius 7 / Reach 12, Battery 11, Suction 5 / Range 7, Auto Collect 6. Resulting Blast: radius 3.7, power 1.5, reach 24; battery 115.
- `표시 지점 1발` fires one real Blast at the authored weak point; it does not reset or force a collapse. For comparable runs, reset before firing it once.
- Mouse click / touch tap attacks. Two-finger gesture pans and zooms; Shift drag and wheel work on desktop.
- Unlimited battery is on by default. Black Hole is available. Cursor suction is off by default; the player preset retains the campaign's Auto Collect.
- Pixelized = loose collectible pixels + recovered pixels. Moving rigid chunks are excluded. Recovered is displayed separately.
- Reset or map/preset changes discard the current run. The JSON button downloads its metrics, attacks, and recent structural events; there is no campaign save access.

## Authored geometry

`maps.js` uses the existing YardKit roles and map cell packer. All maps have a 112 × 120 grid with floor at 112. Stack upper storeys, bridge deck, and selected low buildings have one-cell physical gaps. `model.js` calls the unchanged world's detach method and advances three seconds so these independent bodies seat under gravity. No bodies are teleported, animated into collapse, or given special forces.

The stable starting structures contain 1,506 / 1,638 / 1,428 pixels. Original mode uses `JointedArchWorld` (`arch-yielding-joints-v1`). Chain mode uses the shared `ChainArchWorld`, re-exported as `ChainCollapseWorld` (`arch-chain-v1`). Model callers still default to original mode.

## Experimental cascade rule

- Primary attacks arm original structure groups; Black Hole can also arm groups within its range. Tags pass through real collisions to other structures.
- A qualifying contact needs closing speed ≥ 12 cells/s and effective contact energy ≥ 1.2. The tagged moving source must contain at least 64 pixels and approach the target at ≥ 4 cells/s along the contact normal. The target must be a different original structure; floors, walls and self/foundation impacts retain ordinary physics.
- Only a newly reached structure inherits depth. A→B and A→C are separate stage-one branches; B must subsequently hit C to produce stage two. Recontacts cannot inflate depth.
- Fracture work is multiplied by `selected power × (1 + 0.25 × (chain stage − 1))`, capped at stage 8. Only that impact uses the lower speed threshold. Existing irregular fracture, small-fragment release and body-cap fallback remain in charge of splitting.
- This is an explicit arcade assist, not conserved physical energy. The shared fracture model spends a small part of the amplified work on separation motion. Gravity, initial Blast impulse and battery costs are unchanged.
- Each original group pair/recipient can receive the assist only once per attack chain. A chain starts with a 12-second window, extends to seven seconds after qualifying contact, and never exceeds 24 seconds total. Air clicks, quiet resting contact and expired chains do not perpetually grind rubble.
- Labels are limited to ten and fade within 1.1 seconds; pause freezes both simulation and labels. JSON exports include mode, physics version, chain summary and collision events.

## Reproduce checks and measurements

```sh
node --test tests/collapse-chain.mjs tests/collapse-lab.mjs tests/arch-campaign-joints.mjs tests/arch-world.mjs tests/arch-fracture-motion.mjs
./node_modules/.bin/vite build --config vite.collapse-lab.config.js
node scripts/collapse-lab-report.mjs
node scripts/collapse-lab-report.mjs --chain --power=6
```

50 tests pass. New coverage includes zero-power motion parity, live adjustment without a scene reset, identical first-contact input energy at different multipliers, exclusion of floor/self contacts and causal branch depth. Cascade tests also cover real propagation, repeated-contact suppression, expiry, idle/missed-attack safety, repeated attacks and Black Hole conservation. The focused tests cover 20-second idle stability and pixel conservation, shared base/player values, energy exhaustion/unlimited mode, rotation and secondary damage, and actual independent-structure collision pairs. Base domino records the chain 1:2, 2:3, 3:4. The build succeeds with Vite's existing large-Phaser-bundle warning. Its output is `dist-collapse-lab/`, for local inspection only.

The report uses fixed 1/60-second steps, one targeted Blast immediately after the three-second seating period, and no cursor suction. Results at 10s → 20s after the shot:

| Map | Base pixelized | Player pixelized |
| --- | ---: | ---: |
| Staggered stack | 1.86% → 1.86% | 1.06% → 1.13% |
| Suspended bridge | 2.69% → 2.69% | 5.56% → 5.62% |
| Tower domino | 2.38% → 2.38% | 1.12% → 1.12% |

All six measured runs preserve their exact material count and finite physics state. Stronger Blast changes trajectories: the player domino run stops after the tower/first-house contact rather than reproducing the base chain. Layout visibly changes collapse, but this experiment does not establish that the campaign's slow conversion of large chunks to collectible pixels is solved or balanced. Actual phone touch/performance QA remains separate from desktop checks.

Generated report: `/Users/roy/Developer/sand/artifacts/collapse-lab/report.json`.


## Historical v1 measurements (before selective contacts)

Same one-shot protocol, 20 seconds after the attack:

| Map | Original base pixelized | Chain base pixelized | Chain player pixelized | Base best chain |
| --- | ---: | ---: | ---: | ---: |
| Staggered stack | 1.86% | 44.89% | 49.34% | 6 |
| Suspended bridge | 2.69% | 60.56% | 57.08% | 8 |
| Tower domino | 2.38% | 19.05% | 34.38% | 5 |

All six historical v1 runs conserved pixels and finite state. These results do not describe the current selective v2 mode. These are controlled geometry checks, not representative player completion rates or a tuned campaign economy. Timing changes trajectories, so browser runs can differ. The stronger player Blast does not always yield more destruction because it changes which structures collide.

Report: `/Users/roy/Developer/sand/artifacts/collapse-chain-2026-10-27/report.json`.

Desktop browser checks covered all three maps, one-shot triggering, original/chain comparison, pause and the displayed chain/pixelized metrics. Phone performance and touch feel have not been tested in this revision.


## Historical selective v2 measurements (2026-10-27)

Same fixed-step, one-shot base-preset protocol, 20 seconds after the attack:

| Map | Assist off (0) | Previous default (6) | Strong (12) | Maximum starting value (30) |
| --- | ---: | ---: | ---: | ---: |
| Staggered stack | 1.86% | 2.72% | 6.64% | 9.83% |
| Suspended bridge | 2.69% | 6.17% | 28.39% | 37.67% |
| Tower domino | 2.38% | 2.80% | 3.29% | 10.99% |

The percentages are pixelized material, not collected rewards. The authored maps showed one or two causal chain levels in these historical runs. Increasing strength can alter trajectories, so total destruction need not increase monotonically. Rarity across real play has not been established. The setting changes fracture work, not the initial Blast force.

Reports for both base/player presets: `/Users/roy/Developer/sand/artifacts/collapse-chain-controls-2026-10-27/power-{0,6,12,30}.json`. Browser checks verified slider/number/preset synchronization, reload persistence, disabled controls in original mode and adjustment during pause without resetting metrics. Phone performance remains untested.

## Default 10 and free campaign adoption

Default and preset are now 10. Older saved custom lab values remain until a preset or slider is selected. The free game always starts at 10 independently of lab storage. Shared source: `src/arch/chain-world.js`. Free records identify `arch-chain-v1` and export `chain.power`, `best`, `impacts` and `pixels`; the last field counts newly pixelized material on assisted collisions, not extra currency or a separate multiplier reward. Gravity, weapon stats, suction, battery, costs and saved upgrades are unchanged.

Evidence: `/Users/roy/Developer/sand/artifacts/free-chain-10-2026-10-27/`. The browser Arch Lane probe used one Blast and recovered 244 / 2000 pixels, including 204 newly pixelized in two assisted impact recipients of a stage-one chain. This is a smoke check, not pacing validation.
