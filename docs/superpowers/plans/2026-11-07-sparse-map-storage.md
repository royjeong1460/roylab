# Sparse authored map storage

User-approved scope: omit empty map cells from every active map file, restore existing runtime arrays exactly, preserve map/pixel IDs and physics, and deliver the shared change to web and iPhone.

## Design

Use schema2 `encoding: occupied-runs-v1`. Replace the four dense arrays `cells`, `roles`, `colors`, `module_of` with a flat `pixel_runs` sequence of six integers per run: `[startID, count, cellValue, role, colorRGB, moduleIndex]`. Runs are sorted, non-overlapping, occupied only and coalesce adjacent identical tuples. Keep all metadata, module pixel lists and module-link ordering unchanged. The runtime decoder returns schema1 arrays with default0/-1 in gaps and original values at the same grid IDs. The separate fallback historically lacks `initial` and `module_of`; two encoding flags restore those fields as absent, with moduleIndex=-1 in its runs. Legacy dense schema1 remains accepted. No new native kernel or dependency is needed.

Do not omit module lists or reorder their BFS pixel arrays in this change. Those are separate redundant data but preserving them keeps topology/order behavior stable. Do not change world initialization, geometry, simulation, pricing, profile namespaces or counters.

## Execution

- [x] Snapshot43 campaign/tutorial maps and the separate arch_lane fallback, hashes, current native registry and loader sources.
- [x] Add a shared decoder and use it at the catalog and standalone fallback read boundaries, before existing world/camera fitting. Reject malformed run strides, invalid integer values, overlaps, bounds, cell counts and modules.
- [x] Add a guarded offline pack/unpack authoring tool. Before writing, statically roundtrip every file and compare every original field/array/order; this is file-data validation, not a game test.
- [x] Convert all44 active JSON files. Record raw and standalone gzip sizes; assert exact decoded map/pixel counts and unchanged campaigns/physics/skills/economy/profile sources. Keep dense snapshots outside the package.
- [x] Import/compile/export web and a new native0.5.50(60) candidate. Build site, sign/update-install existing iPhone app without launch. Publish the isolated branch, verify HTTP artifact and decoded hashes, update registry and rollback records.

User owns all runtime, scene, device, browser, gameplay and loading-time testing. Agent performs source inspection, static serialization assertions, import/compile/export, signing/install and static HTTP only. File size reduction is not a measured loading-speed result.

## Replay and rollback

Keep0.5.49(59), old web payload and dense backups. Rollback restores map files and loader sources together; no save migration is needed. Catalog counts, player progression and pixel IDs are unchanged. The pack tool supports unpacking into a separate authoring directory and packing back, so current map data need not be edited as flattened run integers.
