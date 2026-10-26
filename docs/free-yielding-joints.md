# Free campaign: connected bending before separation

2026-10-27 · `arch-yielding-joints-v1`

The accepted reference is `demos/planet-patchup/src/arch-debug/yielding-world.js`: a frozen local comparison for source #4 leg and #8 facade. It is not the public entry point.

The free campaign now uses `JointedArchWorld` in `demos/planet-patchup/src/arch/jointed-world.js`, instantiated by `src/arch/journey.js`. It extends the unchanged `ArchWorld`; diagnostic baseline, earlier experiments and other editions keep their current implementation. Tutorial, all six ordinary Arch sites, the boss and custom previews through this campaign use the new class. A body without a pillar-head interface keeps the normal destruction path.

Existing structural overload still decides when a seam fails. At a real pillar-head seam the free world now:

1. Splits the welded compound into rigid pieces while carrying their last integrated pose motion.
2. Keeps the actual material endpoints attached with Matter point constraints, angular spring resistance and damping. The pieces can rotate relative to each other. This is joint deformation, not a flexible beam solver.
3. Accumulates supported overload and angular deformation, releasing at full fatigue or a 30-degree relative bend. Release removes the constraint without adding an impulse or rewriting velocity.

Accepted settings stay frequency 3, damping .85, creep .06 and fatigue .22. Gravity, blast strength/reach/radius, mass/inertia settings, support capacity, collision destruction and economy are unchanged. Actual damaged shaft necks still use the original immediate fracture. Damage to the material at a connection can also detach it directly.

Campaign adaptations: role/pixel-ID lookup instead of debug numbers; multiple seams and collision-group restoration; surviving endpoint rebinding when an attack rebuilds a body; cleanup when endpoints disappear or the body budget converts a piece to loose pixels. If one seam breaks into several independent patches, the largest surviving patch keeps that joint; other material remains independent. Joined groups suppress internal contact until separation, matching the reference articulated-pair approach.

Local run records now carry `physicsVersion`, cumulative joint yields/releases and active-joint count. Existing reports without a physics tag are grouped as `arch-rigid-joints-v0`; the analyzer keeps the two physical models separate. Save keys/schema, upgrades, currencies and progress are unchanged.

Validation: recorded root/head attacks, mirrored architecture, stable untouched tutorial/six sites/boss, repeated blasts across all maps, subsequent Blast/Black Hole, body reconstruction, seam removal, multiple simultaneous seams, body-cap cleanup and no-release-impulse assertions. The existing Arch, free, input and persistence suites pass. Free Vite and Roylab static export builds succeed (existing Phaser size warning). Local browser QA used separate `?qa=1` progress, spent 12 energy on a map-1 shot, observed detachment and collection, and showed no browser errors. 119 other game files retain their previous hashes. No new physical iPhone test or pacing claim.

Commands: `npm run test:arch` and `npm run test:free` in the demo; `npm test` and `npm run build -- --webpack` at Roylab root. Production free assets are rebuilt from `vite.free.config.js`; canonical route remains `/planet-patchup/play/`.
