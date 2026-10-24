# Planet Patchup addresses

Single entry: https://roylab.pages.dev/planet-patchup/

| Purpose | Canonical path |
| --- | --- |
| Current free campaign | /planet-patchup/play/ |
| Paid map and power testing | /planet-patchup/test/paid/ |
| Wide/tall/open maps and skill effects | /planet-patchup/lab/maps/ |
| Pillar/body/roof and load inspection | /planet-patchup/lab/structure/ |
| Isolated contact-touch edition | /planet-patchup/lab/touch/ |
| Local-file map editor | /planet-patchup/tools/map-editor/ |
| Historical comparison versions | /planet-patchup/archive/{tilt,rotation-ramp,pillar-width,motion,support,blast,original}/ |

Source of truth: `scripts/planet-routes.mjs`. `sync-planet-routes.mjs` generates the directory, canonical HTML entry files and shared redirects. Root build and game release script both call it. Run `npm test` to verify aliases, query/hash preservation, no loops, idempotence and asset paths.

Historical /games/planet-patchup-* HTML pages perform a client redirect with `location.replace`, keeping search and hash. Underlying assets remain at original /games paths; new entry HTML uses `<base>` so those assets and relative in-game links resolve identically. No saved-game keys or origin change. Old HTML is retained, so undoing route generation is possible. The map editor uses `document.baseURI` for its preview target.

Update game source, build its edition, copy the output to its existing public/games release folder with licenses, then run `node scripts/sync-planet-routes.mjs`. Do not manually edit generated canonical entry HTML. Static redirects require JavaScript, as do the games themselves. These are organization paths, not authentication or access restrictions.
