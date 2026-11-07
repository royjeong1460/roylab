# Occupied-only map storage · 2026-11-07

The user requested that empty cells no longer be stored, across all current maps. All43 campaign/tutorial maps and the separate Arch Lane fallback now use schema2 occupied-runs-v1. Every run is [startID, count, cellValue, role, colorRGB, moduleIndex]; only occupied adjacent identical tuples are combined. Module lists, their BFS order, module links and all metadata are retained. The fallback originally lacks initial/module_of; two format flags restore those fields as absent. No map geometry, ID, pixel count, terrain, role, color, statistics, economy, skill, profile, progression or physical rule is retuned.

## Data preservation

scripts/compact-map-data.py has pack/unpack modes. Before any writes, every encoded file is decoded in a static data tool and compared against the full original dictionary, including every array value and order. All44 comparisons matched. Per-file before/after hashes, logical hashes and raw/gzip sizes are in serialization-report.json. Dense snapshots are retained outside the package in /private/tmp/pp-sparse-maps-20261107/before and the previous source commit79abcbe. The previous native0.5.49 candidate also remains intact.

campaign/map_data.gd decodes at the catalog load boundary, before existing world fitting. It validates numeric run values, stride, sorted/non-overlapping ranges, boundaries, cell counts and module indices before allocating arrays. Catalog dimensions must match campaign metadata. Missing/corrupt data returns the catalog error path. The standalone world fallback uses the same decoder. Existing dense schema1 is still accepted for prior fixtures. The original dense runtime representation is restored once and then follows existing physics paths; this is storage optimization, not a runtime-grid redesign.

## Static size measurements

-43 maps:44,480,199 →7,531,845 bytes (83.07% smaller plain JSON).
-6-Boss:3,597,098 →620,584 bytes (82.75% smaller), still47,156 pixels /640×512 grid.
-All44 including fallback:44,904,232 →7,558,320 bytes.
-Game PCK decoded:57,025,864 →19,683,116 bytes.
-Game PCK gzip delivery:13,214,768 →13,493,476 bytes (278,708 bytes larger, about2.1%). These are different measures: less JSON parsing and uncompressed data do not guarantee a smaller gzip transport. The cached engine files are unchanged.

No device loading speed, FPS, memory, persistence replay or gameplay result is claimed. Support preflight, full runtime coordinate arrays, render preparation and assets still exist and may dominate entry time. PERF-003 records the6-Boss loading report and pending timing work.

## Delivery and rollback

Web import/compile/export and the site build completed. Native candidate0.5.50(60) uses the same codec/data and unchanged g40 C++ core. Signing/install and public HTTP results are recorded separately in delivery.json. The assistant runs no game tests, scenes, simulations, browsers or device apps. User owns runtime checks.

Restore map files and loader sources as one unit when rolling back. Native0.5.49(59) and web free-0541-b7399322186d retain the prior format. No save migration or reset is introduced. For authoring, unpack to a separate working directory, edit there, then pack back; the static build guard rejects accidental dense active-map exports.
