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

- `/planet-patchup/play/` is the Godot 0.5.34 free web edition: Arch Quarter's six normal maps, boss and tutorial, three original skills, central automatic collection and unlimited upgrades. Five other regions remain locked. All routes and archives are listed at `/planet-patchup/` and in [the address guide](docs/planet-addresses.md).
- The 0.5.34 update includes the revised collapse wait, optional recovery skip after three foreground seconds, recovery presentation, home/workshop layout and held parts beside the upgrade title. The v35 occupancy optimization under regression investigation is excluded. Build/static delivery checks do not establish browser gameplay or performance.
- Current free source: `demos/planet-patchup/godot-free/`; browser bridge/feedback: `demos/planet-patchup/src/godot-free/`. See [the free project README](demos/planet-patchup/godot-free/README.md) for scope, save migration and packaging.
- Build with `npm run build:game -- --free`, then `npm run build`. Commit source and `public/games/planet-patchup-free/` together. Cloudflare's normal build publishes the checked-in export without running Godot.
- Progress stays in the same browser/origin, using separate free Godot IndexedDB storage. Valid original Arch browser progress is imported once, with raw backups and an exact collection-upgrade refund; original localStorage remains untouched. Anonymous statistics can be disabled; feedback submission is explicit. No login, payment or server-side progress store.
- The prior Phaser free edition is preserved at `/planet-patchup/archive/free-phaser/`, including old chunks and map editor dependencies. Legacy Vite/Phaser source remains in `demos/planet-patchup/src/`; rebuild it separately with `npm run build:free:phaser` from that demo directory.
- Gameplay, browser and device verification is user-only. Agent checks for this release are source review, import/compile/export, static packaging and HTTP delivery. They do not establish save durability, gameplay, sound or iPhone performance.

Historical free-zone balance: [docs/free30-balance.md](docs/free30-balance.md).
