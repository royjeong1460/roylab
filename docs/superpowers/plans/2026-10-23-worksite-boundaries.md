# Ideas lab worksite boundaries

User approved separating visible screen edges from physical side boundaries.
Apply only to the ideas edition; preserve the published free/paid editions.

- Expand each side of the simulation grid by max(64, floorY + 16) cells,
  capped by the engine's 1024-cell dimension limit. Translate all source shapes
  and preview points together. Pixel budget, height, and floor height stay fixed.
- Leave the normal floor and safety walls at the new outer grid bounds so grains
  remain collectable. There must be no collision at the original map edges.
- Start the camera fitted to the original worksite, not the new empty margins.
  Existing pan, zoom, minimap and aim bounds use the full expanded world.
- Add an optional initial viewport hook to the test-edition boot path. Exported
  map JSON and picker thumbnails continue to use the original authored map.
- Test source immutability, geometry/count preservation, camera access, actual
  fragment movement across both old edges and collection outside the old bounds.
- Run ideas/free tests, build only ideas, verify UI and publish to Roylab.

Limit: extreme launch distances can still reach the far safety boundary. This
is a finite apron for collapse testing, not an infinite or automatically expanding map.

Verification: 31 ideas tests (including 4 boundary tests), 63 free tests, and
ideas build passed. Independent code review found no actionable issue. Browser
checks show original-scale initial view, expanded whole-floor/minimap, attack
input and mobile-size boot without console errors. Real iPhone performance and
two-finger input have not been re-tested. All 31 published free/paid/blast files
were compared byte-for-byte with HEAD and are unchanged.
