# Arch column-load correction

Approved behavior: a heavy facade leaning on one long narrow post must be able to buckle/break that post. Retain initial tipping, gravity, inertia, pixel conservation, attack tuning and economy. Apply only to the current Arch campaign; archive editions remain unchanged.

Root reproduction: a starter shot at Arch Lane's first preview point left a 707-pixel rigid compound leaning at 0.76057 radians for 30 seconds. A floor and neighbouring static structure held it in place; its old internal load reading was only 0.37. Starting rotation alone was insufficient.

Implementation:
- [x] Add regression covering the actually loaded long leg, rather than accepting any hinge release as a successful collapse. Confirm it fails with the new column model disabled.
- [x] Trace each candidate lower section to actual floor/contact/hinge support pixels. Hanging columns cannot contribute bearing capacity.
- [x] Calculate live vertical column spans and remaining widths. Game-scale axial capacity is 180000 × sum(width³ / length²); bending capacity is 1200 × sum(width²). Add axial and bending utilization and retain the older load test as a lower bound.
- [x] Keep overloaded hinges checking their internal shaft as well. After existing strain delay, split the supported shaft near its midpoint, preserving child-body momentum. This avoids repeatedly shaving pixels from its grounded tip.
- [x] Verify intact eight-map catalog, both tipping directions, thin/thick and short/long columns, free fall, hanging legs, pixel conservation and legacy structural tests: 78 focused tests passed, followed by all six column-specific tests including two added support-path cases. Legacy free tests: 65 passed; site route tests: 5 passed.
- [x] Build and verify browser gameplay: Arch Lane, starter explosion on the left post; remaining shaft splits and facade descends separately. Browser console has no warnings/errors. Screenshot: artifacts/arch-column-load-2026-10-26/browser-column-break.png in the sand workspace. Only current free edition and its canonical play route are rebuilt.
- [ ] Publish and verify the current free edition.

This is a game-scale fracture approximation, not elastic beam deformation or a full finite-element solver. Side contacts may still hold a sufficiently short/strong remaining piece; the goal is load-dependent breakage, not forced destruction of every leaning body.
