# Planet Patchup Godot web

The free web release contains the full six-region Godot campaign. Play at [Planet Patchup](https://roylab.pages.dev/planet-patchup/play/). The previous paid test URL points here and the Phaser comparison remains in the archive.

Run `npm run build:game -- --free` from the repository root to import, compile and export with the pinned g40 single-thread Web GDExtension template. The build checks all 43 map files and ten skill definitions. `npm run build` exports the site and updates its routes. The original browser user directory, A/B slots, preferences and feedback bridge are kept. Older Godot web profiles acquire seven zero-level skills and ledger entries when normalized. The normal slot write retains its backup and the original Phaser keys remain available for recovery.

Game, browser, persistence and device play are verified by the user.

## Map storage

All43 campaign/tutorial JSON maps and the separate Arch Lane fallback use schema2 `occupied-runs-v1`. Empty grid cells are omitted. Each six-integer run stores `[startID, count, cellValue, role, colorRGB, moduleIndex]`; only adjacent identical occupied tuples are combined. `campaign/map_data.gd` restores the original schema1 arrays once at load, before viewport padding or world initialization. Pixel IDs, module pixel order, links and authored counts remain unchanged. The fallback's historically absent `initial`/`module_of` fields are restored as absent using `omit_initial`/`omit_module_of` flags. Dense schema1 remains accepted by the decoder for older fixtures.

For hand authoring, unpack into a separate directory using `scripts/compact-map-data.py --source demos/planet-patchup/godot-free/data --destination /private/tmp/pp-authoring --mode unpack --report /private/tmp/pp-authoring-report.json` from the repository root. Pack back from that directory with `--mode pack` and a separate report path. The tool compares the entire decoded dictionaries before writing. The build requires compact storage; it does not silently rewrite authored source. Keep dense backups outside the game package.

The initial conversion record, all44 file hashes and size comparisons are in `docs/qa/2026-11-07-sparse-maps/` at the repository root. This reduces stored/parsing JSON volume; runtime grids and support initialization remain unchanged, and loading speed needs user device measurement.
