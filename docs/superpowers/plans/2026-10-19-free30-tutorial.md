# Free first-run tutorial implementation plan

**Goal:** Teach one real demolition, collection, settlement and upgrade without changing desktop or mobile attack timing.

**Architecture:** A fixed introductory site and optional persisted tutorial phase live only in free30. A small guide module owns context-sensitive copy and tutorial overlay; it observes real world state. Reuse input, renderer, physics and transaction-safe saves.

**Constraints:** PC attacks on press. Touch aims at existing offset pointer and attacks on release. Two-finger gestures never fire. Existing players/saves and older demos remain intact. No invented collected pixels or gifted upgrade currency. First upgrade is followed by an explicit next-map action. Footer tips rotate each game without shrinking the full-width map.

- [x] Add behavior tests for fresh tutorial, legacy-save migration, one upgrade then next map, insufficient collection/retry, save failure, and real first-shot physics/collection.
- [x] Implement `FREE_TUTORIAL` in `src/free30/sites.js`; optional `tutorial` states intro/upgrade/next/done in `journey.js`. Fresh random dispatch selects tutorial; legacy saves default done. Settlement advances only with >=80 available parts. Successful first purchase moves to next; next dispatch completes. Skip is a saved transaction, no rewards.
- [x] Add `src/free30/tutorial.js` and CSS: nonblocking radial gradient around actual aim, highlighted pillar, concise phased text, skip; actual accepted shot and collection drive progression. Adapt copy to actual pointer type. Bottom tips every 9 seconds of active gameplay, no timer progression when paused.
- [x] Wire main and HTML: first-play CTA, settlement amount at top, recommended first-upgrade card then next-map CTA; keep low-funds retry and existing save-error retry. Manual repeat practice uses same honest collection accounting.
- [ ] Run free30 and input regression suites, build isolated free bundle, inspect PC flow and touch events/browser narrow viewport. Review diff, commit/push and verify Cloudflare plus public page. Real-device QA remains user verification.

Validation before release: free30 18/18, input 28/28, legacy suite/build pass. PC UI walkthrough recovered 107 actual pixels, purchased first upgrade for 80, and entered normal map. 390px iframe layout inspected; not real device QA. Review caught and fixed false progression on empty blast and settlement latch during pending skip save.
