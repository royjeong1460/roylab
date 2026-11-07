# Presentation Preview Implementation Plan

> **For agentic workers:** Use executing-plans inline; narrative/art inspection is a read-only independent subtask already delegated by the user’s authorization.

**Goal:** Let the user watch all five 3-second region lines and the 15-second ending without playing or changing progression.

**Architecture:** A read-only scenery Control consumes clean existing art metadata. One sequence Control owns the foreground timer, crossfades, globe and playback controls. Screens/App expose a gated preview hub, with web query preview=story and a native-candidate Options entry.

**Tech Stack:** Existing Godot 4.6.2, GDScript, planet shader, English/Korean localization; existing web and iOS build/export pipeline.

## Global Constraints

- Preserve gameplay, physics, skills, money, profile namespaces and current saves. Preview does not call Journey.start/finish/select_region.
- No new raster/video/audio assets or dependencies. User owns actual playback and device checks.
- Keep the normal boss/chapter path unchanged until preview approval.

## Tasks

- [ ] Add presentation/cinematic_scenery.gd reading the existing clean-state art and presentation/story_sequence.gd with setup(catalog,lifecycle,kind,index), a finished signal, 3/15-second foreground timing, Skip/Replay/return.
- [ ] Add Screens preview hub + sequence factory, App guarded show_presentation(), Options entry only when enabled, safe Back handling, web query flag and Korean translations. Ordinary URLs retain the existing home path.
- [ ] Import/compile/export web, verify immutable assets and exact transport/decoded hashes, build static site, publish the scoped release branch. Add a plain launch URL that opens the preview hub; do not run a browser.
- [ ] Clone the CURRENT native candidate, synchronize the shared presentation and targeted adapters, build/sign/install under the same bundle, record the new candidate and prior delivery as rollback. No app launch.
- [ ] Record build/delivery scope and give the user the preview URL + native Options path. Verify only sources/packages/HTTP/install receipts, leaving timing and visuals to user replay.
