# Free home desert-art release

Public target: https://roylab.pages.dev/planet-patchup/play/

Built from published `8361f5c` with the approved desert home files only. The green/blue world map is replaced by the adopted desert V2 geography, six landmark sprites, centered hubs, two distant planets and five slow orbiters. Existing campaign/save/access logic, gameplay backgrounds, destructible block palette, paid app, analytics configuration and other public editions are preserved.

The source assets are bundled and content hashed. Old published chunks remain available for already-open tabs. A missing resume event for feedback dialogs created after home mounting was fixed, with a failing-then-passing lifecycle regression.

Verification before publication:

- Arch: 136 passing; free: 66 passing; canonical routes: 5 passing.
- Free Vite build and static-site build pass. Local static-site build used `npm run build -- --webpack` because shared dependency symlinks fall outside Turbopack's local filesystem root; CI installs its own dependencies and uses the unchanged default build command.
- All 138 other public files are hash-identical to the published baseline.
- Approved map/landmark hashes and orbit positioning/lifecycle are checked by self-contained tests.
- Local built-game browser: desert home renders, locked regions disable Enter, Options and map selection open, no console errors/warnings.
- Native/device QA is not part of this release check. The restored desert texture currently brightens the same geography; separately authored green/water restoration art is not included.

Public deployment and browser verification are recorded after publication; this preparation record alone does not claim live delivery.
