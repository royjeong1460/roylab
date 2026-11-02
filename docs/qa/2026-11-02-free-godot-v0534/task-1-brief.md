# Free web v34 synchronization implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Execute continuously within the approved update scope.

**Goal:** Publish the approved pre-v35 common game changes to the existing Roylab free mobile web.

**Architecture:** Three-way compare the frozen paid 0.5.9 baseline, the isolated free release, and frozen paid 0.5.34. Preserve free adapters/content/storage and port shared changes. Export new immutable Godot assets and deploy only this isolated branch.

**Tech Stack:** Godot 4.6.2, GDScript, Vite shell, Next static export, Cloudflare Pages via existing Git production integration.

## Global constraints

- Current release decision: **exclude v35 while its reported regression is investigated; include frozen v34 common changes**. The user authorized updating the free web; this exclusion is not an additional quoted user instruction. Use only `/Users/roy/Developer/sand/variants/godot-paid-port/qa/workshop-wallet-skip-2026-11-02/project` as the new paid source. The live paid tree is v35 and MUST NOT supply game code.
- Original paid baseline: `/private/tmp/pp-music-v5-v059-20261101/godot`.
- Work only in `/private/tmp/planet-audio-release-20261029`, branch `codex/free-godot-v0534-20261102`, base `80297fc`. Preserve dirty primary checkout and paid source/device app.
- Free content: exactly Arch tutorial + six normal maps + boss; three skills aftershock/relay/orbital; one passive and one active slot; five other regions remain locked previews. Preserve free economy, original free maps, unlimited existing upgrades, settings, storage keys, browser import/locking/telemetry and quiet v5 music.
- Include common pre-v35 physics, sand surface/sleep, cache/connectivity/fracture improvements and associated presentation/campaign UI changes, including current collection flow and workshop parts display. Do not introduce further tuning or claim FPS improvements. The newer user request supersedes old v0.5.9-only common-behavior pinning in free AGENTS/README; preserve their free entitlement/storage constraints.
- No gameplay/tests/scenes/replays/browser or device execution. User owns runtime testing. Allowed: source review, Godot import/check-only/export, Vite/Next builds, static package/HTTP checks and deployment. Do not run any game scene to validate.
- Public performance overlay remains off; profiler must follow its enable flag. No paid debug overlay forced onto the public game.
- Preserve stable `PlanetPatchupGodotFreeWeb` user directory, migration and Web Locks, existing immutable assets and archived Phaser/editor routes.
- Label free package `0.5.34` / manifest `0.5.34-free`; content-address its new assets. Retain old payload header entries.

## Task 1: Integrate common source and packaging metadata

**Files:** `demos/planet-patchup/godot-free/{*.gd,app/,campaign/,presentation/,platform/,data/,assets/,project.godot,export_presets.cfg,AGENTS.md,README.md}`, `demos/planet-patchup/scripts/build-godot-free.mjs`, relevant free shell balance/build label only, `docs/qa/2026-11-02-free-godot-v0534/`.

**Interfaces:** preserve `FreeEdition`, free Web bridge, profile import/store contracts. Shared physics constructors/methods and new helper classes must match frozen v34 consumers.

- [ ] Inventory source hashes and compare every free `.gd` against old paid and new paid. Source baselines are recorded in QA JSON. For unchanged free/shared files copy new v34 only when changed. Use a three-way merge for free-specific files, resolving conflicts in favor of the explicit free contracts plus latest common behavior.

```sh
git merge-file -p FREE_FILE OLD_PAID_FILE V34_PAID_FILE
```

- [ ] Bring required new helpers (section/connectivity/probe/grain drawing and presentation dependencies), preserve skill allowlist and free world filtering, and inspect changed call sites. No data/catalog/skill/map wholesale copy. Port only shared locale additions and Arch/shared asset references needed by changed rendering, keeping paid-exclusive assets out. Do not copy unrelated paid culture map/art updates.
- [ ] Keep free browser settings/import/journal/profile namespace code unless a common change explicitly requires an additive integration. Keep free haptics browser boundary and quiet v5 music.
- [ ] Version free project and builder. Replace hardcoded current stem/version with `0.5.34` / `free-0534-<hash>`. Retain old engine assets and widen exact header stem recognition to existing `free-059-*` plus new `free-0534-*`, without changing gzip-payload transport protocol.
- [ ] Update free README/AGENTS to document approved v34 baseline, v35 exclusion and unchanged free contracts. Write integration report with per-file merge decisions, unchanged map/economy/storage hashes and runtime boundary. Check source whitespace; inherited unchanged whitespace need not be reformatted.
- [x] Source handoff prepared without a commit as explicitly requested by the root. Root owns review, compile/export, commit and deployment.
