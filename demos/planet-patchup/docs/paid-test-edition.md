# Free production / paid test boundary

Approved 2026-10-22: keep the tutorial/free campaign and saves, move the seven culture maps into a separate test URL, expose mobile power comparison controls.

- Free: `/games/planet-patchup-free/`. Existing campaign, upgrades, physics, input and progress storage unchanged. Culture preview link and assets removed from this build.
- Paid test: `/games/planet-patchup-paid-test/`. Six culture maps + boss (and original comparison). All selectable immediately; no progress rewards, purchases or unlock requirements. This is a public test URL, not a paid entitlement system.
- Shared engine/UI shell; the neutral edition hook is null in free. Paid bootstrap installs the harness before loading the game. Culture maps and tuning UI are reachable only from the paid entry.
- Paid settings use `planet-patchup-paid-test-v1` browser storage; free progression uses its existing store. Each test run is ephemeral. Applying settings saves and restarts the current map. Same browser retains settings across map changes; another device starts with defaults.
- Default: paid early, unlimited battery. Optional limited battery uses capacity and tool energy costs; existing final collection phase remains.
- Presets are test hypotheses, not validated 3–5-hour progression: free baseline, paid early, paid middle, paid late. Individual controls override the preset. Core stirring and wear cap at 10×; wear still ramps only while pieces actually rub.
- Gravity, contact physics, speed-based breakup and body/velocity safety limits are unchanged. Additional power can hit those safety caps; this is not a solver stress lab.
- Mobile: offset aiming on release, two-finger pan/zoom, automatic edge pan, sound toggle; inherited free input behavior. Real iPhone heat/frame rate need device testing.

## Development / deployment

From `demos/planet-patchup`:
- `npm run test:paid`: map validation and both-tool simulation, real stat wiring, settings boundaries/save isolation.
- `npx vite --config vite.paid.config.js --host 0.0.0.0 --port 8781` then `/free30.html`.
- `npm run build:paid` produces `dist-paid/index.html`.

From repository root:
- `npm run build:game -- --paid` verifies shared/free + paid tests and replaces **only** the paid public directory.
- `npm run build:game -- --free` replaces only the free public directory.
- Flags are mutually exclusive. Publish through existing Roylab Git/Cloudflare workflow. No homepage paid link is added in this test pass.

## Verification (2026-10-22)

- Shared/demo suite, 31 battery/input cases, free suite (63) and paid suite (10) passed in the release build.
- All seven culture maps remain validated/editable; bomb and blackhole simulation conserve pixels. Preset wiring checked against real bomb/well objects; free baseline exactly matches an untouched FreeWorld.
- Browser built-preview at 390×844: presets, numerical input, limited battery, save/restart, boss selection and settings persistence, bomb/blackhole attacks and collection confirmed. This is viewport QA, not a physical iPhone run.
- Review caught app-switch pause-dialog stacking over paid modals; modal guards added and reviewed.
- Paid build verified to leave all 13 free output files byte-for-byte unchanged after the one-time culture separation rebuild. Free bundle excludes paid map IDs and settings key.
- Roylab tests passed. Default local Turbopack build cannot follow the pre-existing external node_modules symlink; `npm run build -- --webpack` passed. No Next app/config changes made.
