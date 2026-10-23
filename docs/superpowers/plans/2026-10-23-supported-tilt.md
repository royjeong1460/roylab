# Supported tilt implementation plan

User approved keeping mass/inertia fixed, assisting only supported toppling, stopping at contact or release, and retaining the previous ramp edition.

Architecture: add TiltWorld extending BearingWorld, not RampWorld. Apply an extra gravity-aligned torque about the hinge during downward rotation only. Scale this torque from 1 to the chosen cap (default5) over5 active simulation seconds. Physical inertia, mass, collision energy and natural inherited velocity stay unchanged. Stop assistance permanently on a non-pivot collision or broken hinge; fragmented children are ineligible. Do not erase legitimate angular momentum on landing.

- [x] Regression first: assert unchanged material properties across actual simulation; supported torque direction and ramp; no assistance in freefall, fragments, upward swing, lost support or after landing. Compare runtime1/3/5 maps and pixel conservation.
- [x] Implement demos/planet-patchup/src/tilt-lab/world.js with beforeUpdate assistance and collisionStart/Active gating. Ignore only contacts with the static support immediately around the hinge; all other contacts stop assistance. Preserve original collision handler.
- [x] Reuse ramp maps, create isolated entry/settings/UI/storage at planet-patchup-tilt. Explain that fivefold means assisted tipping torque, not angular speed. Link original ramp page. Build separate public bundle without modifying old assets.
- [ ] Run focused new and old regression tests, build, desktop/mobile layout and browser gameplay checks. Publish separate URL and verify deployed build. Record limits: real iPhone play feel needs user replay.

Verification: 24 focused tests pass (6 new, 18 previous). Build succeeds with existing Phaser chunk-size warning. Local browser load comparison ramps while hinged and returns to1x after settling; no console errors. Review caught cached Matter support points: use supportCount, with a failing-then-passing regression. iPhone feel remains unverified.
