# Culture map pack implementation plan

Goal: expand the approved reusable dry tile-yard art direction into six normal layouts and one boss layout, preserving existing maps, saves and physics. User feedback: the initial large workshop was too inert for an early map. Improve demolition response through smaller loads, open lower bays, exposed narrow supports and collision space.

Architecture: reuse YardKit and FreeRun in the isolated artMap preview route. Add authored layouts in culture/maps.js and an accessible thumbnail selection dialog in culture/preview-ui.js. Keep tile-yard-v1 unchanged and available for comparison. No new dependencies or global weapon/physics tuning.

1. Add tests for seven unique validated maps, editor round-trip, original preservation, increasing pixel budgets, finite physics/pixel conservation and visible collapse after a targeted opening blast. Run missing-module failure before implementing maps.
2. Compose roofs/posts/crates into: eave alley, scrap market, dry channel bridge, tile warehouse, adjoining workshops, gatehouse, twin-eave boss. All actual geometry is grounded. Early maps use thin exposed supports; upper walls never create hidden ground-reaching supports. Every map stays below 20,000 cells and 240 packed rectangles.
3. Make backdrop dimensions relative to the current floor; keep the original 192-by-156 appearance. Add a preview selector, original comparison entry, active map name/hint and per-map JSON export. Preview profiles remain ephemeral with both tools, base stats and unlimited battery so maps are compared under the same conditions.
4. Run actual targeted blast and black-hole simulations, inspect all map thumbnails and representative near/full browser views, build release and publish to the existing Roylab demo. Do not claim 30-minute balance or real-device performance validation.

Checks: node --test tests/free30-culture.mjs, npm run build:game -- --free, git diff --check, browser selection/retry/download and public deployment verification.
