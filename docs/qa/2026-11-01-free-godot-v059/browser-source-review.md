# Task 2 browser shell review

What this change does: Adds a Godot free-web bridge with a protected legacy-save snapshot, exclusive writer lock, existing free analytics, and a standalone feedback dialog. It preserves the original Phaser transport and raw save strings.

**Verdict: Approved for the Task 2 source scope.** No concrete blocking source defect found in the three-file review diff.

## Reviewed contract and connected code

- Read the fixed Task 2 brief, shared free-Godot constraints, implementation report, and the complete three-file diff once. Read existing `src/arch/analytics.js`, the original `src/arch/web-feedback.js`, and the Godot bridge plus the app's feedback/pause callback paths for the named integration risks. Assumed normal single-player browser use with multiple tabs possible.
- `shell.js:111-142,149-157`: Does not replace `PPFreeWebReady`. Acquires the dedicated exclusive lock with `ifAvailable` before preparation/resolution. Missing Web Locks, a competing writer, and preparation failure show meaningful fatal notices and reject the injected readiness promise. The successful lock callback remains pending and has no pagehide release.
- `shell.js:7-11,92-109,134-138`: Reads only the four free legacy slots, exact journal prefix, and sound setting under the old exclusive lock. Raw slot/journal strings remain unparsed and unchanged. Cached methods are synchronous JSON strings. Lock/read failure yields an explicit error snapshot and recovery notice instead of an absent-save result. No legacy writes or removal are present.
- `shell.js:53-88`: Maintains one active adapter, mutating its site/world/flags in place for matching IDs. This satisfies `FreeAnalytics` identity guards without an accumulating run map. Start/frame/finish/abandon/purchase and screen events map to existing methods. The pagehide handler abandons a live analytics run before page-exit events.
- `shell.js:114-132`, `feedback.js:28-31,52-57`: Opens one dialog, retains the callback, reports true on open and false on actual close. Analytics switches to feedback menu time; the engine callback owns whether the game resumes. Source tracing through the core pause/resume callback supports restoration for a previously running run and continued pause for an already-paused run.
- `feedback.js:6-13,33-49`: Preserves issue values, required 1-5 rating, 1000-character comment limit, and explicit form submission. Answers remain on failure, retries keep the submission ID, edits clear it, and success resets it. Existing `FreeAnalytics.feedback` also retains timestamp and distinct ID for the same submission. Statistics opt-out remains available even when feedback is unconfigured.
- `shell.js:31-38,117-120`: Reuses config, identity, consent, survey IDs, visit-source handling, and local/QA/preview exclusions from `FreeAnalytics`. Its existing explicit-feedback path supports feedback with statistics off. No cached save/journal data is passed to analytics; only run metadata and feedback fields reach its existing transport.
- `shell.js:139-147`: Restores canvas focus and sends preview query URLs to the same-origin archived Phaser path with search/hash preserved. CSS is imported by the shell entry.

## Cross-task checks and limits

- Task 3 must verify its injected promise/resolver/rejector, module-load error handler, await-before-`Engine.startGame` ordering, emitted CSS/script inclusion, canonical routing, and dedicated IDBFS mount. The shell side of that contract is consistent; Task 2 approval is not approval of the generated startup wrapper or release package.
- Archive availability, original hashed assets/editor retention, package contents, server headers and deployed hashes belong to integration/release checks.
- Source review does not establish browser rendering, actual cross-tab exclusion, migration durability/readback, delivery or receipt of feedback/analytics, browser lifecycle/cache behavior, audio/gameplay, or device readiness. Those remain within the user's validation boundary.
- No tests, syntax/build repeats, browser/runtime/telemetry probes, scenes, simulation, device launches, commits, or source edits were performed for this review. The implementation report's prior syntax/bundle results were not independently repeated.
