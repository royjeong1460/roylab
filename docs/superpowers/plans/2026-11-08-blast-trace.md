# Per-blast diagnostics implementation plan

Goal: Show the actual radius supplied to each blast, exact direct cut count/maximum distance, extra pixel conversion count and mechanism on the iPhone, retaining exportable local records. User approved implementation/install on2026-11-08 after BUG-015 video analysis.

Architecture: A bounded, observation-only RefCounted tracer counts existing batch results; it never changes simulation decisions, random draws or event ordering. Immediate blast results and later conversions are separated. Later conversions identify their observation window after a shot, not an unproven causal parent. The candidate enables a compact always-visible top panel; public web stays unchanged/off. Existing5-second journal checkpoints plus pause/results/export persist the trace.

Constraints: Preserve0.5.54 source/app and CURRENT for rollback. Same app ID/save paths. No gameplay/tests/scenes/simulation/browser/device app launches. Compile/import/export, static checks, signing and install only. C++ kernels, physics values, skill code, maps/economy/collection must remain byte-identical.

- [x] Add diagnostics/blast_trace.gd: maximum512 detonation rows and2048 batched conversion events with explicit dropped counts; counters continue after truncation. Record live argument radius/power/reach, direct candidate count/max distance/outside count, extra conversion phases/mechanisms and unclassified delta. Never scan all pixels for diagnostics.
- [x] Observe world.cut_at, add_piece, budget conversion, fracture and pillar snap, plus impact wrapper/halo and black-hole wear batch results. Do not alter their branches, amounts or traversal order.
- [x] Add six-line top HUD and last-shot comparison, separate from optional performance overlay. Retain battery five-tap toggle.
- [x] Add attackTrace to current journal at existing checkpoints; JSON export retains all kept records. Show warning via existing journal warning on persistence failure.
- [x] Compile-only adapters on pinned Godot4.6.2; inspect diff and compare unchanged kernel/skill/data hashes. Build iOS0.5.55(65), verify signature/package.
- [ ] Update-install on iPhone without launch; initial attempt blocked by CoreDevice4016, awaiting USB/unlock.
- [ ] Record delivery/install/rollback and user-only gameplay verification, then update CURRENT only after build/install evidence.

Validation: static batch coverage for every emit_grain caller, no new pixel iteration, JSON bounds/schema and compile-only. Static checks do not prove gameplay counts or UI readability; user supplies replay/video. No runtime test is authorized.
