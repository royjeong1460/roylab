# Free web music resource reduction

**Goal:** Reduce the current free web BGM resource substantially while keeping Godot's existing playback and audio controls.

**Approved scope:** The user asked to reduce music resources and clarified the request after the proposed browser/M4A playback change. Use the current v5 WAV as the encoding source and deliver an MP3 resource through the existing AudioStreamPlayer. No browser music bridge, soundtrack replacement or unrelated optimization.

- [x] Encode the existing81.7021315second/44.1kHz/stereo WAV once to MP3 at192kb/s with gapless metadata. Preserve the WAV bytes and current volume code; do not normalize, trim or remix.
- [x] Change only `data/assets.json` music reference to `res://assets/audio/quiet-background-v5-94bpm-32bars.mp3`; import with `loop=true`, `loop_offset=0.0`. Keep `presentation/audio.gd` and the JS shell byte-identical.
- [x] Exclude the preserved BGM WAV from the free export in `export_presets.cfg`. Extend existing builder static guards to require the MP3 resource and reject the exported WAV/sample; retain exact free8maps/3skills, old immutable files, gzip protocol and separate save paths.
- [x] Import/check-only/export with pinned Godot4.6.2, bundle the shell and build the Next static site. Inspect actual PCK directory/MD5/resource bytes and MP3 import flags; verify unaffected package entries, audio source frames, asset sizes, old archives and source hashes. No game, tests, scenes, replay, browser/device/audio playback or save reads.
- [ ] Obtain independent source review, commit only this isolated worktree's resource/build/docs/public changes, fast-forward production main and verify Cloudflare plus static public HTTP hashes.
- [ ] Sync only owned source/artifacts to the primary checkout after matching captured hashes. Record source/build/delivery and user gameplay/loop/quality confirmation separately in BUG-003 and QA.

The native paid tree is outside this free-only resource delivery. Keep Godot0.5.34 and existing game behavior/version/storage; new content-addressed release filenames distinguish this asset update. Runtime audio quality, seamless loops and iPhone loading improvement remain user-only confirmation.
