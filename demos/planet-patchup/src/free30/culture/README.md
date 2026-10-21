# Reusable culture map kit

`kit.js` paints original destructible grid cells from reusable pieces: `roof`, `post`, `wall`, `masonry`, `crate`, and `rubble`. Coordinates and dimensions are integer grid units. The same roof/post code builds the workshop, gateway and shed in `tile-yard.js`; these are not separate baked images.

`jointedRoof` is a second roof variant: tile packs share a one-cell lintel rather than a solid slab. `maps.js` combines it with exposed legs, upper-floor walls and racks. The original `roof` and `tile-yard` geometry are unchanged. This avoids changing global explosion strength or fracture settings just to make early maps responsive.

To author another layout, instantiate `YardKit(width, floorY)`, place its pieces, then use `packMapCells` and `validateSite` as in `tile-yard.js`. Keep every occupied component connected to the fixed floor. Materials are palette IDs 1–5; 0 erases cells. `rect` rejects out-of-bounds geometry. Check the physical pixel budget as well as visual density.

`art.js` adds stable per-origin surface colors so grain and tile joints travel with broken fragments. The backdrop is decorative; only the flat floor matches collision geometry. Do not paint foreground terrain that suggests a physical ledge unless collision support is added too.

Open `free30.html?artMap=tile-yard` locally, or `?artMap=tile-yard` on the published free demo. This is a separate unlimited-battery preview with ephemeral progression. Existing campaign maps and saves are unchanged. The download button exports editable geometry for the existing map editor. The editor currently uses its standard material palette; this culture-specific surface/backdrop is selected by the art-preview route.

Verified: 7,859 physical pixels, 95 packed rectangles, grounded connectivity, editor JSON round-trip, bomb and black-hole simulation with pixel conservation. Full release checks: 50 physics tests, 31 input cases, 66 free-demo tests and production build. Desktop browser inspection covered full/close views, tools, collection, and footer layout. Real-phone performance and campaign balance still need playtesting.

## Seven-map pack (2026-10-22)

Start at `?artMap=yard-01`; the bottom map selector contains all seven new layouts plus the original comparison. Every map uses the same base tool stats and unlimited battery, with ephemeral progression. This pack is not yet the campaign replacement or a validated 30-minute progression curve.

| Key | Map | Physical pixels | Packed rectangles |
| --- | --- | ---: | ---: |
| yard-01 | 처마 골목 | 1,135 | 47 |
| yard-02 | 고철 장터 | 2,139 | 86 |
| yard-03 | 마른 수로 다리 | 2,407 | 87 |
| yard-04 | 기와 적재소 | 4,739 | 217 |
| yard-05 | 맞붙은 공방 | 6,995 | 159 |
| yard-06 | 바람 문루 | 7,999 | 214 |
| yard-boss | 쌍처마 대공방 | 11,770 | 230 |

`tests/culture-pack.mjs` verifies grounded geometry, increasing budgets, JSON editor round-trip, campaign isolation, finite simulation and pixel conservation for both tools on every map. A targeted base blast must detach more than its direct erasure area. Browser QA covered the selection dialog, switching maps, Escape/resume and first-map/boss blast input. Release checks now total 50 physics tests + 31 input cases + 68 free-demo tests. These checks establish functioning maps, not subjective fun or mobile performance.
