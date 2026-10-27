# Collapse chain lab

Approved scope: make the existing local collapse mini-map feel like a readable cascade after a well-placed attack. Public maps, progression and shared physics stay untouched.

## Design

Three options considered: increase every explosion; use timed secondary explosions; amplify real collision fractures along the attacked structure's descendants. Use the third so aiming, falling and placement still determine the chain. Add an explicit original/chain comparison selector.

Only a real attack arms connected material. Strong closing collisions propagate that attack's chain to the touched structure. A bounded fracture budget opens irregular internal seams and releases collectible pixels while preserving surviving chunk motion. Repeated contact with the same structure pair must not inflate the chain. Resting contact, air clicks, and tiny slow debris cannot start one. Original gravity, tool energy and blast footprint remain unchanged.

Show chain stage near the impact, a short expanding outline and compact chain summary. Keep effects pause-aware, bounded, and separate from physics. JSON exports identify the experimental model and chain events. Default the local UI to chain mode while model callers retain the original by default.

## Execution

- [x] Add tests for real two-stage propagation, increased collectible material, idle safety, ledger conservation and original-mode parity; verify failure first.
- [x] Implement a lab-only JointedArchWorld subclass and pass the comparison mode through createExperiment.
- [x] Add selector, bounded impact effects and chain summary/export in the local page.
- [x] Replay all three maps with both presets; run existing campaign regressions and local build.
- [x] Verify controls and rendered collapse in the browser, save evidence and leave a fresh local test open.

This is a gameplay experiment, not a claim of scientifically conserved fracture energy or final balance. Arcade amplification is explicit and limited to this lab. No network deployment.

## Verification

47 focused/campaign tests passed after the final code change; Vite local build passed with the existing Phaser chunk-size warning. All six fixed-step chain runs preserved pixels and finite motion. Desktop browser replay verified all three maps, original/chain switching, pause and visible impact labels. Evidence: `/Users/roy/Developer/sand/artifacts/collapse-chain-2026-10-27/chain-scene.png`; measurements in the adjacent `report.json`. Public runtime files were not changed or deployed. Phone performance remains untested.
