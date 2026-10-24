# roylab

Portfolio home for Roy's experiments, products, and work in progress.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Cloudflare Pages

Use these settings after connecting the GitHub repository:

- Framework preset: Next.js
- Build command: `npm run build`
- Build output directory: `out`
- Node.js version: 20 or newer

This project uses `output: "export"` in `next.config.ts`, so `next build`
emits static files into `out`.

## Planet Patchup playable demo

- Open `/planet-patchup/play/`; the home page links to the free first-zone balance build. All versions are listed at `/planet-patchup/`. Older shared links redirect to their canonical entries; see `docs/planet-addresses.md`. Portrait phones are the primary target.
- `demos/planet-patchup/` holds the standalone Vite/Phaser source; `public/games/planet-patchup/` holds its checked-in static release.
- For the new free zone run `npm run build:game -- --free`, then `npm run build`. For the original demo use `npm run build:game`. Commit both source and public game assets. The normal Cloudflare build uses the checked-in release.
- Game appearance: `demos/planet-patchup/src/demo/style.css` and `demo.html`. Rules and persistence: `src/free-step1/`. Physics remains shared within the standalone source tree.
- The Figma reference is the dust-alley play UI, node `6:11` in file `dEvvNjaFdv03v2MvzaU88r`. Actual procedural background/surface rendering is reused, not a flattened screenshot.
- No payments, ads, analytics, login, or server saves. Progress stays in this browser's local storage. QA uses `?qa=1`, with separate keys.
- Tests: `npm test --prefix demos/planet-patchup`. Responsive desktop-browser QA does not establish real iPhone heat, touch, or sustained performance.

Free-zone balance, assumptions and isolated physics: [docs/free30-balance.md](docs/free30-balance.md).
