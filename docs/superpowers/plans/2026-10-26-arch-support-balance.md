# Arch support balance correction

User-approved behavior: a facade that loses one post must start tipping when its center of mass leaves its remaining support footprint. Post strength determines subsequent fracture, not whether gravity is allowed to start rotation.

Scope: current Arch campaign only; retain previous comparison builds. Keep gravity, time scale, attack stats, upgrade costs, collection and map geometry unchanged.

- [x] Reproduce the missing tipping behavior on both sides of Arch Lane before changing production code.
- [x] Enable a balance check on ArchWorld. In the shared structural static evaluation, find a cross-section that is overloaded OR whose center lies outside its support footprint by the existing 0.1-cell support margin.
- [x] Reuse releaseBody, attachHinge, gravity rotation and existing overload/angle release. No additional impulse, forced timer fracture or continuous rotation motor.
- [x] Verify pristine maps, both tipping directions, unobstructed fracture, real starter explosion, pixel conservation and legacy structural behavior.
- [x] Build the free edition, verify browser behavior, publish only the current free assets and retain comparison assets.

Known physical constraint: an actual world wall or other supported structure may stop a released facade before its hinge breaks. This fix does not remove those contacts.

Validation: 74 Arch/structure/tilt tests, 65 legacy free tests and 5 route tests passed. Free production build passed (existing Phaser chunk-size warning). Local browser starter shot on Arch Lane visibly released and tilted the facade. Real iPhone feel remains unverified.

Deployment: Cloudflare Pages completed 5398ee0 successfully. Live /planet-patchup/play/ loads free30-C7wLM39X.js and initializes with no browser warnings/errors. Only the current free route HTML/assets changed; historical comparison outputs are unchanged. Browser proof: /Users/roy/Developer/sand/artifacts/arch-support-balance-2026-10-26/one-post-collapse.png.
