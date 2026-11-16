# Independent source review — skill range and future prices

Scope: candidate `ios-skill-range-2026-11-16/project` against the selected `ios-blackhole-growth-2026-11-16/project` (0.5.70/80). This is a single-player skill/economy source review; the platform build and player validation are separate.

**PASS. No remaining source blockers in this scope.** Four corrections raised during review are present in the reviewed candidate: the malformed gravity/contact indentation is fixed; Slam identifies its real capture behavior; Aftershock keeps its original preferred spacing of 5 cells and fallback of 1 cell; and Orbital no longer scans arbitrarily many empty columns at very high legal levels.

## Range, targeting, and presentation

The catalog retains the original level-bounded milestones and power tail. Its new range multiplier is 1 through the old maximum, then 1 + 0.04√(L−M); M is 10 for Aftershock and 5 for the other eight. The full campaign configures the uncapped skill model in both platform projects. The base-level demo explicitly equips level 1 in `app/skill_demo.gd`.

| Skill | Source path reaching real material or motion |
|---|---|
| Aftershock / Relay | The scheduled radius goes through `_secondary_blast` to `world.blast`; material cuts, fracture halo, and impact VFX take the radius. The existing Shockwave impulse reach is still a tool stat. |
| Slam | Owned pieces and grains are captured inside the larger Shockwave-derived reach and lifted. Descent follows the same original pixel IDs, including later fragments. The larger down visual is not a second physical range gate; the description says capture reach. |
| Expand | The field still starts at 2 cells, pulses over a growing physical radius up to 11S, applies bounded pressure and kicks, and ends with a 2S burst. The shell uses the live field radius. |
| Wave | The old hard-landing rule starts four pulses per side. Pressure and kicks use 8S; pulse centers use 7S spacing and the old world-edge clamp. Ground crests widen with spacing. |
| Orbital | Light/heavy collision and blast radii use 3S/5S. The original target quantiles, impact strength, fall timing, and payload count are retained. Impact visuals use the actual blast radius. |
| Seismic | Contact scan span uses the original low-level coverage and then 1.2S, bond pressure takes 9S, and nearby-body impulse selection takes 12S. The strike visual follows the scan span. |
| Gravity | World-wide acceleration remains unchanged. Both sides of a supported contact use 2.5S for local pressure; the contact flash scales accordingly. |
| Sonic | Native scan width and the visible sweep widen together; actual impact pressure takes 5S. Per-side group deduplication, directions, time, and twelve steps remain unchanged. |

The Orbital helper in `skill_physics.gd:392` delegates ordinary radii to the unchanged native lookup. For a radius larger than both 16 cells and the occupied column count, it walks only material points. The native builder assigns each point to floor(x), and the fallback applies the same inclusive X distance and vertical interval, then takes the minimum height with the same starting ground value. That makes the result independent of dictionary iteration order and bounds the new path by actual material, while preserving the physical radius.

Compared the active/passive state producers with their readers: marks retain their matching tuning dictionary; scheduled wave and field actions do not expect keys from another skill. Recharge's effect, one-shot activation, and price remain unchanged. Current/next workshop details use catalog results through the existing formatter. The nine new Korean strings match English format argument order and types. The local Web tree retains its own locale entries and adds the same nine translated entries.

## Prices, profiles, and scope

`campaign/economy.gd` keeps learn costs, fixed rows, and the first post-table price. A destructive tail offer uses the old first polynomial quote as its anchor and `campaign/money.gd` computes the 3% linear increase with exact decimal multiplication, integer comparison and ceiling to tens. The level guard keeps the native integer factor below the signed 64-bit limit. Recharge still uses the historical polynomial directly. The validation upper bound stays historical; the lower bound stays anchored. Existing all-old and mixed purchases keep the conservative acceptance interval. The shop debits the quote and adds only that charge to the persisted ledger; there is no retrospective price calculation, schema change, refund, or reset. Inspected the baseline contracts, price report and dedicated price review; did not repeat their independent arithmetic runs.

A file-tree comparison excluding Godot's generated import cache found only the five gameplay/economy/presentation scripts, Korean locale, and two version/build metadata files changed. Maps, source art, native modules, the demo, profile store/schema, purchase transaction code, base Shockwave and Black Hole physics, and bundle/save identity are unchanged. Black Hole level-20 tuning proposals are separate from these candidate files.

Compared the final six-file behavior patch against a fresh in-memory diff; they match. The five shared scripts are byte-identical in the Web source tree and the iOS candidate; each locale gained the same nine correctly formatted translations. Both source hashes in `price-growth.json` match the final economy and money files. Reviewed skill physics SHA-256: `420f213576b44fe799d8b34dd345bd571e647831822ac99f5cea5714a0fbf451`.

No engine, test, scene, simulation, save/profile, browser, install, or device was run in this review. Source inspection cannot establish actual play, pacing, player-facing VFX legibility or balance, thermal performance, save loading, or deployment.
