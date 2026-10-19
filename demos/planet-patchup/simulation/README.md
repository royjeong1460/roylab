# Free30 balance probes

Run `node simulation/free30-campaign.mjs mixed` (or `bomb`, `blackhole`). For individual boss configurations: `node simulation/free30-probe.mjs --probes`.

This runs the actual gameplay world at 30 steps/sec, not an abstract DPS model. Each run targets low supports first, then reachable dense material; collection seeks the first available loose pixel. Attacks are spaced 10 simulated seconds apart. The campaign rotates the currently eligible fixed maps, purchases according to each strategy's explicit level preferences, and checks a counterfactual boss at runs 1, 6, 11, ... . It stops each field at 70%, battery-end collection, or the 180 sec fixture guard.

The reported estimate is simulated field time + an ASSUMED 20 sec workshop per run. Add the final boss time to estimate a complete route. Counterfactual failed boss checks do not spend currency or time in this estimate. Ordinary players may aim differently, miss, retry bosses, spend longer in the shop, or choose different upgrades. These are three reproducible reachability/pacing fixtures, not a distribution of human playtime or proof of a 30-minute clear.

Results for balance free30-1:
- Bomb: 16 ordinary runs, 24.5 estimated field/workshop min + 91.2 sec boss ≈ 26 min.
- Mixed: 21 runs, 29.5 min + 61.3 sec boss ≈ 30.5 min. Black hole unlocked at assumed elapsed 11.4 min.
- Black-hole focused (still uses bomb for supports): 21 runs, 29.5 min + 55.8 sec boss ≈ 30.5 min. Unlock at 12.4 min.

The estimator checks bosses every five runs, so earlier clears can be missed. Physics is nonlinear: increasing a stat can change the direction of a fall rather than monotonically raising recovery. Do not tune solely to these fixtures.
