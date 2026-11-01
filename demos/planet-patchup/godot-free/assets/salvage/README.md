# Free-build background salvage art

Corrected scope, 2026-10-28: these illustrations belong ONLY to scenery behind the destructible map. The previous texture-atlas experiment was reverted. Destructible cells, falling pieces and collectibles use their original art and renderer.

Source PNGs and editable Aseprite originals:
- `shared-*`, `arch-*`: `variants/demolition-mvp/design-board/culture-modular-v3-2026-10-27/assets/`
- `01-*` through `06-*`: `variants/demolition-mvp/design-board/junk-structures-v1-2026-10-27/assets/`

A completed recovery below 70% shows polluted scenery. From 70% up to (not including) 100%, the background is fixed at 70% restoration: seven of ten debris placements are removed, three remain with cultural buildings visible. At 100%, all waste sprites are absent. This is an art-state convention, not a measurement of literal image area.

Gameplay captures the saved site's best-record state when entering; no live recovery animation changes scenery during a run. The existing result/upgrade screen shows this run's settled restoration state. Existing best records, rewards, access locks and save schema are unchanged. A lower replay result cannot lower the stored best record.

`salvage-preview.html` compares all three background states using the same renderer. Its optional foreground overlay is for visual comparison only; it does not simulate completion or write player progress.
