# Motion-aware Arch column fracture

User approved refining the existing fracture rule so blast recoil and gravity can play out, without a hard-coded midshaft cut. Scope: current Arch campaign only; preserve attack/economy/gravity/inertia and archived builds.

- [x] Reproduce a starter shot near the facade/post join: (12,103) produces an internal cut at row121 from a row140 load check, then another midshaft cut. Capture baseline under sand/artifacts/arch-column-motion-2026-10-27.
- [x] Replace forced midpoint cuts with actual pillar-to-body connections or damaged narrower sections. Do not choose uniform ground-tip rows as internal bending failures.
- [x] Keep signed bending demand, track strain per selected section and relax accumulated bending strain when the facade swings back toward balance. Axial overload and collision fracture remain possible; no artificial motion reversal or immunity to impact.
- [x] Add failing tests for connection/neck failure location, brief recoil and reversal, sustained overload, and actual map1 replay; retain pristine-map/free-fall/conservation regressions.
- [x] Build and exercise the browser: Arch Lane, shot just below the left facade; long remaining leg separates at the head joint rather than midshaft. No browser errors/warnings. Screenshot in sand/artifacts/arch-column-motion-2026-10-27/browser-joint-break.png.
- [ ] Publish only the current free build and verify the live bundle.

This remains a game-scale rigid-body fracture approximation. Elastic bending/deformation is out of scope. Existing collision breakage remains independent from the slower supported-load rule.

## Verification

- Before implementation, three new tests failed: intact-joint location, damaged-neck location and brief recoil survival. A fourth regression exposed a stale fracture event position and was fixed.
- 88 Arch/structure/tilt tests passed; then all 9 motion-fracture tests passed after adding a real map-1 blast replay. Legacy free suite: 65 passed. Route suite: 5 passed. Vite build passed with the existing large-chunk warning.
- Same shot (12,103): previously internal cuts at rows 121 and 110; now one at the actual facade/post interface, row 101. Gravity, attack/economy values, mass and inertia are unchanged.
- Structural strain follows signed bending direction and uses measured angle change between checks. Swinging back toward balance relaxes bending strain; axial overload remains eligible. Reversing direction or switching the loaded section does not transfer an old section's strain.
- Fracture-location selection prioritizes an existing weakened cross-section, otherwise the upper body/post joint. This is an authored game approximation, not a finite-element stress solver. It does not simulate elastic bending.
