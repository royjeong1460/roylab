# Planet Patchup production credits audit · 2026-11-14

Read-only source/package audit. Baseline is CURRENT native0.5.66(76) `qa/ios-skill-explainer-2026-11-14/project`, its iOS export/app, and linked Web source `variants/web-blast-cost-release-20261106/demos/planet-patchup/godot-free`. No product files, games, tests, scenes, browser, imports or builds were changed/run.

## Recommended concise entries

| Group / scope | Display entry and exact evidence |
| --- | --- |
| 제작 / both | **기획·개발 · Roy**. Existing current credits say Created by Roy. Do not invent separate stock-art/music authors. |
| UI font / adopting both | **NeoDunggeunmo Pro · Dalgona. · SIL OFL1.1**. Exact notice: `Copyright (c) 2022, Eunbin Jeong (Dalgona.) <project-neodgm@dalgona.dev>, with Reserved Font Name NeoDunggeunmo Pro.` Official project https://github.com/neodgm/neodgm-pro . Root is adopting officialTTF1.020; previous current PCK still has Galmuri. |
| Included font / both, legal list | **Galmuri11 · quiple(Lee Minseo) · SIL OFL1.1**. Exact local OFL notice: `Copyright &copy; 2019–2025 Lee Minseo (quiple@quiple.dev)`. Source https://github.com/quiple/galmuri and https://galmuri.quiple.dev . Keep this while the old font remains bundled even if UI switches to NeoPro. |
| Engine / both | **Godot Engine4.6.2 · MIT / third-party notices**. Exact MIT: `Copyright (c) 2014-present Godot Engine contributors (see AUTHORS.md). Copyright (c) 2007-2014 Juan Linietsky, Ariel Manzur.` Source https://godotengine.org/license/ . Keep the full Godot-COPYRIGHT text as well; it covers the engine's embedded third-party components instead of fabricating a short exhaustive list. |
| Core binding / both | **godot-cpp · Godot Engine contributors · MIT**. Exact: `Copyright (c) 2017-present Godot Engine contributors.` Source https://github.com/godotengine/godot-cpp . The original notice lives in native source, but the shared C++ core is used on Web too, so the entry is BOTH platforms. Web provenance identifies godot-cpp commit e103d348c4b2d8df7b819126d855e19381cb9a87. |
| Native plugin / iOS only | **Godot AdMob Plugin5.1.0 · Poing Studios · MIT**. Exact: `Copyright (c) 2020-present Poing Studios`. Source https://github.com/poingstudios/godot-admob-plugin . Version/author from addons/admob/plugin.cfg. |
| Included plugin font / iOS only, legal list | **Noto Sans CJK SC · Adobe / Google · SIL OFL1.1**. Actual bundled addon file name NotoSansSC-Regular.otf; SFNT name table copyright is exactly `© 2014-2021 Adobe (http://www.adobe.com/).`; CFF metadata says `Noto is a trademark of Google Inc.`. Root located official matching full license at https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/LICENSE . No local standalone OFL file was present in the current addon; preserve the official text root retrieves. |
| Google integration / iOS only | **Google Mobile Ads SDK13.9.0 / User Messaging Platform3.1.0 · Google**. Actual app Frameworks include both binaries; native Package.resolved identifies versions and official repos https://github.com/googleads/swift-package-manager-google-mobile-ads and https://github.com/googleads/swift-package-manager-google-user-messaging-platform . Use official integration links/SDK terms, not a claim that the binary SDK is Apache2.0. The local Swift wrapper LICENSE files are Apache2.0 and their Package.swift header says Copyright2021GoogleLLC; that does not establish the binary SDK's license. |
| Web integration / Web only | **웹 통계·피드백 연동 · PostHog** · https://posthog.com . The project-authored FreeAnalytics in src/arch/analytics.js POSTs via fetch to a configured PostHog endpoint. shell.js imports only local JS/data/CSS. No posthog-js/React import, external PostHog CDN load or bundled PostHog SDK was found. Active collection is not verified; local compiled shell had no configured token literal detected. Credit integration without inventing an SDK notice. |
| 제작 도움 / optional acknowledgment | **개발 지원 · OpenAI Codex**. Production assistance, not a runtime SDK. **픽셀 편집·프레임 출력 · Aseprite** is also source-backed if listing actual authoring tools: the two shipped10/29VFX READMEs document Aseprite batch/native frame checks and original .aseprite files. These tools are not bundled; do not label their licenses as runtime asset licenses. |

