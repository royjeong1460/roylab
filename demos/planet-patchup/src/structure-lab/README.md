# Tall structural experiment

URL: `/games/planet-patchup-structure/?artMap=layout-tall`.
The existing tilt URL and all previous published bundles remain unchanged.

The exact 4,538-pixel tall art is partitioned into six pillars, three bodies and three roofs. Pixel IDs retain their owner through fracture. Neighboring modules are welded together until actual pixel bonds fail; modules are not loose independent rigid bodies before failure. “구조 구분” draws colored outlines of the surviving parts.

Pillar rows are checked for remaining vertical bond width; widened foundation feet are excluded. Gravity load uses surviving overhead pixels and lateral center-of-mass offset, with width-squared bending resistance. Reference axial budget is 1,800 pixel-equivalents/cell; bending budget is 7,000 per squared cell. These are gameplay coefficients, not material engineering units. Static checks run twice/sec, moving checks ten times/sec.

An overloaded attached section briefly yields on a hinge before its joint snaps. Existing 1→10 over10s tipping assistance preserves real inertia and stops on detachment/contact. Moving compounds that are supported from below can fracture internally at pillar sections. A roof touching the ground bypasses pillars beyond that contact, preventing ongoing tip shaving after landing. Unsupported free fall does not accumulate gravity stress. Impact fracture remains the previous shared algorithm. Surviving anchored children retain joint fatigue through an attack rebuild; detached children do not.

Existing independent-fragment conversion handles the18-body budget. Resulting fragments inherit momentum; no random force is added to simulate a snap. Settings have a separate `planet-patchup-structure-` namespace.

Validation: `npm run test:structure` (module coverage, intact/thinned/loaded supports, free fall, dynamic supported fracture, actual bomb/blackhole, conservation/body cap, initial gravity overload, rebuilt hinge fatigue). Original tilt/bearing/support/motion/boundary regression suites:32 pass. Desktop and390×844 browser layout checked; physical iPhone feel/performance needs user replay.
