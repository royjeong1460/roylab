# Free web MP3 source and package review

What this change does: The free Godot web edition loads the existing v5 composition as a 192 kb/s, 44.1 kHz stereo MP3. The original WAV remains unchanged in source and is excluded from the new free package. Existing Godot playback and browser integration code are preserved.

Reviewed production base: `a0bb94a8ea911ff9da5c0871ef0f4ec7c0770d83`.

Reviewed artifact: `free-0534-c5a7a90dd912`, compared with production `free-0534-f4dda62c94b4`.

## Findings

No source or static package blockers found. Verdict: Ship within the authorized source/import/export/static-package scope.

## Source checks

- `godot-free/data/assets.json:1` differs only in `assets.music`, now `res://assets/audio/quiet-background-v5-94bpm-32bars.mp3`.
- The source WAV is byte-identical to production: 14,412,300 bytes; SHA-256 `34d6bc8dcb86e450da8b56c7dcdbf70e5aafc3151d0fe6096a8f9f5c236c0f9c`.
- The new MP3 is 1,962,361 bytes; SHA-256 `59bea01e7f36c330a30fa37631eeb355f50891d8a536151f675ca817423402ff`. This is an 86.384% source-file reduction.
- `godot-free/assets/audio/quiet-background-v5-94bpm-32bars.mp3.import:15-18` has `loop=true`, `loop_offset=0`, `bpm=0`, and `beat_count=0`.
- `godot-free/export_presets.cfg:10` excludes only the original BGM WAV in addition to the existing exclusions. Effect WAVs remain available.
- `scripts/build-godot-free.mjs:156-161` checks the exact music catalog path, loop import flags, actual encoded MP3 bytes in the PCK, and absence of the old imported WAV sample.
- All existing `.gd`, `.tscn`, maps, effect sources, project configuration, and `src/godot-free` shell files are byte-identical to production. Music volume, controls, unlock, pause/background handling, effects, saves, skills, and physics code have no changes.
- Existing playback still resolves the catalog path in `godot-free/presentation/audio.gd:53-61`. The WAV-only loop override is unchanged; the MP3 uses native resource loop flags. Godot documents these flags in [AudioStreamMP3](https://docs.godotengine.org/en/4.6/classes/class_audiostreammp3.html), and [Godot 4.6.2 source](https://raw.githubusercontent.com/godotengine/godot/4.6.2-stable/modules/mp3/audio_stream_mp3.cpp) applies the resource loop setting to decoder and web sample metadata.
- Public entry HTML differences are the new immutable artifact stem and updated PCK byte count. The gzip delivery protocol, persistent path, shell asset names, existing release files, and Phaser archive remain unchanged.

## Independent package inspection

The reviewer parsed the gzip-decoded PCK v3 directory directly, without loading Godot resources or running game code. Every one of the 290 directory entries passed its stored MD5 check, and independently calculated entry SHA-256 values match `pck-entry-sha256.json`.

- The two music directory entries are the native `.mp3str` and MP3 `.import` remap. There is no original BGM WAV resource, WAV import entry, or imported WAV sample.
- The 1,962,711-byte resource declares `AudioStreamMP3` and contains the exact 1,962,361-byte source MP3. Its serialized `loop` property is `true`; `loop_offset` is omitted and retains the documented default of zero.
- The original WAV bytes are absent. Its old path remains only as a small entry in Godot's UID cache; this does not package the WAV or its sample.
- Exactly the eight allowed Arch map JSON files are present. No map or skill catalog changes were introduced.
- There are 285 byte-identical shared entries. All compiled `.gdc` scripts and all effect resources are unchanged. The seven changed/added/removed paths match `pck-change-list.json`.
- The generated `app.scn` is 679 bytes in both packages. Its only changed bytes are offsets 503-506, the single root node's generated `_bundled.node_ids[0]` integer. Its node data, paths, script reference, and connections are otherwise identical, as is source `app.tscn`.
- The compressed engine WASM is byte-identical to production at 9,469,248 bytes.

| Artifact | Production bytes | New bytes |
| --- | ---: | ---: |
| PCK gzip payload | 16,202,232 | 5,432,455 |
| Decoded PCK | 19,664,732 | 7,214,876 |
| WASM gzip payload | 9,469,248 | 9,469,248 |

The PCK gzip payload is smaller by 10,769,777 bytes, or 66.471%. These are file/package measurements, not runtime memory, CPU, loading-time, or device-performance results.

## Verification boundary

Read the successful import/compile/export and static-site build logs produced by the parent agent. The review itself performed only source comparison, file reads, binary directory/resource inspection, and `git diff --check`.

No tests, scenes, simulations, replays, game runtime, browser/device apps, audio playback, or saved-player-state probes were run. MP3 sound quality, the audible loop boundary, playback controls in a running browser, and device loading behavior remain for the user to confirm. Public deployment and HTTP verification are separate delivery work and are not asserted by this review.
