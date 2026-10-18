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

## Touch apron update

Free-step1 and its public demo now reserve a 32 CSS px right apron and 64 CSS px bottom apron on narrow/coarse-pointer screens. Touches can begin and continue there; map bounds are tested with this bounded allowance before nozzle offset. Tool buttons remain outside the capture surface. Mouse behavior and other prototype routes retain their previous bounds. Input regression: 23 cases passed, including letterbox edges, touch apron start/re-entry, out-of-range stop, and discrete-tool pinch cancellation. Physical iPhone retest remains required.

## Full-width touch update — 2026-10-18

The reserved right/bottom touch apron has been removed from the free-step1 and public demo layouts. The field now keeps its full width and original available height. Near the visible map right/bottom edges, the touch offset smoothly eases to zero (64/96 CSS px transition); the nozzle meets the finger at the edge. Visible bounds consider camera zoom/pan and fitted map padding. No new UI controls or balance changes. Input regression: 25 cases passed; original free-step1 suite: 35 passed plus configured boss replay; demo DOM/layout contract: 2 passed. Physical iPhone feel remains to be verified.

## Blast-first comparison — 2026-10-18

- New independent public route: `/games/planet-patchup-blast/`; original `/games/planet-patchup/` release and source remain unchanged.
- Local prototype: `/blast-step1.html`. Persistent namespace and Web Lock: `pixel-demolition-blast-step1-v1`; `?qa=1` uses a further isolated test namespace.
- Bomb initially equipped/owned. No cutter in equipment, purchases or HUD. Black hole unlock costs 600 parts (comparison value, not a validated pacing target). Bomb range starts at 3, costs 120 +90/level; bomb force costs 100 +80/level. Existing small battery/suction increments, 70% target, auto collection and 10-second cleanup retained.
- Latest Figma: file `dEvvNjaFdv03v2MvzaU88r`, board `165:2`, mobile frame `165:9`. Editable HUD geometry/colors used: 60px top, 28px bottom. The building image in Figma is explicitly reference art; the game continues to render its dynamic destructible buildings and existing dust backdrop. No screenshot baked into gameplay.
- Two tools, current tool energy/range description, map-fit and return live in pause menu. Tool changes leave simulation paused. Footer identifies the active tool and how to use/change it.
- Separate Vite config/output prevents the comparison CSS from affecting the original release. Rebuild with `node scripts/build-planet-demo.mjs --blast`; omit `--blast` for the original.
- Verified: 45 portable Node tests +25 input cases; original 35 tests and configured physical boss replay; actual bomb/black-hole physics preserve pixel accounting. Browser: 390x844 field 390x756, 320x568 field 320x480, no horizontal overflow; blast consumes energy, creates debris and collection; pause, return/result and shop render.
- Max-upgrade boss reachability fixture: bomb-only 13 shots, 3837/5480 recovered, 24 battery remaining; this verifies reachability, not human pacing.
- Not verified: physical iPhone touch/heat, first-3-minute enjoyment, or 20–30 minute pacing. Figma tool selection was unspecified; it is accessible through pause for this experiment.

## Blast mobile collection and camera — 2026-10-18

- Collectible loose sand and flying grains use a steady mint face/darker rim. Solid chunks retain their original surface. Rendering only: no physics or pixel-accounting changes.
- Opt-in touch input aims while dragging and fires once at the actual release position. Mouse down stays immediate; a second touch cancels the pending shot before camera pan/pinch. Legacy input defaults are preserved.
- Blast maps gain 50% width through symmetric side space, retaining building geometry, pixel count and IDs. Initial camera uses 6 CSS px/cell and shows the first support; upper-right minimap toggles overview/close view. Two-finger pan/pinch and PC right-drag/wheel remain available.
- Finishing a run now settles into the workshop with a receipt. Upgrade cards show levels, before/after values, use cases, price and shortage. Bomb upgrades and black-hole unlock appear first. Save keys and prices unchanged.
- Verified: 50 portable tests, 27 input cases; max-upgrade boss replay recovered 3840/5480 with 13 shots and 24 battery remaining. Desktop browser at 390x844 and 320x568: full-width field, larger pixels, minimap toggle, visible mint debris, mouse blast, manual return, 10-second cleanup into workshop and same-site retry. Physical iPhone release/pinch/heat still needs device retest; these gesture paths have automated input coverage.
- Only blast public assets are rebuilt. Original public demo remains unchanged.
