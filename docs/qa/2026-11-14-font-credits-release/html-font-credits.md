# Local HTML NeoPro font and production credits

Only the primary local prototype `deployment/roylab/demos/planet-patchup/design-preview/menu-flow-v3-2026-11-14` was changed. No native/production/Web release worktree source, deployment or commit was touched.

## Touched paths and backup

Modified existing files:

- `app.js`: shared credits data load, three credit dialog functions, Options label/dispatch and one focus-trap selector expansion.
- `base.css`: replace existing Galmuri face/family with NeoPro WOFF2 and inherit font-synthesis:none.
- `style.css`: replace its Galmuri reference with NeoPro and append only credits-scoped styling.

Added:

- `assets/fonts/NeoDunggeunmoPro-Regular.woff2`: exact existing selected font-study file, SHA256 b6b28ef07a91a889587b3f2485ad77d3cd116456f8bfbc50a271cbe90b39535d.
- `assets/fonts/NeoDunggeunmoPro-OFL.txt`: exact existing OFL file.
- `credits.json`: exact bytes of root-prepared `qa/ios-font-credits-2026-11-14/project/data/credits.json`, SHA256368ffd7facca73b9ca30e188ae50b7059ff203b8c0235f75d446a26278dd2b22.

All three existing files were backed up BEFORE editing into this candidate's `local-preview-before/`. Original hashes:

- app.js:2be3f1e47ea041514b838e418b11b78b046d9c6a344a8776ef42775635a2271c
- base.css:0c12e40a355f8ecc8c2c0f2dec6d7d9cb89be96d23cefdb61674ef7a73454510
- style.css:3047ff18e6474c11db88e092fede742c47e51ca44d4fb67dd794df3cbdd266ff

The backup manifest records37untouched files. All13font-study files and existing index/skill data/catalog/skill-preview module/CSS/VFX asset and timeline bytes still match.

## Local interface

Options now opens **제작 및 도움**. Main content reads shared sections/roles/names, translates those labels locally, and includes only platform=all/web entries (7entries). **라이선스 보기** opens the5all/web notices; choosing one shows its complete original text in a selectable, keyboard-focusable, independently scrolling text area with a link back to the list. The list links back to the main credits and restores keyboard focus to the opening entry.

All metadata and legal text are HTML-escaped. Source URLs are shown as plain text; no external navigation is performed. The existing modal focus loop now includes tabindex0text scrollers as well as enabled buttons. Existing close/Escape behavior and the skill-preview disposer remain intact. Font size, line-height, layout, existing skill effects and result/menu flow were preserved.

## Static verification

- Fresh node --check passed for app.js and unchanged skill-preview.js.
- Source comparison: only existing options and handleButton function bodies changed; creditsMain/creditsLicenseList/creditsNotice were added. The sole intentional global event change is including the legal text scroller in Tab trapping. Existing skillDetail/closeSheet/sheet and all result/playing/navigation functions remain identical.
- Main CSS contains no Galmuri family reference, selected WOFF2 and OFL bytes match the original font-study files, and font-synthesis:none is present.
- Shared JSON bytes are identical. All visible original notices are nonempty strings with unique IDs; no native-only notices/entries are shown in Web UI.
- Original font-study, skill demo and unrelated data/index checksums remain unchanged.

No browser/game/device/scene/tests/animation execution, HTTP check or deployment was performed for this task. Actual font rendering/wrapping, keyboard/touch use and notice scrolling remain user validation. Detailed static evidence is html-font-credits-verification.json.

Root follow-up: local server provided new bytes but browser reused old module/style cache. Backed up index.html and added explicit font-credits revision queries to main app/style and imported base CSS. Font study remains unchanged.
