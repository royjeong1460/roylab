# g40 native Web compile and official template evidence

Date: 2026-11-03. Scope: source copy, SDK acquisition, native compile/link, archive and WebAssembly static metadata inspection only. No gameplay, tests, replay, browser, scene instantiation, device launch, or runtime probe. Original g40 sources, installed app, and release worktree were not edited.

## Deliverables

- Web native side module: `native-build/project/native_core/bin/libpp_core.web.template_release.wasm32.wasm`, 1,653,903 bytes, gzip 311,046 bytes. SHA256 `933aa18db7e2de4a19c87ab439960650474a783da188de42cf901347db25f2d7`.
- Frozen matching macOS import library copied from g40: `native-build/project/native_core/bin/libpp_core.macos.template_release.arm64.dylib`, 616,528 bytes. SHA256 `786748abb43e66cbd8e066eabfb1108894fc852ef9a2194cdc5d2ee0471fcac4`. This is a byte copy, not a new macOS build.
- Official Godot 4.6.2 single-thread GDExtension template: `/Users/roy/Developer/sand/.local-tools/web-g40/web_dlink_nothreads_release.zip`, 11,189,445 bytes. SHA256 `d19564ebc3602f80e78d6b9c3951affc90b5512d0471f8ac74f6c603c912aab5`.
- Emscripten SDK: `/Users/roy/Developer/sand/.local-tools/web-g40/emsdk`.

## Frozen source and dependency identity

Canonical source: `../perf-g40-2026-11-03/extension/src`. All 19 C++/header files copied into `native-build/extension/src` and SHA256-verified against the original before and after compile. Per-file hashes: `native-build/g40-source-sha256.json`.

