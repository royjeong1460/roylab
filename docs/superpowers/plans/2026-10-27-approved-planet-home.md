# Approved V10 start screen integration

User requested the confirmed 픽셀디자인 start screen in the current free build.

Design authority: 픽셀디자인 chat `01a133f9-e39b-7123-823a-bbbf136f8b18`, latest V10 local prototype and README. Existing approval covers the dark compact home, two continents, centered region rotation, concealed regions and cultural cleanup landmarks. No new design proposal is needed.

Scope: port original art/rendering into the Arch home adapter; keep Arch free and first, connect cleanup to the real boss clear, preserve existing map/tutorial/settings/upgrade handlers. Full Game remains informational. Do not change gameplay, physics, balance or saves.

Validation: projection/turn limits, region access vs cleanup, load-before-save race, reset rendering, rapid reselection, no redraw on unchanged profile; existing Arch/free suites; local mobile and desktop render plus navigation; free build/root build; publish and verify canonical URL.

Completed implementation checks: 4 new home tests, all 101 local Arch tests (including 12 local-only diagnostic tests), 65 legacy free tests and 5 root route/catalog tests passed. Vite free build passed. Browser: 390×844 rendering, hidden region with disabled entry, Full Game informational modal, existing map list/tutorial, upgrades, Options/Map Maker, and actual Arch Lane entry verified. No browser console errors. Desktop home geometry is 390×844 centered. Evidence is in `/Users/roy/Developer/sand/artifacts/planet-home-v10-integration/`. Actual iPhone playtest and real purchased-region access are not claimed.
