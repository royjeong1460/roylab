# Pressure skill scope implementation plan

**Goal:** Keep Pressure Bloom and Ground Pulse bond damage inside each live field/pulse circle, retaining normal fall and causal chain collision behavior. User explicitly approved the fix, rollback and iPhone installation.

**Architecture:** Their shared `_pressure` path passes its actual center/radius through the impact context into the C++ pressure kernel. Only bonds whose two endpoint pixel centers are inside the circle may change. The native scope arguments default to disabled for all other callers. Pressure Bloom final burst also carries the same scope into its halo kernel. Keep existing strength, timing, field radius, impulse, local attenuation, fracture thresholds and body budgets.

**Tech:** Pinned Godot4.6.2/godot-cpp4.6, GDScript + C++ single-precision builds. No dependencies added.

## Constraints

- Source baseline: installed0.5.53(63), qa/ios-destruction-midpoint-2026-11-07. New candidate0.5.54(64), qa/ios-pressure-scope-2026-11-08. Same app ID and user directory; no player-data migration/reset.
- Preserve44 reduced maps, economy/profile/collection/skill catalog/levels, other skills, gravity, tilt, fall/chain collision code and the prior source/app.
- User alone runs tests/scenes/gameplay/browser/device/feel/thermal checks under project instructions. Assistant performs source/JSON/package checks, import/compile/export, signing and update-install only. No runtime tests.
- Local Web source/package stays consistent. No public deployment was requested.

## Steps

- [x] Preserve old registry, all project hashes, relevant GDScript/C++ sources and installed app path. Use existing isolated worktree and a new candidate tree.
- [x] Add optional scope_center/scope_radius (default−1 disables) to pressure_bonds and halo_bonds. Build each pixel-ID lookup using only in-circle pixels for scoped calls, and skip excluded source IDs before scanning neighbors. Both bond endpoints must be inside; the convex circle then contains the whole bond segment. Unscoped loops keep their prior order and arithmetic.
- [x] Pass scope data only from `_pressure` (expand/wave) and expand final burst. impact_physics forwards optional scope defaults; world.gd only forwards final burst metadata at blast_halo. Change no fall/chain function or numeric tuning.
- [x] Rebuild iOS/macOS/Web and retained Android core libraries. Update shared source hashes, paths and provenance together; import/check-only/export, build/sign native and local Web.
- [x] Inspect exact changed functions/unchanged44 data files and kernels, disabled defaults, endpoint guards, both passive call sites and final burst. Verify exported/compiled core and PCK, app version/bundle/signature and all Web transport/decoded hashes.
- [x] Update-install iPhone without launch; record receipt and0.5.53 rollback. Update BUG-015 to user confirmation pending, commit isolated source/docs and sync guarded delivery documents. Actual recurrence and feel remain user checks.
