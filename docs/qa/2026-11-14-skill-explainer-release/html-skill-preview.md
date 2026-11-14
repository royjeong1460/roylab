# Local HTML skill effect preview

Implemented only in the primary local `deployment/roylab/demos/planet-patchup/design-preview/menu-flow-v3-2026-11-14` prototype. Native and linked release worktree were not edited; no commit was made.

## Files

- Modified `app.js`: one import and disposer variable; only existing functions `closeSheet`, `sheet`, `skillDetail` changed. All other function bodies compare identical to the exact backup.
- Added `skill-preview.js` and scoped `skill-preview.css`.
- Added `assets/vfx/manifest.json`,16existing transparent PNG strips and two byte-identical existing timeline modules (`legacy-sequence.js`, `expansion-sequence.js`). PNG total48,252bytes. Original sources are `design-preview/skill-vfx-2026-10-29` and `skill-vfx-expansion-2026-10-29`; manifest retains exact source SHA256 values and paths.

Exact original `app.js` was backed up before mutation at `local-preview-before/app.js`, SHA256 `09d41c515d681055fbfda4d44ddf3e2bd8a497ad64829a6a898b399b7118d95c`. Backup manifest records the untouched `style.css`, `index.html`, `skills.js`, `catalog.json` hashes; all four still match.

## Behavior in source

The same skill detail sheet now mounts an inline **이펙트 미리보기** panel for all ten IDs, with a44px **다시 보기** target. Existing description, numbers, equip/purchase controls, font, receipt and other menu flows are unchanged.

Only effect sprites and existing timing are rendered. Positions are fixed; no fake falling/moving fragments, collisions, structure cutouts, damage, battery or physics are introduced. The old global preview.js/full scene.js were not embedded. All dependencies are under this preview root so its8817server can serve them.

A single instance owns its RAF/listeners. Close and sheet replacement call the returned disposer before removing DOM. Dispose cancels RAF and removes Replay/visibility/pagehide listeners. Hidden tabs cancel RAF and stop playback. Returning to a visible tab restarts only normal-motion previews whose sheets are loaded and whose container is still connected and not disposed; reduced-motion remains Replay-only. Pagehide disposes. Detached/closed instances cannot start after async image loading. Reduced-motion uses a static effect frame until explicit Replay.

## Verification

- Four fresh `node --check` commands passed for app/module/timeline files.
- Static source comparison confirms only the three intended original function bodies changed.
- All ten skill IDs have existing timeline coverage. A pure timeline-data audit checks all78selected events: finite nonnegative at, finite positive life, present sheet spec, positive finite width/height/frames/fps, and event end within its timeline. No DOM/renderer/physics/animation was executed. See html-preview-event-audit.json.
- All16PNG hashes match the preserved originals and their IHDR dimensions match width×frames/height. Both copied timeline modules are byte-identical to their original sources.
-22local static HTTP responses on127.0.0.1:8817returned200and matched local JS/CSS/manifest/timeline/PNG bytes. Initial sandboxed HTTP was denied; authorized read-only HTTP then succeeded.

No browser, game, scene, tests, animation, screenshots or device app were executed. Actual popup rendering, visual quality, touch/Replay and tab lifecycle behavior remain user validation. Static delivery is not playback verification.

Detailed checks: `html-skill-preview-verification.json`. Rollback: restore only backup app.js; new scoped files/assets can remain inert because the original app has no import of them.
