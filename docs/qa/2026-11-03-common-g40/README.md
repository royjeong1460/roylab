# Common g40 release evidence

Release base bda5601, isolated branch codex/free-godot-v0540-20261103. The user's free-update/deploy instruction is explicit. User owns all game/browser/device/testing. Agents perform source review/import/check-only/build/export/static package and HTTP verification only.

- before-release.json: scope and adopted app baseline.
- free-integration-report.md and source-review.md: source merge, entitlement/storage/asset preservation and independent review.
- native-web-report.md / native-web-static-inspection.json / template hash evidence: pinned Web build and official template extraction. Not runtime evidence.
- g38-to-g39.patch / g39-to-g40.patch: inspectable source changes, no private media/device identities.
- build-free.log and build-next.log / release-manifest.json / delivery.json / http-verification.json: actual completed stages, each recorded separately.

Native app source/hash/install records remain under local variants/godot-paid-port/qa/perf-g40-2026-11-03. Source images/video and raw receipts/saves are not published. See ../../planet-patchup-version-history.md and ../../planet-patchup-versions.json for current status. Previous public commit/assets remain rollback paths; no save reset/uninstall is part of rollback.

## Web rollback

`python3 docs/qa/2026-11-03-common-g40/rollback-web.py` is a guarded dry-run; `--apply` restores only the three public entry/manifest files from bda5601 after checking their current hashes. Keep every0534/0540/native payload and _headers entry so already-open/cached clients still load. Review diff, update ledger, run normal static site build/deploy and HTTP verification. Do not use a blind full revert that deletes cached-client assets; never reset browser saves. The native app has its independent g39 source/app rollback.
