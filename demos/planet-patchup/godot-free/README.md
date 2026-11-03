# Planet Patchup free web — Godot 0.5.40

Separate free project retaining the original free edition contracts while synchronizing common code from frozen paid 0.5.40 (`variants/godot-paid-port/qa/perf-g40-2026-11-03/project` in the parent sand workspace). The approved g40 release supersedes the earlier v34 pin; live paid and archived v35 sources are not merge inputs. The free integration report and per-file three-way hashes are recorded under `variants/godot-paid-port/qa/web-release-g40-2026-11-03/evidence/free-integration-report.md` in the parent workspace; historical v34 evidence remains in `docs/qa/2026-11-02-free-godot-v0534/`. This source version is not a claim that deployment or gameplay verification has completed. No paid app reinstall is required when its code is unchanged.

## Scope

- Arch Quarter: tutorial, six normal maps and boss; Aftershock, Relay and Orbital; one passive and one active slot. Five other globe regions remain locked previews without packaged maps.
- Common frozen-g40 native C++ physics, debris surface/sleep, connectivity/fracture caches and 32-cell dormant-grain image renderer are integrated without new tuning. Matching Web native libraries and a GDExtension-capable Godot 4.6.2 template are required. Public performance diagnostics start off; the project flag supplies the initial preference and the optional hidden five-tap toggle stores a separate diagnostics preference. No FPS improvement is claimed.
- Collection preparation waits for meaningful movement/new breakage to settle (0.6 seconds stable, minimum one second) or for two foreground seconds without actual progress. A centered optional skip button appears after three foreground seconds and starts normal absorption. Preparation shows “잔해 정리 중” instead of a 0% recovery count; paused/background time does not advance the optional wait timer.
- Recovery timing starts at absorption: fewer than 70% pixelized at three seconds proceeds to a 0.5-second fade; successful recovery lasts at most nine seconds including fade. Keep both replacement collection upgrades, unlimited existing upgrades and exact historical cost/refund accounting.
- Held parts appear beside the workshop Upgrades header. Upgrade prices and the fixed two-button workshop footer remain intact.
- Same quiet-background v5 composition:94BPM,32bars. Free web delivers a192kb/s,44.1kHz stereo MP3 through the existing Godot AudioStreamPlayer with full-track looping. The original WAV is preserved as source and excluded from the free export. Effects and all audio controls retain their existing code.
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

The free builder imports, checks scripts and exports the single-thread Compatibility Web target with Godot 4.6.2 and the matching GDExtension-enabled Web template/native side module. Override the local binary/template with `GODOT_BIN` and `GODOT_WEB_TEMPLATE` when needed. `src/godot-free/` bundles the original anonymous analytics transport and a DOM feedback dialog using the existing public production environment configuration. Statistics can be disabled in the dialog; feedback is submitted explicitly. Raw saves/journals are not telemetry.

The manifest labels this release `0.5.40-free`; new immutable stems use `free-0540-<hash>`, while existing release artifacts and their exact gzip headers remain. Exported WASM/PCK are gzip payloads under content-versioned original extensions, served as `application/gzip` with immutable cache headers. The generated startup adapter decodes only those two exact asset URLs with `DecompressionStream` after normal HTTP decoding, then supplies the engine MIME types. HTTP content coding is left to the host: Pages added an extra gzip layer when custom `Content-Encoding` was used, confirmed by public response hashes. The 25 MiB Pages per-file limit is enforced. The original Phaser release/chunks and map editor are preserved; its archive URL is `/planet-patchup/archive/free-phaser/`. Map preview queries use that archive. Legacy source remains `src/arch/main.js`; its build command is `npm run build:free:phaser` from the demo directory.

Commit source and checked-in `public/` release together. Cloudflare's normal site build uses those files; it does not need Godot installed.

## Verification boundary

The user performs all gameplay, browser, device, feel and thermal testing. Agents may inspect source, import/compile/export, inspect packaged files and HTTP bytes, and deploy. Do not run tests, scenes, simulations, browsers or device apps. Build/static delivery evidence does not establish gameplay, audio, save durability, feedback delivery or device behavior.
