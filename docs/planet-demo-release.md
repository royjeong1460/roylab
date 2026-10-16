# Planet Patchup demo · 2026-10-16

Release route: `/games/planet-patchup/` on the existing roylab Cloudflare Pages site.

Scope: free-step1 random sites, persistent upgrades, manual twin-peak boss entry, 70% recovery; battery and all three tools retain current rules. Presentation follows Figma node 6:11 with dust-alley colors, procedural scrap surfaces, recovery/battery HUD, and three bottom tool buttons. Prototype comparison routes are not in the public release.

Verification before deployment:
- Original free-step1 regression: 35 tests passed; configured boss simulation recovered 3838/5480 in 55.53 simulated seconds (not human completion time).
- Standalone demo regression: 35 tests passed, including demo control-ID contract.
- roylab locale tests: 2 passed.
- 390×844 and 320×568 desktop-browser viewport checks: HUD and tools visible; no browser console errors. Manual cutter action spent energy and recovered pixels; pause/resume, finish/result, same-site retry worked.
- Next static export and standalone Vite build checked. Phaser retains bundle-size warning; inherited game source has six unused-variable lint warnings, no lint errors.

Limitations: no physical iPhone test performed in this deployment task. Touch gestures, sustained FPS, heat, Safari storage and safe-area behavior need real-device validation. The 20–30 minute first-clear goal is not proven by the scripted boss test. No ads, payment, analytics, accounts or backend saves.
