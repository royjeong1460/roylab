# Free30 Mobile Home Implementation Plan

**Goal:** Apply the approved saved mobile alley design to the existing Free30 start flow.
**Architecture:** Separate home art and layout from the existing journey controller. Retain DOM IDs and move secondary content into native dialogs. Existing storage and game rules remain unchanged.
**Tech Stack:** HTML, CSS, Canvas, Vite; existing Phaser gameplay.

## Constraints
Mobile portrait composition, maximum 480px wide, existing free-save keys, no physics changes. Keep legacy demos intact. No new packages.

## Tasks
- [x] Add `src/free30/home.js`, `home.css`, and copied procedural `pixel-alley.js` / `robot-puff-art.js`. Draw only on resize/show, not every frame.
- [x] Restructure `free30.html`: Start/Upgrade/Zones home; options and zones dialogs retain stats, practice, reports, boss, and next-region IDs. Add named dialog headings and close buttons.
- [x] Connect home initialization in `main.js`; preserve tutorial routing, show Start caption from existing profile, close all dialogs on navigation.
- [x] Add a targeted regression that exercises home/options/zone navigation and confirms dialogs close before workshop/game changes. Run `npm run test:free` and `node tests/battery-input.mjs`.
- [x] Browser verify mobile-width title/menu visibility, zone boss entry, options/practice, upgrade/return, fresh tutorial and console errors. Save a screenshot.
- [x] Build using root `npm run build:game -- --free`, review the diff, commit and publish through the existing Roylab pipeline, verify live page.

## Validation

- Free30 regression suite: 20/20; legacy game cases: 50/50; input/viewport cases: 28/28; production game build passed.
- Browser: options/practice, zones/boss, settlement/workshop/home round trip; no captured browser errors. 390×844 and 320×568 layout inspected; short screens scroll.
- Independent code review: no actionable issues.
- Actual iPhone touch/visual testing remains with the user.
- Publication is the final deployment step; live verification recorded after deployment.
