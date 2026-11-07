# Shared Godot native core ·0.5.40

Source snapshot of accepted iPhone g40/0.5.40(49), shared with the free Web build. No maps, skill catalog, saves or private telemetry are present here. Optimized algorithms and API retain the accepted baseline; later fixed tuning revisions are recorded below; edition content and entitlement controls belong to Godot scripts/data.

The pinned Godot4.6.2/godot-cpp4.6 single-precision dependency, SCons version and compiler flags are in dependency-lock.json. Sources are content-hashed in source-manifest.json. Native build evidence and Web SDK/template pins are recorded in docs/qa/2026-11-03-common-g40. Public distribution contains the built side module; this source directory is outside the exported Godot project.

SConstruct expects vendor/godot-cpp at the pinned commit and SCons4.11.1, using the corresponding platform SDK. Web uses Emscripten4.0.20, single-thread GDExtension-compatible Godot template. User owns runtime verification; do not run scenes or tests from an assistant session.

Rebuild in an isolated directory, not directly beside this folder: copy `src/`, `SConstruct`, `build-profile.json` into `work/extension`; create `work/project/native_core/bin`; clone pinned `vendor/godot-cpp` under `work/extension`. From that directory, after activating the SDK, run:

```sh
scons platform=web target=template_release arch=wasm32 threads=no api_version=4.6 precision=single build_profile=build-profile.json production=yes lto=full optimize=speed -j6
```

Output: `work/project/native_core/bin/libpp_core.web.template_release.wasm32.wasm`. Name its published copy `libpp_core-g40-<first16-of-sha256>.wasm`; update the Web library path in the free `.gdextension` and its provenance.json hashes before rebuilding the free release. Retain old immutable files. For macOS, use platform=macos/arch=arm64 and the same pinned profile; no Web/iPhone code is run by compilation. Full SDK/template acquisition and hashes are in the release QA report.

##2026-11-07 tuning comparison

Destruction-midpoint0.5.53 changes only the fall internal bond-resistance literal in world_kernel.cpp from0.02 to0.03. No other kernel computation/API is changed. Source manifest and rebuilt Web/macOS provenance identify this separate tuning revision; the earlier immutable published kernel remains preserved. Native iOS/Web plus Android library build evidence is in docs/qa/2026-11-07-destruction-midpoint. Runtime remains user verification.
