# Hide diagnostic overlays ·2026-11-11

User requested hiding top test/information panels on public free Web and iPhone. Approved scope is UI visibility only: disable forced attack_trace, keep performance_overlay default false, ignore legacy diagnostics.cfg visibility without the new visibility_revision1, and keep the existing battery five-tap performance toggle. New toggle choices save revision1 and retain their persistence. Old preferences/progress/journals are not deleted or reset. The attack tracer is disabled by project setting; the performance toggle does not enable the attack panel.

## Execution checklist

- [x] Read CURRENT/delivery; remote main0785c2d matches isolated worktree. Primary dirty source preserved.
- [x] Preserve0.5.56 source/app and hash all baseline project inputs.
- [x] Same diagnostics helper on Web/native; explicit false flags; native0.5.57(67).
- [x] Godot import/check-only/pack, Xcode Release and signature/package checked.
- [x] iPhone update-installed after user reconnected/unlocked; sequence4512, no app launch.
- [x] Web import/compile/export/site build and15static public HTTP responses/decoded hashes checked.
- [x] Ledger/CURRENT updated; approved update published and .56 rollback retained.

Static review cases: missing config -> false; old config visible=true/no revision -> ignored/false; revision1 visible=true saved after explicit five taps -> true; set_enabled(false) -> revision1/false. No campaign profile/ledger IO is added. No runtime tests/scenes/browser/gameplay: user owns visual/save/device confirmation. No C++/physics/skills/maps/economy/collection/input/layout code changes.

Native build/signature verification passed. Installation attempt returned CoreDevice4000 (connection reset by peer), with no successful install or launch. The .56 installed/current version is retained until a successful .57 receipt. Web export/static site/package checks passed; public deployment continues independently.

## Final delivery

Web free-0541-cfbbdac90df2 published successfully (release4706b99; Pages284aa495-0ee7-44ab-8301-1e383f38d60c).15static public responses and all payload/decoded hashes match. Native0.5.57(67) update-installed as sequence4512 after the user connected/unlocked; a transient installation connection interruption was resolved on retry. Same app ID/save directory; no uninstall/reset/launch.

The old .56 app/source and prior public payload are retained. Physics/native libraries/skills/upgrades/maps/collection/input remain byte-identical. The revision gate concerns only diagnostics.cfg visibility; old ON flags are ignored until a new explicit five-tap choice is saved. Visual/device/save validation remains user-only; no tests, scenes, simulations, browser or device-app runtime were performed.
