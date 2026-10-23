# Damage-dependent support release comparison

User-approved scope: keep gravity and visible tilting; a badly broken support
should let go sooner. Preserve the current ideas lab and all game editions.

- New `/games/planet-patchup-support/` entry subclasses IdeaWorld only.
- At each hinge, retain original vertical bearing pairs across its release row.
  Count upper pixels still belonging to the fragment and lower static cells still
  present. Do not count released rigid-body material as missing pixels.
- Release angle = existing hinge angle × (0.24 + 0.76 × remaining fraction²).
  With default tuning: intact 28.6°, half remaining 12.3°, very thin near 6.9°.
  An erased anchor still releases immediately via the existing check.
- Keep gravity, inertia, air friction, stiffness, damage and velocity limits intact.
- Isolate settings; snapshot the original lab settings on first use when available.
  Include a link to the same map in the original lab. Start on the tall map.
- Verify partial support, additional damage, inherited hinges, unchanged free
  fall, tall-map release timing, conserved pixels, UI and published-file isolation.

This models joint weakening for gameplay; it is not a material stress solver.

Verification: support tests 8, ideas tests 31, free tests 63 pass; build passes.
Same tall-map normal blast: hinge release 4.63s / ~28.5 degrees before,
4.03s / ~11.8 degrees after. Unconnected free-fall position/velocity identical.
Browser attack, tilt and collapse checked; 390x844 layout and desktop checked,
no console errors. Reviewer storage-isolation finding fixed with regression test.
Existing published files byte-identical. Real iPhone play feel not re-tested.
