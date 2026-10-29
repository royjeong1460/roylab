# Approved start design

Current source: approved desert V2 world map and 2026-10-28 mobile composition (`planet-desert-v2-2026-10-27` / `planet-home-composition-v1-2026-10-28`).

- The bundled `assets/desert/worldmap.png`, six landmark sprites and rubble replace the earlier green/blue world map. The approved geography, centered hubs and turn-speed limits are retained.
- A 390 × 844 mobile composition keeps the desert globe central, with two smaller distant planets and five slow orbiters that disappear behind it. Reduced motion stops orbit animation.
- Title/options, selected region, arrows/dots, Enter, Upgrades and Regions keep their existing campaign actions. Full Game and Map Maker are available in Options.
- Selection is by buttons, as approved in V10; no globe drag or wheel interaction.
- Arch Quarter remains the first/free campaign. Its art and geographic anchor use V10's Arch region (index 1); Eave Alley follows it. No stage IDs or save keys change.
- Other five regions retain their access locks and unknown labels. The Full Game dialog is information only: no checkout or fake unlock.
- Saved restoration still brightens each region's same desert geography and reduces its rubble. A separate green/water restored texture is not authored in this version. No fake progress or URL preview clear flags are included.
- Existing Enter/map list, separate tutorial, upgrades, settings, journal export and Map Maker use the campaign's existing elements/handlers. Map Maker moves into Options (also remains in the map list).
- Physics, attack values, balance, HUD, maps and journals are unchanged by this design port.

`home.js` owns the UI adapter; `regions.js` maps read-only progress into display state; `globe.js` renders on image load, selection or progress changes. `orbit.js` manages scenery animation only. The world texture is bundled by Vite; there are no runtime Figma or image-service dependencies.

The existing Galmuri11 font is distributed under `OFL.md`. Original V3 `globe-math.js`/`terrain.js` are retained as the previous design reference and are not imported by the current home.

Checks: `node --test tests/arch-planet-home.mjs`, `npm run test:arch`, `npm run test:free`, `npm run build:free`. Real iPhone verification remains a separate playtest.
