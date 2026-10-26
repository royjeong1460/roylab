# Planet Patchup — Six Regions / Five-hour Campaign

Date: 2026-10-26 (Asia/Seoul)
Status: decision summary plus balance proposal v0.1. This document does not change the playable build. Confirmed rules below come from the current conversation; all numerical targets and schedules in the proposal remain unvalidated.

## Confirmed direction

- Free first region, one-time purchase for the remaining five regions. Free progress, owned equipment and currency continue into the full game. No advertising or paid growth currency in this direction.
- Six regions total: five distinct cultural regions, then a sixth combining them. Six ordinary maps and one boss per region: 42 maps, including 35 beyond the free region. These are planned content counts, not completed assets.
- First region: Arch Quarter, followed by Eave Alley, Amber Bazaar, Canal Works, Terrace Heights and Mosaic Basin. English names are source-language working names, not final localized branding.
- Famous architecture supplies a recognizable motif; independent alien structures change the silhouettes, proportions and support geometry.
- Early floors use cement and stone without water or plants. Water appears in the middle regions; greenery appears later. Keep terrain mostly visual for now, without introducing fluid simulation or new material-strength systems.
- Reuse pillar, body, roof, connector and prop kits. Later maps have more destructible pixels and larger occupied footprints, not just denser solid blocks. Bosses grow with the regions.
- Target first completion: about five hours, including the free region. This supersedes older three-hour planning. Time targets are not waiting gates or proven playtimes.
- Primary tools remain Blast and Black Hole (working names). Cutter remains outside this direction. Current accepted active-device behavior is implementation checkpoint 721ac93; performance and final numerical balance are deferred.
- Passive skills must be learned and equipped, with a maximum of two equipped. Activation is deterministic by attack count, not random chance. Readiness should be visible through the equipped icon/tool feedback rather than several persistent numeric counters.
- Active skills must also be learned and equipped. They use buttons and act across the map. Existing lab devices: Orbital Drop, Seismic Driver, Gravity Press and Sonic Sweep. Battery Recharge restores 25% of maximum capacity; it is a recorded concept, not an implemented campaign skill or lab button.
- Boss fragments are not spendable currency. Boss currency is awarded only on successful completion. Ordinary sites remain the repeatable earning route.

## Collection decision, clarified by the user

Only loose pixels count. Detached rigid chunks do not qualify merely because their supports were cut.

Remove the old pointer-based suction range and manual sweeping model. Automatic collection makes loose pixels rise and disappear. User correction: automatic collection DOES have two separate upgrade tracks: pixels collected per batch and collection frequency (shorter interval). The earlier baseline-only/no-collection-upgrades interpretation was incorrect. Batch size moves existing eligible pixels; it does not duplicate rewards or collect rigid chunks.

The 70% clear condition, best recovery percentage, and 100% completion are distinct from suction rate and remain progression measures. Replacing the old suction model does not remove the stage percentage display.

On battery exhaustion, no more ordinary attacks can be issued. Allow up to ten seconds for already triggered effects, collapse and automatic pickup to finish. All eligible loose pixels produced through the end of that window are secured; visual travel must never cause loss. Remaining rigid chunks and attached structure do not count. No scripted conversion of remaining chunks to pixels at the deadline.

Suggested collection presentation (not tuned): short 0.4–0.8 s upward rise/fade, batched visuals when many pixels appear, no finger/nozzle target. Separate the authoritative pixel ledger from visual particles. Never double-credit collected pixels, off-camera pixels or batched particles. Accounting is in physical map pixels, not the number of rendered particles.

The ten-second finish is a maximum, not a compulsory wait. An early finish is safe only when no queued device/effect, moving structural body or pending pickup can still contribute. At the maximum deadline settle the accounting exactly once. Persistent or late skills must have a bounded lifetime that fits this rule; Battery Recharge must be used before the exhausted/settlement phase.

Removing loose pixels earlier can change the support offered by debris piles. Test that interaction during implementation instead of claiming the existing physics will be completely unaffected.

## Current build versus decisions

The inspected free30 journey still adds recovered pixels on boss settlement, plus a first-win bonus. Suction throughput/radius upgrades still exist. Active devices are a lab system without campaign learning/equipment. This document is a new target, not evidence that those migrations are implemented.

Older rules that no longer define the campaign: random maps instead of named stage lists; random passive procs; collecting by moving a nozzle; losing uncollected loose pixels at the ten-second deadline; boss-failure pixel earnings; unlimited upgrades immediately after the free boss. Put unlimited progression after the final planet clear if retained, not after region one.