Pinned godot-cpp: repository [godotengine/godot-cpp](https://github.com/godotengine/godot-cpp/tree/e103d348c4b2d8df7b819126d855e19381cb9a87), commit `e103d348c4b2d8df7b819126d855e19381cb9a87`, API `4.6`, precision `single`. Copied all 203 tracked files from g40's vendor checkout, excluding its platform build outputs and Git metadata; every copied tracked source file hash matches the canonical vendor checkout. See `evidence/godot-cpp-tracked-source-sha256.json`.

`build-profile.json` and `dependency-lock.json` are exact copies of g40. The only SConstruct change in the isolated build copy is an explicit `.wasm` suffix for Web output. Without that suffix SCons treats `.wasm32` as an existing extension and writes the same valid module under an extensionless-to-Godot filename. The initial and corrected outputs have the same SHA256. No C++ source changed.

## Pinned toolchain

- Godot expected editor/runtime version: `4.6.2.stable.official.71f334935`; template archive marker extracted as `4.6.2.stable\n`.
- Emscripten `4.0.20`, compiler revision `6913738ec5371a88c4af5a80db0ab42bad3de681`.
- emsdk Git tag `4.0.20`, commit `e4fe26ef59168ff44f4c23c466e497bf60b3411e`.
- Activated SDK `sdk-releases-c387d7a7e9537d0041d2c3ae71b7538cc978104e-64bit`.
- SDK Node `22.16.0`; SDK Python `3.13.3`. SCons itself uses the existing pinned venv Python `3.14.6`.
- SCons `4.11.1`, revision `b97f32b9adab83a96af767ec1d7dc8d7a41c7c74`.
- C++17; release speed optimization, full LTO, exceptions disabled, no fast-math, `-ffp-contract=off`.

Compiler choice follows the release-era official [Godot build container](https://github.com/godotengine/build-containers/blob/4150d2a1b766cc3ae7028fc477e677f57ab0bcd2/Dockerfile.web), which pins Emscripten 4.0.20. The [Godot 4.6 documentation](https://docs.godotengine.org/en/4.6/engine_details/development/compiling/compiling_for_web.html) requires Emscripten 4.0.0+ and documents `threads=no` and `dlink_enabled=yes`. The pinned godot-cpp Web tool supplies `SIDE_MODULE=1`, `WASM_BIGINT`, and wasm longjmp. Compiler, linker, SDK manifest and runtime binary hashes are in `evidence/toolchain-file-hashes.json`.

## Template provenance and inspection

Source: official [Godot 4.6.2 release asset](https://github.com/godotengine/godot-builds/releases/download/4.6.2-stable/Godot_v4.6.2-stable_export_templates.tpz). Release metadata is saved in `evidence/official-godot-release.json`. The full archive has declared size 1,251,900,388 bytes and official declared SHA256 `942366dc4e27e7686a99da4d3cfb1b8ae8d3eb9444f6d8217eef16245b599ef2`.

Only archive central-directory tail, target member range, and version-marker range were downloaded over official HTTPS. The full archive was not downloaded, so its declared SHA256 was not locally validated. Target member at offset 1,000,832,126 has deflated size 11,095,742 bytes and ZIP CRC32 `c9873297`. Decompressed size/CRC match the archive directory, and every inner ZIP member passed CRC verification. Local SHA256 above is calculated from the extracted template. See `native-build/official-template-members.json` and `evidence/official-template-members-sha256.json`.

Template includes `godot.js`, `godot.wasm`, `godot.side.wasm`, HTML/service-worker/audio worklets. Preserve and content-hash **both** engine wasm files when packaging the release: dlink engine main `godot.wasm` is 1,509,558 bytes, engine side `godot.side.wasm` is 41,124,149 bytes. Neither engine module imports or defines shared memory (static flags inspected).

The native module contains `dylink.0`, exports function `pp_core_init`, and imports nonshared memory with flags 0. Static inspection script: `native-build/inspect_wasm.py`; output: `evidence/native-web-static-inspection.json`. This establishes metadata/build identity only; no loading, runtime compatibility, performance, or gameplay verification is claimed.

## Required free export integration

Suggested `.gdextension` free-only manifest:

```ini
[configuration]
entry_symbol = "pp_core_init"
compatibility_minimum = "4.6"
reloadable = false

[libraries]
macos = "res://native_core/bin/libpp_core.macos.template_release.arm64.dylib"
web.release.nothreads.wasm32 = "res://native_core/bin/libpp_core.web.template_release.wasm32.wasm"
```

Retain only shipped platforms. The existing broad `web.wasm32` also matches, but explicit `release.nothreads` documents the available artifact. No threaded/debug native artifact was built.

Export preset:

```ini
custom_template/release="/Users/roy/Developer/sand/.local-tools/web-g40/web_dlink_nothreads_release.zip"
variant/extensions_support=true
variant/thread_support=false
```

Exact Godot 4.6.2 exporter source saved as `evidence/godot-4.6.2-web-export-plugin.cpp` verifies these option keys and adds `nothreads`, `web_extensions`, `wasm32` export feature tags. Official source: [export_plugin.cpp](https://github.com/godotengine/godot/blob/4.6.2-stable/platform/web/export/export_plugin.cpp). Keep free-only catalog/storage/analytics/assets controlled by the release integration; the native kernel source does not vendor paid catalog data.

## Reproduce native build

Prepare an isolated copy of the canonical C++ sources, SConstruct (with Web `.wasm` output suffix), build profile, and tracked pinned vendor sources as above. Download and activate the official emsdk tag:

```sh
git clone --depth 1 --branch 4.0.20 https://github.com/emscripten-core/emsdk.git /Users/roy/Developer/sand/.local-tools/web-g40/emsdk
cd /Users/roy/Developer/sand/.local-tools/web-g40/emsdk
./emsdk install 4.0.20
./emsdk activate 4.0.20
source ./emsdk_env.sh
cd /Users/roy/Developer/sand/variants/godot-paid-port/qa/web-release-g40-2026-11-03/native-build/extension
/Users/roy/Developer/sand/variants/godot-paid-port/qa/cpp-core-2026-11-03/extension/.venv/bin/scons platform=web target=template_release arch=wasm32 threads=no api_version=4.6 precision=single build_profile=build-profile.json production=yes lto=full optimize=speed verbose=yes -j6
```

SCons installation alternative for a new machine: create a Python venv and install `scons==4.11.1`. Web output is placed in `../project/native_core/bin/` by SConstruct. Build logs: `evidence/native-web-build.log` (full compile) and `evidence/native-web-build-final.log` (corrected-name link, explicit linker flags), both exit 0 with `scons: done building targets.` The benign macOS compiler-detection warnings about `DARWIN_USER_TEMP_DIR` did not stop the Web build.

The official template is already compiled; no engine rebuild was necessary. For source template rebuild the corresponding official flags are `platform=web target=template_release production=yes threads=no dlink_enabled=yes`, using exact Godot `4.6.2-stable` and the same Emscripten pin. Such an engine rebuild was not performed here.
