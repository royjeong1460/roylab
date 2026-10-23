# Mobile tutorial 2 implementation plan

**Goal:** Separate playable tap-at-contact edition, retaining original published builds and saves.
**Approved interaction:** One finger down/up detonates at the contact point; a second finger before release cancels the attack and controls the camera. PC stays unchanged.
**Architecture:** Reuse free campaign via edition entry. Opt-in contact coordinates in shared input, existing deferred-tap cancellation and 12px drag threshold. Store progression under a tutorial2 prefix. Hide mobile aiming cursor but retain automatic suction ring/effects. No extra fuse delay for confirmed mobile taps.
**Tech:** Phaser / Matter / Vite, native Pointer Events.

- [x] Test contact coordinates, no down/hold/double-up attack, two/three fingers and cancellation, drag collecting, PC immediate press. `node tests/battery-input.mjs` must first fail for missing contact option.
- [x] Add `touchAtContact=false` option to `src/battery-input.js`. Return unshifted world coordinates for enabled touches; keep old default and pinch/release state machine.
- [x] Add separate edition entry/config and namespaced storage. Test new journey writes leave original keys unchanged, immediate mobile bomb resolution conserves pixels and leaves PC delay unchanged.
- [x] Wire input, cursor visibility, tutorial/tips, home label and links in shared free main behind opt-in edition flag. Update renderer and tool overlay optional flags, preserving effects and original defaults.
- [x] Run input, new mode, free and mobile presentation tests; build new edition and check desktop/mobile viewport. Publish only `/games/planet-patchup-tutorial2/`; Cloudflare/public verification remains the release step. Physical iPhone gestures require user replay.

## Verification
- Input: 33 cases passed, including fast swipe release displacement regression (observed failing before fix). Edition: 3 passed. Existing free: 63 passed. Base suite: 50 passed plus input cases and reachability fixture.
- Vite production build and git diff whitespace checks passed. Browser: fresh profile, map menu, tutorial PC attack (battery 60 to 48), collapse/collection guide, pause/resume and corrected help, editor links, 390px viewport checked. No browser console errors observed.
- Read-only review identified final-release swipe handling; fixed and regression tested. Old public routes are byte-unchanged. Actual iPhone touch/pinch remains user playtest.