## Region and content proposal

| Region | Architectural motif / boss working concept | Minutes in region | Cumulative minutes | Ordinary occupied pixels per map | Boss occupied pixels |
|---|---|---:|---:|---:|---:|
| 1 Arch Quarter | Stone arches / Crooked Bell Twins, leaning-tower motif | 30 | 30 | 2,000–4,000 | 6,000 |
| 2 Eave Alley | Tiled roofs / Twincrest Pavilion, multilayer pavilion motif | 45 | 75 | 4,000–7,000 | 10,000 |
| 3 Amber Bazaar | Courtyards and domes / Stacked Dome Palace, domed-palace motif | 50 | 125 | 7,000–11,000 | 16,000 |
| 4 Canal Works | Warehouses and bridges / Triple Gate Bridge, tower-bridge motif | 55 | 180 | 11,000–16,000 | 23,000 |
| 5 Terrace Heights | Stepped highland buildings / Sky Terrace Citadel | 60 | 240 | 16,000–23,000 | 32,000 |
| 6 Mosaic Basin | Mixed kits / Patchwork Crown, clustered-spire motif | 60 | 300 | 23,000–32,000 | 45,000 |

These are authoring envelopes to test, not mobile performance budgets. Count occupied destructible pixels only, excluding sky, empty cells and decorative ground. Keep normal material density readable; expand width/height, terraces and separated buildings as well as pixel count. Do not automatically increase rigid-body limits for larger maps.

Boss motifs are design references, not cleared third-party art assets. Independent map art and asset-source checks remain production work.

Each region's six ordinary maps are available when that region opens. Each must reach at least 70% in one attempt to open the boss button. Best records persist; adding several incomplete attempts together cannot clear a stage. A qualified run may continue toward 100%. Bosses remain opt-in through the button; completing the region boss opens the next region, subject to full-game ownership after region one.

No requirement to buy every upgrade or to 100% all maps before moving on. Keep completionist records separate from the main five-hour path.

## Learning and loadout proposal

Latest recommendation, not yet explicitly approved: two passive slots and up to two active slots. Start with one of each; open the second slots in region two. Equip distinct active skills, each usable once per sortie (two activations total with two equipped). This allows preparation/finisher combos without repeat casting by spending battery. The user confirmed both auto-collection upgrade tracks; do not interpret that answer as approval of active-slot rules.

Unlock access through map achievements; learn with the same pixel currency used for equipment. Unlocking a recipe is not automatically owning it. Give the first passive as a clear reward/tutorial grant so learning and equipping are demonstrated without competing with the first basic upgrade. Equip and swap between sorties without a fee; retain a learned skill's levels when unequipped.

| Progress event | Indicative cumulative time | New choice |
|---|---|---|
| Tutorial / first settlement | 0–3 min | Blast and first battery or force upgrade |
| Two distinct region-one ordinary clears | 4–7 min | Learn/equip Aftershock as tutorial grant; passive slot one |
| Three distinct region-one clears | 8–12 min | Black Hole purchase available |
| Four distinct region-one clears | 15–20 min | Orbital Drop purchase available; active slot one |
| Five distinct region-one clears | 20–25 min | Impact Relay available as alternative passive |
| Enter region two | 30–35 min | Passive slot two; proposed active slot two; Seismic Driver available |
| Three distinct region-two clears | 45–55 min | Lift & Slam available |
| Enter region three | 75–85 min | Gravity Press and Pressure Bloom available |
| Enter region four | 125–135 min | Sonic Sweep and Ground Pulse available |
| Enter region five | 180–195 min | Battery Recharge available; previously learned skills get late upgrades |
| Region six | 240–300 min | Mature combinations and final upgrade decisions, no new mandatory control |

Times are diagnostic targets, not timers. A skilled player reaches milestones earlier. Recipe availability does not guarantee the player buys every option. Recommend one affordable option, not a forced purchase path.

Proposed active devices: one activation per equipped skill per sortie, ready at entry, no normal battery cost. Recharge occupies one of the active slots, restores min(25% capacity, missing charge), and is usable only while charge > 0. No duplicate skill equipment. No real-time recharge or idle cooldown farming. In the lab retain unlimited repeat testing; do not apply lab values directly to campaign progression. Equipping at camp cannot reset a charge in an ongoing sortie.

A boss and an ordinary site both count as new sorties. Selecting a skill with poor suitability should never make an otherwise affordable stage impossible: both base tools remain available, and retries permit free swaps.

## Passive proposal: visible deterministic triggers

