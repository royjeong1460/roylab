# Roylab Home Design

## Goal

Create the first public home page for roylab, a portfolio site for Roy's work, ready to be pushed to GitHub and connected to Cloudflare Pages.

## Requirements

- The site uses the existing Next.js App Router project.
- The home page has a header, body, and footer.
- The header shows `roylab`.
- The footer shows `royjeong1460@gmail.com`.
- The body reserves left and right banner areas, even though no banner content is shown yet.
- The center of the body shows one card.
- The card says `준비중` when the browser language starts with `ko`.
- The card says `Coming soon` for all other browser languages.
- The visual style should feel Apple-like: quiet, precise, light, spacious, polished, and restrained.
- The site should be friendly to Cloudflare Pages static hosting.

## Architecture

The page remains a single route at `/`. Static structure and metadata live in Server Components, while language-specific card copy is handled by a small Client Component that reads `navigator.language` only after hydration. This avoids server request-header detection so the site can be exported as static HTML.

## Components

- `app/page.tsx` renders the full page shell: header, left banner area, center card area, right banner area, and footer.
- `app/components/LocalizedStatusCard.tsx` renders the card text and switches copy based on browser language.
- `app/lib/locale.ts` contains a small pure helper for mapping a browser language list to `ko` or `en`.
- `app/layout.tsx` provides site metadata and the root document shell.
- `app/globals.css` holds global color, typography, and background defaults.
- `next.config.ts` enables static export for Cloudflare Pages.

## Data Flow

1. Next.js builds the static page.
2. The browser receives the default static HTML.
3. The client card component runs in the browser after hydration.
4. The component reads `navigator.languages` and `navigator.language`.
5. `resolveDisplayLocale` returns `ko` if any preferred language starts with `ko`; otherwise it returns `en`.
6. The card displays `준비중` for `ko` and `Coming soon` for `en`.

## Error Handling

If browser language APIs are unavailable, the card falls back to English. The fallback keeps the page deterministic during static prerendering and avoids hydration-sensitive server logic.

## Testing

- Add a small Node test for the locale helper before implementing it.
- Run the test and confirm it fails before adding the helper.
- Run the test again after implementation and confirm it passes.
- Run `npm run lint`.
- Run `npm run build` and confirm static export completes.

## GitHub and Cloudflare Notes

Codex can prepare the repository for GitHub and Cloudflare Pages by setting `output: "export"`, validating the build, and explaining the expected Cloudflare Pages build settings. Creating or connecting a GitHub repository may require the user's GitHub account authentication or approval through the GitHub CLI or web UI.
