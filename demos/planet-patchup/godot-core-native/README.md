# Shared Godot native core ·0.5.40

Source snapshot of accepted iPhone g40/0.5.40(49), shared with the free Web build. No maps, skill catalog, saves or private telemetry are present here. Other optimized algorithms retain the accepted baseline; later tuning and optional pressure-scope revisions are recorded below; edition content and entitlement controls belong to Godot scripts/data.

The pinned Godot4.6.2/godot-cpp4.6 single-precision dependency, SCons version and compiler flags are in dependency-lock.json. Sources are content-hashed in source-manifest.json. Native build evidence and Web SDK/template pins are recorded in docs/qa/2026-11-03-common-g40. Public distribution contains the built side module; this source directory is outside the exported Godot project.

SConstruct expects vendor/godot-cpp at the pinned commit and SCons4.11.1, using the corresponding platform SDK. Web uses Emscripten4.0.20, single-thread GDExtension-compatible Godot template. User owns runtime verification; do not run scenes or tests from an assistant session.

Rebuild in an isolated directory, not directly beside this folder: copy `src/`, `SConstruct`, `build-profile.json` into `work/extension`; create `work/project/native_core/bin`; clone pinned `vendor/godot-cpp` under `work/extension`. From that directory, after activating the SDK, run:

```sh
scons platform=web target=template_release arch=wasm32 threads=no api_version=4.6 precision=single build_profile=build-profile.json production=yes lto=full optimize=speed -j6
```

Output: `work/project/native_core/bin/libpp_core.web.template_release.wasm32.wasm`. Name its published copy `libpp_core-g40-<first16-of-sha256>.wasm`; update the Web library path in the free `.gdextension` and its provenance.json hashes before rebuilding the free release. Retain old immutable files. For macOS, use platform=macos/arch=arm64 and the same pinned profile; no Web/iPhone code is run by compilation. Full SDK/template acquisition and hashes are in the release QA report.

##2026-11-07 tuning comparison

Destruction-midpoint0.5.53 changes only the fall internal bond-resistance literal in world_kernel.cpp from0.02 to0.03. No other kernel computation/API is changed. Source manifest and rebuilt Web/macOS provenance identify this separate tuning revision; the earlier immutable published kernel remains preserved. Native iOS/Web plus Android library build evidence is in docs/qa/2026-11-07-destruction-midpoint. Runtime remains user verification.

##2026-11-08 pressure-scope fix

pressure_bonds and halo_bonds accept optional scope_center/scope_radius arguments (default radius−1 disables scope). Scoped calls include only pixels inside the live circle in the bond lookup; both source and neighbor IDs must belong before any bond write. Only expand/wave pressure and expand final-burst metadata supply a scope. Existing unscoped callers retain their prior arithmetic and iteration order; fall/world kernels remain byte-identical to0.5.53. Updated bindings, built libraries and GDScript adapters must be delivered together. Build/install evidence and0.5.53 rollback: docs/qa/2026-11-08-pressure-scope/README.md.

## 2026-11-08 static fracture coordinate fix

The two pressure/halo ID-to-coordinate assignments now copy ID and Vector2 values before another readonly Dictionary lookup. Readonly caching, scopes, all damage/radius constants and fall/chain kernels are retained. Native0.5.56(66) and the all-skills loopback lab carry this consistency fix. A fixed building may receive previously missing bond damage; user A/B gameplay verification is pending. The free Web source/library pair is prepared locally; public deployment is separate. Evidence and rollback: docs/qa/2026-11-08-static-fracture/README.md.

Public adoption followed user approval: free-0541-6ee74427fb5e / release96f9626, with matching non-threaded native module667d8633d21ce150. See docs/qa/2026-11-08-static-fracture-release/README.md for public HTTP and iPhone evidence.
