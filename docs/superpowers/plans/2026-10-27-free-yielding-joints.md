# Free campaign yielding connections

Approved goal: integrate the accepted map-1 connected bending algorithm into the free campaign (tutorial, six sites, boss, and editor previews using that campaign). Retain the local baseline and accepted local #4–#8 reference for comparisons. No economy, gravity, blast strength or input changes.

Architecture: `src/arch/jointed-world.js` extends the unchanged `ArchWorld`. The campaign Run uses it. Existing structural overload selects a real pillar-head seam; the subclass replaces immediate separation with Matter point constraints and equal/opposite angular resistance, then releases on load fatigue or deformation. Use structural roles, never debug IDs. Support multiple seams and preserve surviving connections across body reconstruction; remove constraints when their material is gone. Version and counts enter existing local run telemetry.

- [x] Test before implementation: both recorded attacks bend while attached, mirrored/other pillars work, multiple joints and repeated attacks conserve pixels, disappearing endpoints leave no stale constraints, release adds no velocity, untouched all eight authored maps stay stable, profile stats and gravity match baseline, campaign Run selects new class.
- [x] Implement generalized head joints with the accepted constants (frequency 3, damping .85, creep .06, fatigue .22, 30-degree break angle). Keep non-head neck cuts on existing logic. Rebind surviving pixel endpoints after fracture. Collision exclusion must be restored per connected group after any release. A join exceeding the body budget uses the original split/pixel fallback.
- [x] Wire campaign and journal. Run Arch regression + input/persistence suites and build free assets. Preserve archived routes and diagnostic logs.
- [ ] Verify free page in browser using isolated QA storage, inspect bundle and console. Publish through existing Roylab workflow and verify canonical free URL. Record evidence and limits in release note.

Files: demos/planet-patchup/src/arch/jointed-world.js; src/arch/journey.js; src/arch/telemetry.js; tests/arch-campaign-joints.mjs; package.json; public/games/planet-patchup-free; canonical public/planet-patchup/play; docs/free-yielding-joints.md.
