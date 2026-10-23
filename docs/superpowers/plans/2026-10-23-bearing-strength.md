# Bearing Strength Comparison Implementation Plan

> Execution: approved implementation in this session, followed by independent code review.

**Goal:** Compare identical upper buildings on 1-cell and 2-cell columns, with absolute thickness, supported load and eccentricity determining failure.
**Architecture:** A new BearingWorld overrides static support evaluation only. Matter gravity, hinges, collisions and existing published editions remain intact. New maps, entrypoint and build target publish to planet-patchup-bearing.
**Tech Stack:** JavaScript, Phaser/Matter, Vite, node:test.

## Constraints
- Keep all existing published directories unchanged.
- Gravity 1x, rotation response 3x, speed cap 1x.
- Read/write only new bearing storage keys.
- Same roof geometry in both specimens; additional column cell is the only structural difference.
- Separate playability heuristic from engineering simulation claims.

## Tasks
- [x] Add tests in demos/planet-patchup/tests/bearing-lab.mjs: absolute capacity increases with width; eccentricity and load increase utilization; single and paired maps preserve roof geometry; thin support yields and thick support holds; cutting thick support down to one yields; pixel count remains conserved after simulation.
- [x] Create src/bearing-lab/strength.js with utilization = compression load / capacity + eccentric bending moment / capacity. Count contiguous live bearing runs separately and weight partially damaged bonds.
- [x] Create src/bearing-lab/world.js. Replace original-relative detach gates, release unsupported components, hinge eccentric failures and crush a short bearing strip on centered overload. Reuse existing body budget, collision and conservation paths.
- [x] Create src/bearing-lab/maps.js and main.js: paired and individual specimens, centered and heavier comparison, explicit load-start button and readable initial utilization. Keep attack experiments usable afterward.
- [x] Add vite.bearing.config.js, build/test scripts and --bearing publishing target. Run node tests and build. Inspect desktop and mobile UI and load-start behavior.
- [ ] Publish only new URL and verify Cloudflare build plus public UI. Independent review completed; no blocking findings.

## Acceptance commands
```sh
cd demos/planet-patchup
npm run test:bearing
npm run test:support
npm run test:motion
npm run build:bearing
```
Expected: all tests pass, standalone dist-bearing/index.html produced. Existing public paths have no diff.
