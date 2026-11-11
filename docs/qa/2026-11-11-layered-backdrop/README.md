# Terrain-aware layered backdrop ·2026-11-11

Approved user rules now share one playable backdrop across six regions and local/Web/iOS. Layer order: flat sky; random cloudy or cloudless pixel sun within the current viewport upper half; fixed cultural scene; decorative waste aligned to each support top; foreground physical terrain/targets. The representative cultural building is centered. Existing auxiliary objects are placed once inside the composition footprint using the site identity as seed. Only clouds drift horizontally. Weather uses a separate local RNG and never reads restoration or affects game randomness.

Restoration is still an entry snapshot of the best record: below70% waste covers the place, at70% about30% remains, at100% no waste. The partial caps now stay in their retained subdivisions rather than spanning most of the map. Arch clean-state water and green patches remain. Static scenery does not move or rebuild with the camera; weather stays within the upper viewport. Finite side ledges remain unchanged and receive their own waste caps in the isolated cascade lab.

Native0.5.60(70) was built and deep-signature-verified, then update-installed on the same app ID without uninstall/reset or app launch. Maps, original pixel IDs, physics/skills/native kernels/economy/progression/save namespaces were source-inventoried unchanged. Local g40 cascade physics remains its original snapshot. No tests, scenes, automated replays, browser/gameplay/device launches or runtime probes were performed. User owns visual, input, save, FPS and camera-feel validation.

Local latest campaign: http://127.0.0.1:8807/planet-patchup/play/

Local40-map unlimited-battery lab: http://127.0.0.1:8893/design-preview/cascade-play-lab-2026-11-03/ (raw Godot files on8894).

The Web package was imported/compiled/exported, inspected for the six-region catalog/helper and transport/decoded SHA256 equality. Static site build passed. Public deployment and HTTP verification are recorded separately in delivery.json; do not infer public delivery from these build checks.

Rollback: native qa/ios-remnant-outline-2026-11-11/delivery.json, Web free-0541-1e77c4c0731c. Existing package/art/source backups remain intact. The native0.5.59 diagnostic candidate remains preserved and deferred.
