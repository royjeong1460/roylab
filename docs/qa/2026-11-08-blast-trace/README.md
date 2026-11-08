# Per-blast diagnostics ·0.5.55(65)

User approved attack-by-attack radius/direct/additional pixelization display, retained local records, unchanged physics/skills, rollback and iPhone update installation on2026-11-08. This is a diagnostic candidate, not a balance correction or public release.

## Reading the panel

- `실제 반경`: the exact logical-cell radius argument used by that primary blast, not a value inferred from the animation. `직접 최장`: maximum distance of an existing direct cut candidate; no new pixel scan. `!범위밖` flags a maximum beyond radius+0.00001.
- `직접`: exact native cut candidate count. `추가`: pixel conversions during the same synchronous detonation from split fragments/limits/support breaks; it excludes direct cuts. `미분류`: observed new-grain/collected delta minus direct, additional and nested detonation results, so uncovered routes remain visible.
- `추가` breakdown: small fragments, body-limit conversions, other conversions. `extraByPhase` in the JSON separately shows blast-cut versus blast-halo conversions. Halo radius/strength/changed bond count are recorded; halo radius is a bond-damage reach, not the direct removal radius.
- `이후`: conversions observed after that primary until the next primary, subdivided by pressure/fall/chain/collision/support/wear. This is explicitly temporal-only correlation, not proof that the preceding shot caused it. Secondary detonations have separate rows with their actual radius and type; they do not overwrite the last primary HUD.
- The previous primary remains in the last line for video comparison. The compact panel is always visible only in this candidate via `diagnostics/attack_trace=true`. The existing optional performance overlay and five-tap battery toggle are retained. Public web settings remain absent/OFF.

## Recording

The existing journal checkpoints (each5simulation seconds, pause/background, results and Export records) add `records[].attackTrace`. This preserves the existing atomic temp-file/write/rename path and warning behavior, with no new per-shot disk write or network telemetry. Export through Settings → Export records to include the trace. Normal app termination/background checkpoints retain the newest results; abrupt termination can lose work since the last5-second checkpoint.

Each run keeps up to512 detonation rows and2048 batched conversion events with explicit drop counts. Current per-shot counters continue updating after truncation. No per-pixel diagnostics/logging, duplicate grain creation, simulation work or randomness was added. Diagnostic rendering/checkpoint serialization has observation overhead; it is not an FPS benchmark build.

## Preservation and checks

Baseline:qa/ios-pressure-scope-2026-11-08. Its project hashes and0.5.54(64) app are retained. C++ core libraries, skill_physics, chain_physics, piece physics, grain physics, bearing, campaign economy/run/save logic,43map files plus the external fixture (44authored inputs) are byte-identical. Removing observer-only lines restores the old world/impact/black-hole adapters exactly; static-verification.json records this source check.

Godot4.6.2 import/check-only/pack and Xcode Release build passed; signature validation passed with keychain access. The existing0.5.54 exported Xcode project/dependency configuration was copied to a new directory, versioned0.5.55(65), and its PCK replaced with the new export. No engine/library change or package dependency resolution update. The new app bundle remainscom.roy.planetpatchup.godotcompare and the user data directory remainsPlanetPatchupGodotPaid.

The assistant did not run tests, scenes, simulations, gameplay, a browser or the device app. Actual counter correctness/readability, exported device records and gameplay feel remain user verification.

## Delivery and rollback

Build/signature/package verification:package-verification.json. Install status:device-install.json/device-install.log and delivery.json. The first installation attempt was blocked by CoreDevice4016; awaiting a reachable/unlocked physical iPhone. CURRENT remains0.5.54 until installation succeeds.

Rollback app:`../../native/build/ios-pressure-scope-2026-11-08-derived/Build/Products/Release-iphoneos/PPGodotCompare.app`. Update-install it in place (never uninstall/reset), then restore prior-current.json. No public web deployment was performed.
