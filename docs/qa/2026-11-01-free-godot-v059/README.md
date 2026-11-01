# Free Godot 0.5.9 source/build evidence

Requested scope: canonical free web aligned to the approved native 0.5.9 behavior, retaining original free content/access and progress, with central automatic collection and unlimited upgrades.

## Source and access

The frozen source at `/private/tmp/pp-music-v5-v059-20261101/godot` matched all 364 SHA-256 values in `paid-source-baseline.json`. The live native tree advanced independently during this work; it was neither modified nor used as a later baseline.

The free package contains exactly eight original Arch map JSON files (tutorial + six normals + boss), three original skills, one passive and one active slot. Five globe regions remain locked empty previews. Paid maps, expansion definitions/exclusive assets and the paid provenance manifest are excluded. Money, automatic collection and shared physics retain the approved source; access policy is separate from physics edition. V5 94 BPM music is unchanged.

Original free browser slot/journal strings are read under the original Web Lock, archived before import and never modified. Free Godot storage uses a separate custom directory and IDBFS mount plus a lifetime writer lock. Corrupt/conflicting legacy input, destination recovery copies and unavailable persistent storage block migration/transactions visibly. Manual import and shared slot writes also reject unavailable storage. Historical collection spending is archived and refunded once.

## Evidence

- `core-source-review.md`: independent source approval of access, economy, restoration and migration.
- `storage-source-review.md`: independent follow-up approval of unavailable-storage guards.
- `browser-source-review.md`: independent source approval of bridge, locks, stable analytics objects, feedback and original privacy/opt-out behavior.
- `final-source-review.md`: broad release approval after fixing engine-download failure guidance and the current analytics balance label.
- `transport-source-review.md`: independent approval of exact-URL gzip payload decoding after the observed host double-encoding.
- `build-manifest.json`: exact versioned filenames, sizes and payload/decoded SHA-256 values.
- Pinned Godot 4.6.2 import, script check-only and single-thread Web release export each exited 0. Vite shell compilation exited 0. Default Next production build also exited 0; an initial temporary-worktree dependency symlink error was resolved with a local dependency clone, without source/config changes.
- Static artifact checks validate gzip roundtrips, per-file Pages size limits, exact free map paths/catalog, canonical asset base, readiness-before-start ordering, separate mount, original 127 non-entry files and a complete preserved Phaser archive.

The generated canonical URL is `/planet-patchup/play/`; Phaser archive is `/planet-patchup/archive/free-phaser/`. Exact application/gzip payload and immutable cache rules are generated in `public/_headers`; the startup fetch adapter decodes only the versioned WASM/PCK URLs after native HTTP decoding. Cloudflare builds from checked-in public files and does not need Godot installed. Final Next output/public parity was verified for canonical HTML, exact headers, all six engine artifacts, archive and map editor. Public HTTP delivery must be verified separately against these manifest hashes after deployment.

Staged whitespace warnings are limited to inherited comment spaces in unchanged `bearing_constraint.gd`, the inherited final blank line in `campaign/economy.gd`, and byte-preserved CRLF Phaser/Matter archive licenses. Their original bytes/endings were verified; the remaining staged whitespace check passed.

## Verification boundary

No tests, scenes, simulations, gameplay/replays, browsers, device apps or telemetry probes were run. Source/build/static delivery evidence does not establish gameplay, audio, durable save reload, feedback/analytics receipt, rendering, performance or device readiness. Those checks belong to the user. This free-only delivery does not reinstall or launch the native paid app.

## Public transport correction

The initial b1afb15 deployment exposed an extra server gzip layer: curl native HTTP decoding returned the packaged gzip SHA-256, rather than the decoded engine/pack hash. No game/browser was launched for this observation. The corrected protocol treats gzip as a payload media type, leaves HTTP content coding to Pages, and decodes the two exact payload URLs in the generated startup adapter. New content-versioned URLs prevent reuse of the earlier immutable responses. Verify HTTP-decoded payload hash and its local gzip-decoded hash separately.

## Primary engine/hosting references

- [Godot custom user directory helper](https://github.com/godotengine/godot/blob/4.6.2-stable/core/os/os.cpp#L317-L326) and [Web path mapping](https://github.com/godotengine/godot/blob/4.6.2-stable/platform/web/os_web.cpp#L201-L203).
- [Engine initFS ordering](https://github.com/godotengine/godot/blob/4.6.2-stable/platform/web/js/engine/engine.js#L90-L98) and [persistent-path mounting/error state](https://github.com/godotengine/godot/blob/4.6.2-stable/platform/web/js/libs/library_godot_os.js#L124-L158).
- [Cloudflare Pages custom response headers](https://developers.cloudflare.com/pages/configuration/headers/) and [asset serving/limits](https://developers.cloudflare.com/pages/configuration/serving-pages/).

- [DecompressionStream API](https://developer.mozilla.org/en-US/docs/Web/API/DecompressionStream).
