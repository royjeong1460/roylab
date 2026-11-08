# Local Blast Lab ·0.5.55 physics baseline

Isolated from iPhone/public Web saves and release packages. User requested a local page with every skill available. All42campaign sites and bosses are open without fake clear records. Ten skills are learned; equip two passives/two actives in the existing workshop. Default expandLv5+waveLv1, orbitalLv1+seismicLv1. Test funds10million scrap. Initial blastForceLv25, blastRadiusLv20 (5cells), blastReachLv12, batteryLv24; remaining tracks0. These are explicit test presets, not an import of the iPhone profile or a claim of exact upgrade parity. Existing workshop changes their levels normally.

Godot physics/skill implementation, native C++ libraries and44authored data inputs are copied unchanged from the current0.5.55 diagnostic candidate. Only test progression gates/profile seed, home title, standalone Web export, local journal mirroring and pause Export records differ. Actual gameplay/feel is user-owned; assistant compiles/exports and opens only as requested.

Build:`python3 build.py`. Serve:`python3 server.py`; URL http://127.0.0.1:8805/game.html. Do not bind to external interfaces. The pinned single-thread GDExtension template is used. No production bridge, ads, deploy or native update is involved.

Separate user directory:PlanetPatchupLocalBlastLab20261108; use the same127.0.0.1 origin. User checkpoints are additionally saved every5simulation seconds and at pause/results/export to this lab's records/*.json. No gameplay is simulated by the server. Pause Export records still downloads the complete JSON. Close the browser page before stopping the server. Existing running servers are not replaced.
