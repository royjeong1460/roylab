# Result-before-workshop Implementation Plan

> Execution: inline with source review; user approved reusing the earlier result page. Runtime tests/scenes/browser gameplay/device launch are prohibited by project instructions.

**Goal:** Add a deliberate result step after successful settlement; keep the workshop header limited to title and wallet, and let a named Detailed results action reopen the result page.

**Architecture:** Reuse Screens receipt/chapter routes, existing reward/unlock builders and EnvironmentReceipt. Preserve settlement and destination helpers. Keep full menu/equipment work, original assets, economy, maps, save schema and platform adapters unchanged. Native0.5.65(75), Web immutable package with existing0.5.41 shell.

## Tasks

- [x] App flow: finish_run routes to receipt/chapter after existing journey.finish. Preserve artwork award and native ad settlement count. Workshop/result navigation carries an immutable receipt plus optional workshop context; no payout on navigation. System Back from reopened results returns to its workshop tab.
- [x] Result page: reuse reward/unlock/region-progress/first-region restoration illustration; visible status and existing receipt values. Fixed footer primary Upgrade, secondary actual departure, exact-map retry and map list; avoid duplicate tutorial-upgrade/retry destinations. Keep all targets44px minimum and long labels clipped with tooltip.
- [x] Workshop: title+wallet only, icon adjacent to number. Footer Detailed results opens full result page; preserve tabs/equipment/results destination and tutorial. No separate result banner or gain subline in header.
- [x] Review source paths: failure/normal6/boss/finalboss/tutorial, gallery return, settings and receipt context, native interstitial boundaries and Web bridge. Campaign/economy/save/physics/assets/maps stay byte-identical to0.5.64.
- [x] Import/compile-only/export Web and native. PCK modules and encoded/decoded hashes; Xcode Release and strict signature. No scene/tests/replay/app/browser execution.
- [ ] Publish Web with static HTTP verification; update-install iPhone with same bundle and no uninstall/reset/launch. Record CURRENT/delivery/rollback and user validation separately.
