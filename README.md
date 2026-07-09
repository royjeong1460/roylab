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
