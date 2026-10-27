# Selective collapse chain controls

Approved in conversation: apply the proposed rare cross-structure cascade rule and make its strength adjustable in the existing local mini-map. Public physics and progression remain unchanged.

Design: retain original gravity, Blast/Black Hole stats and ordinary collision damage. Only a moving, attack-linked chunk of at least 64 pixels that strongly contacts a different original structure can amplify a chain. Exclude floor and same-structure contacts. Require at least 12 cells/s closing speed and 1.2 contact energy; a moving source must supply positive approach velocity. Each newly reached structure inherits depth from its source; repeated pair contacts or branches cannot inflate depth.

One visible control: starting fracture-work multiplier 0–30, step 0.5, default 6. Zero bypasses the assist entirely. Subsequent depth retains the existing 25% growth. Range and number input stay synchronized, presets offer 3/6/12/30, current setting survives map/reset and local reload. Changes apply to future impacts without resetting the current scene. Export includes settings and time-stamped changes. Original mode disables the control. No force, camera, terrain or economy changes.

- [x] Tests in `tests/collapse-chain.mjs`: reject floor/self/tiny contacts; preserve real propagation, ledger and original parity at zero; live adjustment cannot reset the run or change weapon stats. Run and observe failures before implementation.
- [x] `src/collapse-lab/chain-world.js`: selective contexts and source/target depth, validated `setChainPower`; `model.js` optional fifth power argument. Run focused tests and measure 0/6/30 on three maps.
- [x] `collapse-lab.html`, local CSS and `main.js`: accessible slider/number/presets, private lab storage, input validation, settings history export; unchanged reset semantics. Verify rendered controls, pause/live adjustment and reload persistence in the browser.
- [x] Update local README/report version. Run focused and campaign tests plus local Vite build; save browser evidence and leave the lab ready at 6×.

No deployment. Previous v1 measurements remain historical; selection thresholds and 6× are initial playtest values, not measured rarity targets or final tuning.

Verification: 50 focused/campaign tests pass; local Vite build passes with the existing Phaser chunk-size warning. All 24 measured runs (three maps × two weapon presets × four chain strengths) preserve material and finite motion. Browser confirms number/slider/preset sync, live scene preservation, reload persistence and original-mode disabling. Local artifacts: `/Users/roy/Developer/sand/artifacts/collapse-chain-controls-2026-10-27/`. No shared campaign source or public deployment changes.