## Exact existing local notice sources / copy inputs

Shared Web notices already exist under:
`/Users/roy/Developer/sand/variants/web-blast-cost-release-20261106/demos/planet-patchup/godot-free/licenses/`

- `Godot-MIT.txt`
- `Godot-COPYRIGHT.txt`
- `Galmuri-OFL.md`

NeoPro original full OFL:
`/Users/roy/Developer/sand/deployment/roylab/demos/planet-patchup/design-preview/menu-flow-v3-2026-11-14/font-study/fonts/NeoDunggeunmoPro-OFL.txt`

Same font-study `sources.json` records official license URL https://raw.githubusercontent.com/neodgm/neodgm-pro/main/LICENSE.txt and SHA256 e3e0fdfb8349c52d3e7075c008d5c1456922ab1b0d80180b4b1b77377da34b4a.

godot-cpp exact original notice:
`/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-skill-explainer-2026-11-14/project/native_core/GODOT_CPP_LICENSE.txt`

Poing exact original notice:
`/Users/roy/Developer/sand/variants/godot-paid-port/qa/ios-skill-explainer-2026-11-14/project/addons/admob/LICENSE`

Google wrapper licenses (keep distinct from binary SDK terms):
`/Users/roy/Developer/sand/variants/godot-paid-port/native/build/ios-interstitial-2026-11-06-derived/SourcePackages/checkouts/swift-package-manager-google-mobile-ads/LICENSE`
`/Users/roy/Developer/sand/variants/godot-paid-port/native/build/ios-interstitial-2026-11-06-derived/SourcePackages/checkouts/swift-package-manager-google-user-messaging-platform/LICENSE`

Native package identity/version source:
`/Users/roy/Developer/sand/variants/godot-paid-port/native/build/ios-skill-explainer-2026-11-14/PPGodotCompare.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved`

Noto full OFL was not in the current local addon; use the official Sans/LICENSE text root has retrieved and preserve its copyright/trademark.

## Actual bundled evidence and omissions

- Current native PCK directory has1218entries and includes imported Galmuri/Noto fontdata. There are **no** license/OFL/copyright/NOTICE entries, including native_core/GODOT_CPP_LICENSE.txt and addons/admob/LICENSE. Merely leaving txt/md in the project is insufficient with current export filters.
- Current Web PCK likewise has no notice entries. Its build script explicitly copies `licenses/` as external static files, so public Web notices exist but are not usable automatically as native res resources. A shared `data/credits.json` containing original full notice strings is compatible with both current `include_filter="*.json"` presets. Verify the JSON in both final PCKs. Keep separate Web static license copies too.
- Existing Credits popup only displays Roy and Galmuri11; it omits the engine, core and native plugin/SDK/font details above. A concise list plus an original legal-text viewer addresses that.
- Google binary SDK terms text was not found as a local standalone license. Do not treat SPM wrapper Apache2.0 as the binary SDK terms.

## Exclusions and asset provenance

**Exclude PixelFX from shipped credits.** No current catalog/code/PCK path references PixelFX. All23current catalog VFX PNGs byte-match the project-authored `design-preview/skill-vfx-2026-10-29` and `skill-vfx-expansion-2026-10-29` sheets. None matches any of13PNG candidate files in the two PixelFX research directories. Their MIT/NOTICE sources are present in `.local-tools/pixelfx/` and `design-preview/skill-vfx-pixelfx-2026-11-06/`, but those candidates were not shipped. Never include its separately licensed Patch Pixel font as though it were used.

No third-party stock-art/music author was found in current provenance. The3core SFX have source scripts explicitly stating original/no external samples:
`variants/demolition-mvp/design-board/audio-v3-metal-collect/synthesize.py`, `audio-v4-blast/synthesize.py`, `audio-v6-metal-ticks/synthesize.py`.
Current source manifest selects project `quiet-background-v5-94bpm-32bars` music and retains oldv10 files. The current source records are `data/source-manifest.json`, `assets/salvage/README.md`, and `docs/2026-11-01-bgm-v5-delivery.md`; they establish local source paths, not a separate stock-composer attribution. Do not invent one.

Do not list Phaser, React, every npm dev dependency, unused research fonts/tools or copied editor infrastructure as current game runtime libraries. The actual Web Godot shell is local plain JS; package.json alone is not evidence of runtime use.

This is an evidence/attribution inventory, not a legal certification or runtime validation. No source edits were made.
