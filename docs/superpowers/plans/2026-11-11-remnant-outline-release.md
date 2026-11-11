# Tiny-remnant and small-outline release plan

> Execute inline within the existing approved release worktree; user owns all runtime validation.

**Goal:** Adopt the approved local v3 behavior on full Web campaign and existing iPhone app.

**Architecture:** Copy only world.gd, structure_physics.gd and presentation/piece_outline.gd(.uid) after confirming the untouched local base matches both release sources. Keep platform config, profile, save identity, economy, skill levels, diagnostics and native libraries. Native candidate0.5.58(68); Web shell remains0.5.41 with a new immutable payload.

**Tech Stack:** Godot4.6.2, existing C++ extensions, nonthreaded Web export, Xcode Release, GitHub/Cloudflare Pages.

## Constraints

No tests/scenes/simulation/browser/device app launches. Import/compile/export/static package/HTTP/signing/install only. Do not delete app, profiles, records, original art, prior packages or the primary dirty checkout. User approved Web publication and iPhone update-install; no extra approval gate.

## Steps

- [x] Read CURRENT/delivery/AGENTS; compare local pre-change base with Web/native; preserve source hash inventories and rollback entry files.
- [x] Apply exact approved4files to Web and a new native candidate; preserve production profile/diagnostics config. Increment native version/build.
- [x] Import/compile-only/export Web and pack native; verify only intended sources changed, all maps/skills/economy/native modules and IDs unchanged.
- [x] Build/sign native app from cloned current Xcode project; preserve old app and identity.
- [x] Update-install without uninstall/reset/launch: user connected/unlocked; success sequence4640.
- [x] Build static site, verify package/entry hashes and commit only intended release inputs/outputs; push approved update to main. Confirm Pages result and public transport/decoded hashes.
- [x] Update delivery/version/CURRENT and BUG-017 records with actual build/publication/install evidence; retain rollback. User-only runtime boundary retained.