Initial catalog contains the five already tested Blast effects. Black Hole currently grows through its pull/mix/wear system; it is not implicitly granted these Blast-only passives. A dedicated Black Hole passive catalog is separate future scope if playtesting shows it needs more build choices.

| Passive | Base trigger | Upgrade focus | Proposed level-five change |
|---|---|---|---|
| Aftershock | Every 4 eligible Blasts | Follow-up blast force | Every 3 eligible Blasts |
| Impact Relay | Every 5 eligible Blasts | Marked fragment's transferred impulse | Every 4 eligible Blasts |
| Lift & Slam | Every 6 eligible Blasts | Downward slam impulse; bounded lift | Every 5 eligible Blasts |
| Pressure Bloom | Every 5 eligible Blasts | Outward push of the expanding field | Every 4 eligible Blasts |
| Ground Pulse | Every 6 eligible Blasts | Ground impulse of a marked fragment | Every 5 eligible Blasts |

All are proposals. An eligible Blast spends battery and affects actual map structure or a rigid chunk. Empty air clicks do not preload counters. Secondary explosions, device attacks and chained passive events neither advance counters nor recursively proc passives. Counters reset per sortie, not on menu toggles. Both equipped passives may proc on the same eligible attack.

Use at most six icon segments and an obvious ready outline; keep a numeric explanation in the skill detail panel. Mark the charged next attack before release. Confirmation feedback distinguishes a passive proc from the base explosion.

Each passive has five learned levels: level one unlocks it; levels two through four add a small amount of its signature effect; level five improves cadence by one attack. Start with +10% of level-one signature force per intermediate level. Do not simultaneously scale radius, number, frequency and force. Collision-dependent passives may fail to find a suitable fragment; clearly signal the mark and test whether such failure feels fair before locking these counts.

## Upgrade proposal

Keep one currency, permanent ownership and modest increments. Values below are candidates; they do not overwrite the accepted physics checkpoint. Percentage steps mean a percentage of the baseline, not compounded percentage growth.

| Track | Small purchase step | Campaign candidate bound / treatment |
|---|---|---|
| Auto-collection batch size | Increase eligible pixels per pickup batch | Confirmed upgrade axis; base/step/cap to be calibrated, no extra currency creation |
| Auto-collection frequency | Shorten interval between batches | Confirmed upgrade axis; evaluate combined pixels/second with batch size |
| Battery capacity | +5 energy | Starting 60; up to 180 in this first pass |
| Blast force | +5% baseline force | 30 steps: 1.0x to 2.5x |
| Blast direct radius | +0.1 cell | 20 steps: radius 3 to 5; area rises about 2.78x, so price more heavily |
| Blast force reach | +0.5 cell | 20 steps: 18 to 28 cells |
| Black Hole pull | +5% baseline pull | 30 steps: 1.0x to 2.5x; avoid multiplying every parameter together |
| Black Hole reach | +0.5 cell | 20 steps: baseline +10 cells |
| Black Hole duration | +0.1 s | 20 steps: baseline +2 s |
| Black Hole core mixing | +0.25x | Starts 1x, absolute cap 10x; not required to max before ending |
| Black Hole wear ceiling | +0.25x | Starts 1x, absolute cap 10x; still ramps only during rubbing |

Do not restore pointer suction radius or add attack-repeat speed or generalized physics-speed upgrades now. Frequent multi-touch shots and multiple simultaneous wells need separate limits and performance checks. Enlarge force/reach safely without removing collision or speed protections.

These caps are not a requirement to buy everything in five hours. A player should strengthen selected tracks and reach the ending with meaningful alternatives unmaxed. Do not unlock every branch at once: show tool-specific upgrades when its tool is learned, with advanced Black Hole mixing/wear introduced progressively.

## Active skill upgrade proposal

Each device uses five levels and a single upgrade card. Show the next concrete effect on the card. This keeps broad skill progression distinct from the finer-grained tool upgrades.

| Device | Main incremental strength | Level-three / level-five signature change |
|---|---|---|
| Orbital Drop | Payload impact strength +10% baseline per level | +1 satellite payload at level 3, +1 at level 5; last heavy payload remains recognizable |
| Seismic Driver | Foundation impulse +10% baseline per level | Widen impact-point coverage at 3; one weaker follow-up pulse at 5 |
| Gravity Press | Peak added load +10% baseline per level | Hold +0.25 s at 3 and 5; supported contact fatigue still bounded |
| Sonic Sweep | Inward impulse +10% baseline per level | Inward field remains effective a little longer at 3 and 5; no bonus center explosion |
| Battery Recharge | Fixed 25% of current maximum capacity | No separate levels initially; capacity upgrades naturally increase the recovered amount |

