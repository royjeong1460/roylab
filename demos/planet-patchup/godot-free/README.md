# Planet Patchup free web — Godot 0.5.34

Separate free project retaining the original free edition contracts while synchronizing common code from frozen paid 0.5.34. This release excludes v35 while its reported regression is investigated. Native paid code and installed apps are outside this release. Source hashes and integration decisions are recorded in `docs/qa/2026-11-02-free-godot-v0534/` at repository root; initial free/paid 0.5.9 evidence remains in the earlier QA directory. This source version is not a claim that deployment or gameplay verification has completed.

## Scope

- Arch Quarter: tutorial, six normal maps and boss; Aftershock, Relay and Orbital; one passive and one active slot. Five other globe regions remain locked previews without packaged maps.
- Common frozen-v34 physics, debris surface/sleep, connectivity/fracture caches and presentation are integrated without new tuning. Public performance diagnostics remain off; the probe follows the project enable flag. No FPS improvement is claimed.
- Collection preparation waits for meaningful movement/new breakage to settle (0.6 seconds stable, minimum one second) or for two foreground seconds without actual progress. A centered optional skip button appears after three foreground seconds and starts normal absorption. Preparation shows “잔해 정리 중” instead of a 0% recovery count; paused/background time does not advance the optional wait timer.
- Recovery timing starts at absorption: fewer than 70% pixelized at three seconds proceeds to a 0.5-second fade; successful recovery lasts at most nine seconds including fade. Keep both replacement collection upgrades, unlimited existing upgrades and exact historical cost/refund accounting.
- Held parts appear beside the workshop Upgrades header. Upgrade prices and the fixed two-button workshop footer remain intact.
- Unchanged quiet-background v5: 94 BPM, 32 bars. Shared effects remain; passive skills have no sound.
- Restoration requires six distinct normal best records at 70% plus boss clear. Tutorial/replays do not create restoration steps.

## Save transition

The canonical URL remains `/planet-patchup/play/`, on the same origin. The shell reads original Arch v1/v2 browser slots and run journals under their original Web Lock before engine startup. Original localStorage is never rewritten/deleted. Godot stores a raw recovery snapshot before a validated redundant-slot import. Existing Godot slots or recovery copies prevent automatic replacement; corrupt/conflicting legacy data blocks import and transactions visibly. The four retired collection tracks are archived and refunded exactly once.

Godot uses the stable custom directory `PlanetPatchupGodotFreeWeb`, its own IDBFS mount, and free-only profile/journal/settings names. A lifetime Web Lock prevents two free Godot tabs from writing independent copies. Settings retain the original audio on/off preference; original touch and analytics keys remain untouched. Filesystem sync requests are not a claim of durable browser readback. Close older Phaser game tabs before moving to the new release; later changes in an old tab are not automatically merged into an existing Godot profile.

## Build and publish

From repository root:

```sh
npm run build:game -- --free
npm run build
```

The free builder imports, checks scripts and exports the single-thread Compatibility Web target with Godot 4.6.2. Override the local binary/template with `GODOT_BIN` and `GODOT_WEB_TEMPLATE` when needed. `src/godot-free/` bundles the original anonymous analytics transport and a DOM feedback dialog using the existing public production environment configuration. Statistics can be disabled in the dialog; feedback is submitted explicitly. Raw saves/journals are not telemetry.

The manifest labels this release `0.5.34-free`; new immutable stems use `free-0534-<hash>`, while existing `free-059-*` artifacts and their exact gzip headers remain. Exported WASM/PCK are gzip payloads under content-versioned original extensions, served as `application/gzip` with immutable cache headers. The generated startup adapter decodes only those two exact asset URLs with `DecompressionStream` after normal HTTP decoding, then supplies the engine MIME types. HTTP content coding is left to the host: Pages added an extra gzip layer when custom `Content-Encoding` was used, confirmed by public response hashes. The 25 MiB Pages per-file limit is enforced. The original Phaser release/chunks and map editor are preserved; its archive URL is `/planet-patchup/archive/free-phaser/`. Map preview queries use that archive. Legacy source remains `src/arch/main.js`; its build command is `npm run build:free:phaser` from the demo directory.

Commit source and checked-in `public/` release together. Cloudflare's normal site build uses those files; it does not need Godot installed.

## Verification boundary

The user performs all gameplay, browser, device, feel and thermal testing. Agents may inspect source, import/compile/export, inspect packaged files and HTTP bytes, and deploy. Do not run tests, scenes, simulations, browsers or device apps. Build/static delivery evidence does not establish gameplay, audio, save durability, feedback delivery or device behavior.
