# Arch Quarter free campaign

Release date: 2026-10-26. Status: verified locally; production deployment pending.

## Scope

Public entry: `https://roylab.pages.dev/planet-patchup/play/`.

This free build uses Arch Quarter, with six manually selectable ordinary sites and Crooked Bell Twins. It does not replace the historical comparison experiments. Existing free-campaign saves remain in their old keys; Arch starts in the separate `pixel-demolition-arch-v1-a/b` namespace. Returning to this build resumes Arch progress.

| Map | Occupied pixels |
| --- | ---: |
| Arch Lane | 2,000 |
| Salvage Court | 2,400 |
| Broken Arcade | 2,800 |
| Kiln Terrace | 3,200 |
| Stacked Forum | 3,600 |
| Grand Arcade | 4,000 |
| Crooked Bell Twins | 6,000 |

Version identifiers: map `arch-quarter-v2`; balance `arch-campaign-v0.2`. Geometry, targets and column/body/roof roles are deterministic. All six ordinary sites are open; the boss requires a best result of at least70% on each. Crossing70% does not end a sortie.100% remains a separate achievement.

Loose pixels collect globally and rise out of the scene. Detached rigid chunks do not count until fragmented into pixels. Base collection is20 pixels per0.25s; the two collection tracks improve batch size and interval. On energy exhaustion, ongoing effects and recovery have up to10s before eligible loose pixels are secured. Ordinary currency equals recovered loose pixels. Boss fragments count towards completion only; rewards are4000 for first success,1000 for repeat success and0 for failure.

The free campaign has one equipped passive and one equipped active skill. Aftershock is granted at two distinct clears; Black Hole can be purchased after three; Orbital Drop after four; Impact Relay after five. Orbital Drop is once per sortie without battery cost. Passives count effective primary Blasts only, not empty shots or secondary effects. Upgrades retain the stated caps after boss completion. Full-game two-slot progression is outside this release.

## Local playtest journal

Options → Export records downloads a self-contained JSON report. It is not uploaded to a server. The journal includes successful, unsuccessful and abandoned runs, map/balance version, reset generation, starting/ending upgrades and skills, tool counts, energy used, exact recovered pixels and awarded currency, elapsed active/simulated time, first70% timing and frame summaries. Tutorial and QA records are marked separately. Progress reset preserves the journal; clearing browser site data removes local saves and journal alike.

The journal targets200 retained runs plus pending live attempts, with at most24 periodic samples per run. An unknown crashed tab can remain pending when its session identity is unavailable. Web Locks serialize pruning; environments without them label truncation counts approximate. Its warning appears when local storage fails; export before closing if that happens. Different browsers/devices/origins have different records, so export from the device used for playtesting.

Analyze an export from `demos/planet-patchup`:

```sh
node scripts/analyze-arch-report.mjs /absolute/path/to/arch-report.json
```

Use observed recovery per battery, parts earned per active minute, repeat count before first70%, purchase order, passive/active contribution and frame health to adjust the next version. Separate tutorial, preview, QA and abandoned runs from ordinary completion estimates. Exported data measures only the retained local history and is not an account-wide analytics service.

## Balance limits

The30-minute first-region target is not validated. Numeric tests establish costs, conservation, skill rules and payout behavior; they do not establish enjoyment or human completion time. A nonadaptive five-shot smoke probe produced low recovery and many rigid chunks. It repeatedly targeted old support coordinates after collapse, so it is diagnostic rather than a human pacing estimate. Real play sessions are needed before deciding whether to change map fragility, starting strength or purchase costs. Do not pad playtime by raising costs without checking demolition output.

## Release verification

Browser QA (local, separate QA save): the tutorial accepted five mouse Blasts, used60 energy and awarded160 recovered parts; Battery Capacity cost150, leaving10 parts, and reload preserved capacity65. The JSON download contained the same five attacks,160 reward, map seed/version and measured frame summary; the analysis script read that file successfully. Reloading an unfinished ordinary map added an abandoned record. The revised field retained its full width and overview toggle worked. Browser console error/warning list was empty during these checks.

Root route/locale tests:5 passed. Arch plus implicated structural/effect checks:63 passed; legacy free checks:65 passed. Final correction checks:36 passed. Free production build passed with the existing large Phaser chunk warning. The root production build also passed with `npm run build -- --webpack`; the default local Turbopack command failed because this checkout links node_modules outside its root. No project config was changed for that environmental limitation. Final code review approved `1a12e1b` after correcting reset invalidation and actual cleanup duration. All119 preserved comparison assets remained byte-identical. Production deployment remains pending. No real iPhone validation is claimed. These QA actions include time spent inspecting the page and are not a completion-time playtest.
