# Active Device Lab Implementation Plan

Goal: add four testable science-fiction demolition devices to the existing ideas lab, preserving published campaign builds.
Architecture: a lab-only subclass of StructuralIdeaWorld, a lab-only overlay extension and a small independent control section. Existing map selection, physics, tool modifiers, pause and settings remain reusable.

Approved scope: Orbital Drop (falling satellite hardware, not magical meteors), Seismic Driver (ground shock), Gravity Press (temporary downward gravity), Sonic Sweep (horizontal impulse wave). English source copy for new controls. No passive-counter system or campaign unlock integration in this task. Fictional equipment uses bounded gameplay approximations, not an engineering simulator.

- [x] Write real-world tests for invalid/reentrant activation, all devices conserving collectible pixels, no passive retriggers, whole-map targets, paused/invalid time, gravity restoration, fresh-run cleanup.
- [x] Implement lab-only active-device world and bounded timed actions. Satellite hardware is an external non-collectible projectile; collision uses swept contact against current structure pixels. Reuse existing fracture/impulse physics on impact. Never alter default game gravity permanently.
- [x] Add English device buttons and 1/2/3 test strength. No battery cost or campaign cooldown; disable during an active sequence or paused run. Show current phase. New controls work without closing/restarting maps.
- [x] Render satellite panels/trails/impact, ground devices and traveling shock, downward compression and horizontal sound-front. Keep same maps available; restart resets devices.
- [ ] Test, build only ideas release, compare other release hashes, inspect browser at desktop/mobile widths, review, publish to canonical lab/maps and verify old-link compatibility.

Validation: initial new-device test failed because the module did not exist. Added real physics assertions after review: Seismic releases foundation material, Sonic imparts rightward impulses, Gravity increases solver gravity and falling-body displacement before restoring it. All three test strengths preserve finite physics and the pixel ledger. Desktop browser exercised orbital impacts, seismic collapse and gravity; 390×844 browser exercised device selection and Sonic launch with modal auto-close. Real iPhone performance remains user playtest. This test harness does not implement campaign balance, unlocks or passive counters. Other 121 published files hash-identical before publication.

Pre-publication checks: 38 ideas tests, 17 structural tests and 5 root route tests passed. Build succeeded. Browser console contained no errors. Devices have strength 1/2/3; the public ideas lab is the only rebuilt edition.