These signature changes are design proposals, not implemented lab behavior. Do not use a general 1/2/3 multiplier as the finished upgrade tree. One activation should make a visible contribution, but should not independently clear an untouched same-tier boss.

## Earnings and costs proposal

Ordinary site: 1 collected map pixel = 1 spendable pixel. Failed/incomplete normal attempts retain all eligible collected pixels. Resetting the site restores its geometry and energy for the next attempt.

Boss: show cleanup progress and pickup animation, but maintain a separate non-spendable run counter. Failure or withdrawal below 70% pays zero. Once a run qualifies, its clear and reward eligibility cannot be lost by choosing to continue toward 100%. Award a fixed success payout at settlement, exactly once per attempt. Do not add boss debris value on top of that payout.

Proposed rewards: first boss clear about 2 normal successful-sortie payouts of its region; repeat successful clear about 0.5; first 100% completion a separate modest one-time bonus. Ensure boss farming does not outperform normal sites, especially when overgeared. Never reward failed boss chip damage, and never require grinding the same boss for progression.

Define U_i as a representative successful ordinary sortie payout for region i, measured using intended entry gear and several sensible attack routes. Use it offline to author a fixed catalog; prices must not change dynamically with player earnings or current map selection.

- First tutorial upgrade: within one short attempt's actual earnings.
- Early basic upgrades: roughly 0.25–0.5 U_i; later purchases at the expected level roughly 0.75–1.5 U_i.
- Learning a skill: about 1 U_i; first passive tutorial grant is free.
- Skill levels 2–4: about 0.75–1.5 U_i; a level-five cadence/signature milestone about 2 U_i.
- Assign the expected progression tier to each level's fixed price. Advancing regions must not retroactively inflate existing offers or refund prior spending.

No final absolute price table is claimed before map accounting is measured. Guaranteed pickup raises income relative to the old nozzle-based assumptions; reusing old costs or subtracting a blanket 30% power is not a validated solution.

## Pacing and balance checks to do next

Target a normal sortie around 60–120 s plus up to ten seconds of finish; menu time is measured separately. Budget growth through new layouts and meaningful purchases, not long collection waits, slow attack assumptions or repeated failed boss attempts. No more than two ordinary sorties without an affordable useful purchase at the intended progression level.

Measure effective output as pixelized map material per battery energy and per sortie, rather than summing nominal force and radius into one reliable power number. Structural tipping and chain collapse make that relationship nonlinear.

Track first upgrade, first passive equip, Black Hole purchase, first device, each region entry/clear, boss attempts, failure recovery path, selected loadout, automatic pickup losses (target zero), and maximum moving bodies/frame time on the target iPhone. Include blast-only, Black-Hole-heavy and mixed routes with different active selections; late-game tests must include skill synergies.

Five-hour target means first completion around 300 min for the intended player, not a guarantee or minimum. Skilled routes may finish earlier. Previous 5–10 min reports remain evidence of earlier pacing failures, not evidence this plan is tuned.

Next planning steps: (1) agree the proposed two-active-slot / once-per-equipped-skill rule and learning order; (2) author one representative map per region plus the free seven-map pack; (3) capture real pixel yield for entry and stronger profiles; (4) make fixed cost tables and simulate progression with measured physics yields; (5) compare real playtests, then refine. No implementation or release was performed by writing this proposal.

## Auto-collection follow-up — 2026-10-26

Confirmed by user: upgrade both batch quantity and collection speed. Strong upgrades can cost more. Evaluate effective throughput as batch quantity / interval; do not price both axes as though their combined improvement were merely additive. Author a fixed, visible price table after measuring combinations, rather than raising a player's price secretly based on their build.

The guaranteed end-of-run pickup rule still applies. Consequently, faster collection chiefly improves pickup feedback and reduces waiting; it cannot justify large mandatory progression costs by withholding otherwise guaranteed pixels. Distinguish this convenience value from destructive power. Higher prices pace access but cannot by themselves prevent a late-game combo from trivializing maps; measure combos before finalizing late costs. No code changed.

## Numerical planning follow-up

The [integrated v0.2 budget](../../campaign-balance-v0.2.md) supplies proposed map-by-map counts, fixed upgrade prices, boss rewards and an explicit replay-income scenario. It supersedes the unspecified numerical placeholders above only as a planning candidate, not as approved or measured game balance.
