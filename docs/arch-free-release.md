# Arch Quarter free campaign

Release date: 2026-10-26. Status: published to the canonical free-play URL.

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

Version identifiers: map `arch-quarter-v2`; balance `arch-campaign-v0.2.1`. Geometry, targets and column/body/roof roles are deterministic. All six ordinary sites are open; the boss requires a best result of at least70% on each. Crossing70% does not end a sortie.100% remains a separate achievement.

Loose pixels collect near the pointer by default. The optional Auto Collect upgrade adds map-wide pickup with an upward animation. Detached rigid chunks do not count until fragmented into pixels. Base proximity suction is80 pixels/s within12 cells; global pickup starts at22 pixels per0.25s after the80-part unlock, with separate batch and interval upgrades. On energy exhaustion, ongoing effects and recovery have up to10s before eligible loose pixels are secured. Ordinary currency equals recovered loose pixels. Boss fragments count towards completion only; rewards are4000 for first success,1000 for repeat success and0 for failure.

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

Root route/locale tests:5 passed. Arch plus implicated structural/effect checks:63 passed; legacy free checks:65 passed. Final correction checks:36 passed. Free production build passed with the existing large Phaser chunk warning. The root production build also passed with `npm run build -- --webpack`; the default local Turbopack command failed because this checkout links node_modules outside its root. No project config was changed for that environmental limitation. Final code review approved `1a12e1b` after correcting reset invalidation and actual cleanup duration. All119 preserved comparison assets remained byte-identical. Cloudflare Pages deployed game commit `f7a2afa` successfully. The live canonical URL was reopened and showed Arch Quarter with all six ordinary maps and the locked boss. A final copy-only polish replaces duplicate boss advice with the distinct-clear count. No real iPhone validation is claimed. These QA actions include time spent inspecting the page and are not a completion-time playtest.

## v0.2.1 restoration — 2026-10-26

This correction restores free proximity suction: loose pixels inside the pointer's 12-cell circle are collected at 80 pixels/s without clicking or spending battery. The prior inward particle animation and visible suction circle are restored. Global pickup is separate: the existing 80-part Auto Collect purchase enables 22 pixels per 0.25s, with upward departure animation. Quantity and interval upgrades affect global pickup only. Previously purchased collection levels still enable it. Physical chunks remain excluded, and the final ten-second loose-pixel sweep is unchanged.

Tutorial is an explicit, separate map-list action. Selecting Arch Lane on a new profile starts Arch Lane, even before the tutorial has been completed; training never contributes a normal-site clear or a boss unlock.

Presentation reuses the approved local 픽셀디자인 sources: planet-home-v3-2026-10-26, hud-minimal-2026-10-26 and icons-v1-2026-10-26. The four-direction globe selects Arch Quarter as the free region and five locked previews. Its clearing state follows the actual boss save. The game uses a single battery/recovery/pause row, one lower-left tool switch, an equipped active-skill button and a passive icon only when the next qualifying attack is ready. No extra skill slots or cooldown system are added by this visual change. Font attribution is shipped at `games/planet-patchup-free/licenses/Galmuri-OFL.md`.

The schema and prices are unchanged. Save slots retain the v0.2 wire-format tag so already-open older tabs can still settle their runs; loaded runtime profiles, new journals and exports identify the corrected rules as v0.2.1. A mixed-version test loaded the actual baseline Journey and balance code, purchased Battery in a new tab and successfully settled an old-tab run without losing either reward or purchase.

Verification: 44 Arch checks passed, including suction, global unlock, pixel conservation, tutorial separation, save migration and telemetry. The preceding 65 legacy-free and five route/locale checks passed. Browser QA used separate local QA progress: proximity collection raised recovery without another attack or battery expenditure; the explicit tutorial returned 148 parts; purchasing Auto Collect cost 80 and left 68; Arch Lane then opened independently with both collection paths enabled. Console warnings/errors were empty. The 30-minute balance target and iPhone behavior have not been validated by this correction.

Cloudflare Pages completed the `75f53e0` deployment successfully. The live canonical URL showed the approved planet, six region choices and a separate Tutorial above the six ordinary sites. The live page produced no browser console warnings/errors. All119 comparison assets remained byte-identical.
