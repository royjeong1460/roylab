# Map shape comparison

Approved scope: three playable maps in the existing ideas lab. Joystick deferred;
five automatic and five manual auxiliary skill concepts are discussion only.

Use the existing YardKit, surface art, physics, camera and power settings. Keep
the seven culture maps and original yard. Publish only the ideas edition.

1. Add an isolated map catalog: wide demolition street (256×128), vertical
   storage tower (112×256), open multi-height yard (240×240). Expose weak supports,
   keep initially grounded cells, and keep pixel budgets within 25% for comparison.
2. Let the existing picker accept an optional catalog/title/note. Ideas passes
   the three new maps first, with dimensions in their labels. Paid defaults stay.
3. Verify map validation, editor JSON roundtrip, aspect ratios, pixel budgets,
   blast-induced collapse, finite physics and pixel conservation for both tools.
4. Build only ideas. Check desktop/mobile picker and camera, publish and open
   the public wide-map link. Device feel remains the user's playtest.

Verification: 27 ideas tests and 10 paid/culture tests passed. Production ideas
build passed. Browser: picker lists all 11 maps, tall map responds to explosion,
open map loads at 390×844 and overview toggles to close view. 844×390 was also
inspected; landscape retains the existing vertically scrollable lab footer.
No new orientation layout or joystick work. No real-device touch test performed.
All 31 published free/paid/blast files match HEAD byte for byte.
