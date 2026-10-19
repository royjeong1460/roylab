# Free30 balance probes

Current command: `node simulation/free30-campaign.mjs bomb 2 5` (also `mixed`, `blackhole`). Optional numbers are attack interval seconds and assumed workshop seconds. Every completed field now probes the boss; the final successful boss time is included in `estimateMinutes`. Maximum 150 fields is a diagnostic guard, not a game gate.

## free30-2 (2026-10-20)

User report: bomb-focused first boss in about 5–10 minutes. A free30-1 fast-input rerun cleared in about 4.7 min (2-second attacks / 5-second shop / every-field boss probes). This invalidates the old 30-minute pacing estimate for quick play.

Current recorded results, using actual physics with scripted targeting/purchasing:

| Style | Fields | Estimated minutes including successful boss |
|---|---:|---:|
| bomb | 60 | 22.2 |
| mixed | 58 | 19.3 |
| blackhole | 78 | 29.1 |

The three paths all use 2-second attacks and an ASSUMED 5-second shop. Failed counterfactual boss probes neither pay parts nor add elapsed time. Ordinary fields stop at 70%, battery cleanup, or the 180-second guard. The campaign omits onboarding, reading time and human aiming mistakes. It rotates six fixed eligible sites rather than sampling human strategies. These are pacing/reachability samples, not proof of a 30-minute human clear or fun. A better strategy can be faster.

Currency and actual growth formulas come from the current balance module. The balance leaves first upgrade prices and destruction physics intact, adds curved later purchase costs, and changes black-hole battery cost from 18 to 24. See `docs/free30-balance.md` for migration and post-clear uncapped growth.

Rejected probes: scaling the tower from .65 to .85 made a tested black-hole build unable to clear; a 30-battery black hole and uniform price curvature made the black-hole route too slow. Kept the current tower and used gentler prices on the three black-hole upgrades.

## Historical free30-1 assumptions and results


Run `node simulation/free30-campaign.mjs mixed` (or `bomb`, `blackhole`). For individual boss configurations: `node simulation/free30-probe.mjs --probes`.

This runs the actual gameplay world at 30 steps/sec, not an abstract DPS model. Each run targets low supports first, then reachable dense material; collection seeks the first available loose pixel. Attacks are spaced 10 simulated seconds apart. The campaign rotates the currently eligible fixed maps, purchases according to each strategy's explicit level preferences, and checks a counterfactual boss at runs 1, 6, 11, ... . It stops each field at 70%, battery-end collection, or the 180 sec fixture guard.

The reported estimate is simulated field time + an ASSUMED 20 sec workshop per run. Add the final boss time to estimate a complete route. Counterfactual failed boss checks do not spend currency or time in this estimate. Ordinary players may aim differently, miss, retry bosses, spend longer in the shop, or choose different upgrades. These are three reproducible reachability/pacing fixtures, not a distribution of human playtime or proof of a 30-minute clear.

Results for balance free30-1:
- Bomb: 16 ordinary runs, 24.5 estimated field/workshop min + 91.2 sec boss ≈ 26 min.
- Mixed: 21 runs, 29.5 min + 61.3 sec boss ≈ 30.5 min. Black hole unlocked at assumed elapsed 11.4 min.
- Black-hole focused (still uses bomb for supports): 21 runs, 29.5 min + 55.8 sec boss ≈ 30.5 min. Unlock at 12.4 min.

The estimator checks bosses every five runs, so earlier clears can be missed. Physics is nonlinear: increasing a stat can change the direction of a fall rather than monotonically raising recovery. Do not tune solely to these fixtures.
