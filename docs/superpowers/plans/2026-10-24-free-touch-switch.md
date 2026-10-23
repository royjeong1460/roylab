# Free touch switch implementation plan

Goal: Expose the two approved mobile control schemes in free edition settings, preserving campaign progress and PC behavior.
Architecture: Persist one independent preference (default legacy). Rebind only pointer listeners when switching in a paused run; retain world/camera/battery/profile. Tutorial2 and other experiments keep their fixed mode. Reuse existing select styling in home options and pause menu.

- [x] Add preference + settings UI module with invalid-value/storage-error checks and synchronized selectors/help.
- [x] Extract scene input binding into a reusable method; apply mode to cursor, guide, tips and release timing immediately.
- [x] Test mode persistence, switching in both directions, original/tap gesture regressions; verify pause/resume and progress in browser.
- [x] Build only public free edition; deploy and live verification follow commit. Physical iPhone gestures remain user playtest.

Verification: 65 free tests, 50 base tests, 33 input cases, 3 tutorial2 tests passed. Build and whitespace checks passed. Browser QA confirmed home selection survives reload, pause selector synchronizes, both switch directions retain battery48 and existing damaged building/recovery, help and canvas label update; no console errors. Read-only review found no actionable issues.
