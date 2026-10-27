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
