# Local tiny-remnant cleanup and structure outlines ·2026-11-11

Status: local build and static HTTP delivery checked; user gameplay/visual/performance confirmation pending.

- Local URL: http://127.0.0.1:8805/game.html?v=remnants-outline-1
- Candidate: /Users/roy/Developer/sand/variants/godot-paid-port/qa/local-remnant-outline-2026-11-11/
- Served project/package: ../local-blast-lab-2026-11-08/project and public under the same qa directory.
- Source base: existing all-skills local lab, carrying the0.5.56 native coordinate fix. Public/iPhone0.5.57 release pointers remain unchanged.

## Approved behavior

After structure damage, an independent remaining building component of1–4pixels becomes collectible grains even if it touches the terrain. The existing connected-component pass is reused; there is no new frame-time full-map scan. A tiny live hinge support is protected until that hinge detaches, and a thin leg still connected to a larger building is not treated as an independent remnant. Original IDs are emitted through the normal release/grain path, retaining their rewards. Terrain is separate and not cleared. Existing detached-chip conversion up to16pixels is unchanged.

Building chunks and fixed building residues get a light cream outer stroke and dark teal inner stroke. Shared edges of the non-overlapping rectangle cover cancel out, so only contours including holes are drawn. Segments are cached on the Mesh resource and inherited by same-geometry child meshes. There is no per-frame pixel outline scan, extra texture or collision shape. Collectible grains, terrain and background are excluded.

## Evidence and boundary

- Godot4.6.2 import, compile-only and Web export completed without script/parse/error markers. Logs remain in candidate/logs/.
- Four inputs changed: world.gd, structure_physics.gd, project.godot local version label, diagnostics/blast_trace.gd local trace label. The new outline script and UID are added. Other1372 inputs, including authored maps, balance/profile, effects, native libraries and controls, match the preserved baseline.
- All10 static HTTP files matched build-manifest hashes; COOP/COEP headers were present. Working nonthreaded native module SHA256:667d8633d21ce1508878961ba504519990ede02b697874b42251324a7e0df18b.
- Same origin and PlanetPatchupLocalBlastLab20261108 namespace; existing local checkpoint files8/8 unchanged. No profile reset, public deploy or iPhone install.
- The assistant did not run tests/scenes/gameplay, a browser or runtime probes. Visible thickness, actual completion/reward behavior and FPS remain user checks.

## Rollback

Candidate/before/live-public is the exact previously served directory; candidate/before/public is an additional copy. Restore those files to the lab public directory and reload the same origin. Restore the four source files from candidate/before/project, remove the two added presentation/piece_outline.gd(.uid) files, and restore build.py, build-manifest.json and README.md from candidate/before. Preserve lab/records and browser saves. Source changes are also captured in source.patch (zero context; use git apply --unidiff-zero when applying). CURRENT.json and production source require no rollback.
