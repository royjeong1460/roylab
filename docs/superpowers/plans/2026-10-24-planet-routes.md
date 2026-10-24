# Planet Patchup address organization

Approved: organize scattered URLs and provide an entry page. Keep old shared links usable.

- [x] Maintain a single route catalog. Use /planet-patchup/ as the directory, play/ for free, test/paid/, lab/maps/, lab/structure/, lab/touch/, tools/map-editor/, archive/* for historical physics and demos.
- [x] Generate canonical HTML entries from existing releases without duplicating assets. Base URLs retain original asset/relative-link resolution. Old entry pages redirect via a shared early script, preserving query and fragment. Original JS/assets and localStorage keys remain unchanged.
- [x] Fix editor preview URL resolution to use document.baseURI so relocated editor previews still open gameplay. Build free only for this source correction.
- [x] Hook synchronization into root build and game-release script. Home links go to free play plus directory. Document routes and test generation idempotence, alias coverage, assets, preview resolution.
- [ ] Verify local and public navigation, old-query redirect, free settings and editor, then publish.

Validation before publication: root tests 5/5, free tests 65/65; free Vite build and root Next webpack build passed. Default local Turbopack cannot traverse the external node_modules symlink; deployment uses its normal installed dependencies. Read-only review passed 13 destinations, 38 aliases and 49 asset references. Browser confirmed legacy structure free-3 redirect and editor example preview at play/?mapPreview=local-editor-preview. Public navigation check remains after deployment.
