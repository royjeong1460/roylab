# Local falling-body comparison

Open `http://127.0.0.1:8793/collapse-fall.html` while the collapse lab Vite server is running. Standalone start: `npx vite --config vite.collapse-fall.config.js` from `demos/planet-patchup` (stop the other server on 8793 first).

- Both responses retain the shared ChainArchWorld cascade, fixed at 10×. The original response instantiates ChainArchWorld directly.
- Four-, twenty- and seventy-cell drops use the same 30×12 solid body. Press **자유 낙하**; press again to repeat. The three original collapse maps are also available.
- Only measured downward-moving rigid-body contacts opposed by a supporting surface enter the new path. Side scrapes, static recipients, tools and chain-qualified hits retain their inherited paths.
- Collision onset: normal speed and downward contact speed both above 14 cells/s. Severity rises continuously from normal speed 30 to 75 cells/s.
- The fracture budget comes from the existing measured effective collision energy. Contact crushing gets 80% at low severity, falling to 15% at full severity. At most 12% of the body is directly crushed per hit. Strong impacts spend the remainder on the existing irregular bond graph, up to ten groups per impact. No gravity or global clock changes.
- Separation motion is bounded to 4% of the budget at full severity. Existing fragment creation preserves the parent's velocity field; existing body-cap overflow remains active.
- The small collision onset prevents resting rubble from continually grinding. Internal cracks depend on geometry and available energy; not every drop guarantees a split.
- JSON export includes tools, settings, pixel ledger, chain records, fall records and the controlled drop's first landing (including zero damage in the old response). No server upload or campaign-save writes.

Verification: `node --test tests/collapse-fall.mjs tests/collapse-chain.mjs tests/collapse-lab.mjs tests/arch-chain.mjs`; build: `npx vite build --config vite.collapse-fall.config.js`.

2026-10-27 desktop fixed-step sample, 360 pixels:

| Drop | Impact speed | Old pixels / remaining bodies | New pixels / remaining bodies | New largest body |
|---|---:|---:|---:|---:|
| 4 cells | 23.5 cells/s | 0 / 1 | 2 / 1 | 358 |
| 20 cells | 50.1 cells/s | 33 / 1 | 19 / 2 | 333 |
| 70 cells | 88.3 cells/s | 104 / 5 | 21 / 10 | 105 |

These are repeatable fixture results, not final game balance or iPhone performance validation. Evidence is saved under `/Users/roy/Developer/sand/artifacts/local-fall-fracture-2026-10-27/`.

## Lowered map 1 criteria (separate response)

Correction: the user meant the real free-game **Arch Lane**, not the first collapse mini-map. The page now opens `무료판 맵 1 · Arch Lane` by default, directly reusing `ARCH_SITES[0]` (2,000 pixels, original structural roles and architecture). Direct link: `http://127.0.0.1:8793/collapse-fall.html?map=arch-1-arch-quarter-v2&response=sensitive`. The three small maps are explicitly labelled `실험용`. No physics parameters changed in this map-selection correction.

Same marked left-column blast on the real Arch Lane, 30 simulated seconds: previous fall response leaves 1,658 pixels in chunks; sensitive response leaves 1,324 in chunks and 598 loose/pending pixels. One 645-pixel falling group splits into 10 groups, including body-containing pieces with 191/61/53/46/46/28/28 pixels. Material remains 2,000 in both responses. These are local fixture outcomes, not a campaign balance measurement.

The measurements below refer to **the earlier collapse-stack mini-map**, not Arch Lane:

Open `http://127.0.0.1:8793/collapse-fall.html?map=collapse-stack&response=sensitive`. Choose **낮춘 균열 기준** or **이전 낙하 균열**, then press **초기화 + 비교 1발** for the same initial pose, aim and starter power. The original chain-only response also remains available. No public/free-game entrypoint changed.

Sensitive-only falling contact settings:

- Crack severity now rises from 14 to 32 cells/s (previously 30–75); activation span is 10 instead of 20.
- Graph bond resistance is .02 instead of .65, and propagation distance is 3×. Lowering speed alone only detached leg tips, so these changes let the measured impact reach and split the body.
- A contact span wider than 3 cells proportionally increases bond resistance to distribute load. This keeps a low, flat landing from shredding the body.
- Gravity, actual collision energy, tools and chain priority/power are unchanged. Initial map seating uses the previous settings before enabling the comparison. Resting debris does not continually crack.

Same map 1 starter shot, 20 simulated seconds: previous response had 0 additional fall fractures; sensitive response had 7. A 374-pixel body group hit at 24.5 cells/s and split into 8 groups, with 243 pixels in the largest. Multiple resulting pieces contained substantial body material (139, 35, 26, 24 body pixels), not merely detached legs. The first chain hit is identical; later chain results can differ because the geometry now splits differently.

Controlled first landings, same 360-pixel body:

| Height | Speed (cells/s) | Loose pixels | Bodies | Largest |
|---|---:|---:|---:|---:|
| 4 | 23.5 | 2 | 1 | 358 |
| 10 | 36.1 | 10 | 8 | 60 |
| 20 | 50.1 | 7 | 10 | 132 |
| 70 | 88.3 | 21 | 10 | 105 |

Fragment size/count is not monotonic with height: energy is shared between contact chips and graph cracks, and impact grouping is capped. These are fracture-sensitivity tests, not final balance.

Tests: `node --test tests/collapse-fall-sensitive.mjs tests/collapse-fall.mjs tests/collapse-chain.mjs` (21 passing). Local build passed. Raw comparison and browser screenshot: `/Users/roy/Developer/sand/artifacts/local-fall-sensitive-2026-10-27/`.
