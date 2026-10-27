# Local falling-body fracture comparison

Approved scope: keep the existing 10× selective chain reaction, gravity, tools and public game unchanged. Add a separate local page where low drops chip the contact surface and strong drops fracture the body internally into several independently moving chunks.

Implementation:
1. Reproduce controlled 360-pixel body drops at 4, 20 and 70 cells; write failing physical-result assertions.
2. Add an isolated ChainArchWorld subclass. Use measured collision energy and downward contact velocity; chain-qualified hits retain the original path. Allocate strong fall impacts primarily to coherent internal cracks, with bounded fragment count and inherited motion.
3. Add a local comparison page with both algorithms, the three existing collapse maps and controlled drops. Show impact speed, dust and chunk results; support JSON export.
4. Verify conservation, settling, unchanged chain behavior, actual browser operation and a separate build. No public release.

Limits: a gameplay fracture approximation, not a material engineering solver. Desktop checks do not establish iPhone performance or final balance.

Implemented in isolated `src/collapse-fall` and `collapse-fall.html`; original physics and public game source unchanged. Red tests reproduced low-drop no damage and missing internal fracture. New drop, unchanged chain, rest stability and material conservation checks pass (21 combined tests); separate Vite build passes. Controlled drop evidence and user-facing behavior are documented in `src/collapse-fall/README.md`.
