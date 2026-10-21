# Reusable culture map kit

`kit.js` paints original destructible grid cells from reusable pieces: `roof`, `post`, `wall`, `masonry`, `crate`, and `rubble`. Coordinates and dimensions are integer grid units. The same roof/post code builds the workshop, gateway and shed in `tile-yard.js`; these are not separate baked images.

To author another layout, instantiate `YardKit(width, floorY)`, place its pieces, then use `packMapCells` and `validateSite` as in `tile-yard.js`. Keep every occupied component connected to the fixed floor. Materials are palette IDs 1–5; 0 erases cells. `rect` rejects out-of-bounds geometry. Check the physical pixel budget as well as visual density.

`art.js` adds stable per-origin surface colors so grain and tile joints travel with broken fragments. The backdrop is decorative; only the flat floor matches collision geometry. Do not paint foreground terrain that suggests a physical ledge unless collision support is added too.

Open `free30.html?artMap=tile-yard` locally, or `?artMap=tile-yard` on the published free demo. This is a separate unlimited-battery preview with ephemeral progression. Existing campaign maps and saves are unchanged. The download button exports editable geometry for the existing map editor. The editor currently uses its standard material palette; this culture-specific surface/backdrop is selected by the art-preview route.

Verified: 7,859 physical pixels, 95 packed rectangles, grounded connectivity, editor JSON round-trip, bomb and black-hole simulation with pixel conservation. Full release checks: 50 physics tests, 31 input cases, 66 free-demo tests and production build. Desktop browser inspection covered full/close views, tools, collection, and footer layout. Real-phone performance and campaign balance still need playtesting.
