# Approved start design

Source: 픽셀디자인, 2026-10-27, `variants/demolition-mvp/design-board/planet-home-v10-2026-10-27`.

- Original two-continent `worldmap.png`, projection/turn timing, pollution, smooth territories and six cultural dot-art renderers are reused locally.
- Compact dark mobile start: title/options, selected region, central rotating globe, arrows/dots, Enter, Upgrades, Full Game.
- Selection is by buttons, as approved in V10; no globe drag or wheel interaction.
- Arch Quarter remains the first/free campaign. Its art and geographic anchor use V10's Arch region (index 1); Eave Alley follows it. No stage IDs or save keys change.
- Other five regions conceal their names and landmarks with `?` and fog. The Full Game dialog is information only: no checkout or fake unlock.
- Actual `profile.bossCleared` restores the Arch region and its cultural landmark. Resetting campaign progress restores pollution. The prototype's URL preview flags, clear/unlock toggles and fake map results are not included.
- Existing Enter/map list, separate tutorial, upgrades, settings, journal export and Map Maker use the campaign's existing elements/handlers. Map Maker moves into Options (also remains in the map list).
- Physics, attack values, balance, HUD, maps and journals are unchanged by this design port.

`home.js` owns the UI adapter; `regions.js` maps read-only progress into display state; `globe.js` renders only when selection or progress changes. `projection.js`, `pollution.js`, `territories.js` and `district-art.js` retain the approved prototype math/art. The world texture is bundled by Vite; there are no runtime Figma or image-service dependencies.

The existing Galmuri11 font is distributed under `OFL.md`. Original V3 `globe-math.js`/`terrain.js` are retained as the previous design reference and are not imported by the current home.

Checks: `node --test tests/arch-planet-home.mjs`, `npm run test:arch`, `npm run test:free`, `npm run build:free`. Real iPhone verification remains a separate playtest.
