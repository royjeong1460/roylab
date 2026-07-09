# Roylab Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static roylab portfolio holding page with Apple-like styling, reserved banner areas, localized status copy, and Cloudflare Pages-ready build output.

**Architecture:** Keep `/` as a static App Router page. Put browser-language behavior behind one small Client Component and a pure locale helper. Use `output: "export"` so `next build` emits the static `out` directory for Cloudflare Pages.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS 4, Node built-in test runner.

## Global Constraints

- Use the existing Next.js App Router project.
- Read relevant `node_modules/next/dist/docs/` guides before changing Next.js code.
- Header copy is exactly `roylab`.
- Footer contact is exactly `royjeong1460@gmail.com`.
- Korean browser language shows exactly `준비중`.
- Non-Korean browser language shows exactly `Coming soon`.
- Keep the page suitable for Cloudflare Pages static hosting.
- Do not add runtime dependencies for this first holding page.

---

## File Structure

- Create `app/lib/locale.ts` for pure browser-language resolution.
- Create `app/components/LocalizedStatusCard.tsx` for the localized center card.
- Create `tests/locale.test.mjs` for Node tests around locale behavior.
- Modify `app/page.tsx` to replace the starter page with the roylab layout.
- Modify `app/layout.tsx` to update metadata.
- Modify `app/globals.css` to set global visual defaults.
- Modify `next.config.ts` to enable static export.
- Modify `package.json` to add a `test` script.
- Modify `README.md` to document local development and Cloudflare Pages settings.

### Task 1: Locale Resolution

**Files:**
- Create: `tests/locale.test.mjs`
- Create: `app/lib/locale.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `resolveDisplayLocale(languages?: readonly string[] | string | null): "ko" | "en"`
- Consumes: No app code from other tasks.

- [ ] **Step 1: Add a failing locale test**

Create `tests/locale.test.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDisplayLocale } from "../app/lib/locale.ts";

describe("resolveDisplayLocale", () => {
  it("uses Korean when any preferred browser language starts with ko", () => {
    assert.equal(resolveDisplayLocale(["en-US", "ko-KR"]), "ko");
    assert.equal(resolveDisplayLocale("ko"), "ko");
  });

  it("falls back to English for non-Korean or missing language values", () => {
    assert.equal(resolveDisplayLocale(["en-US", "ja-JP"]), "en");
    assert.equal(resolveDisplayLocale([]), "en");
    assert.equal(resolveDisplayLocale(null), "en");
  });
});
```

Update `package.json` scripts:

```json
{
  "test": "node --experimental-strip-types --test tests/*.test.mjs"
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `../app/lib/locale.ts` does not exist yet.

- [ ] **Step 3: Add the locale helper**

Create `app/lib/locale.ts`:

```ts
export type DisplayLocale = "ko" | "en";

export function resolveDisplayLocale(
  languages?: readonly string[] | string | null,
): DisplayLocale {
  const preferredLanguages =
    typeof languages === "string" ? [languages] : languages ?? [];

  return preferredLanguages.some((language) =>
    language.trim().toLowerCase().startsWith("ko"),
  )
    ? "ko"
    : "en";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS with 2 passing tests.

### Task 2: Localized Holding Page UI

**Files:**
- Create: `app/components/LocalizedStatusCard.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `resolveDisplayLocale(languages?: readonly string[] | string | null): "ko" | "en"`
- Produces: Complete static home page UI at `/`.

- [ ] **Step 1: Write the client card component**

Create `app/components/LocalizedStatusCard.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { resolveDisplayLocale, type DisplayLocale } from "@/app/lib/locale";

const statusCopy: Record<DisplayLocale, string> = {
  ko: "준비중",
  en: "Coming soon",
};

export function LocalizedStatusCard() {
  const [locale, setLocale] = useState<DisplayLocale>("en");

  useEffect(() => {
    const browserLanguages =
      navigator.languages.length > 0 ? navigator.languages : navigator.language;

    setLocale(resolveDisplayLocale(browserLanguages));
  }, []);

  return (
    <section className="status-card" aria-label="roylab status">
      <p className="status-eyebrow">roylab</p>
      <h1>{statusCopy[locale]}</h1>
      <p className="status-subcopy">
        A portfolio for experiments, products, and the work taking shape.
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Replace the starter home page**

Update `app/page.tsx`:

```tsx
import { LocalizedStatusCard } from "@/app/components/LocalizedStatusCard";

export default function Home() {
  return (
    <div className="site-shell">
      <header className="site-header" aria-label="Site header">
        <a href="/" className="brand" aria-label="roylab home">
          roylab
        </a>
      </header>

      <main className="home-layout">
        <aside className="banner-zone banner-zone-left" aria-hidden="true" />
        <div className="center-stage">
          <LocalizedStatusCard />
        </div>
        <aside className="banner-zone banner-zone-right" aria-hidden="true" />
      </main>

      <footer className="site-footer">
        <a href="mailto:royjeong1460@gmail.com">royjeong1460@gmail.com</a>
      </footer>
    </div>
  );
}
```

- [ ] **Step 3: Update metadata**

Update the `metadata` object in `app/layout.tsx`:

```ts
export const metadata: Metadata = {
  title: "roylab",
  description: "Roy's portfolio for experiments, products, and work in progress.",
};
```

- [ ] **Step 4: Update global styling**

Update `app/globals.css` to keep Tailwind imported and add global layout classes:

```css
@import "tailwindcss";

:root {
  --background: #f5f5f7;
  --foreground: #1d1d1f;
  --muted: #6e6e73;
  --line: rgba(29, 29, 31, 0.12);
  --panel: rgba(255, 255, 255, 0.72);
  --panel-strong: rgba(255, 255, 255, 0.9);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background: var(--background);
}

body {
  min-height: 100%;
  margin: 0;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.95), transparent 34rem),
    linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 52%, #ededf0 100%);
  color: var(--foreground);
  font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
}

a {
  color: inherit;
  text-decoration: none;
}

.site-shell {
  display: grid;
  min-height: 100vh;
  grid-template-rows: auto 1fr auto;
}

.site-header,
.site-footer {
  display: flex;
  align-items: center;
  min-height: 72px;
  padding: 0 clamp(1.25rem, 4vw, 4rem);
}

.site-header {
  justify-content: flex-start;
}

.site-footer {
  justify-content: center;
  color: var(--muted);
  font-size: 0.875rem;
}

.brand {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0;
}

.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 34rem) minmax(0, 1fr);
  align-items: center;
  gap: clamp(1rem, 4vw, 4rem);
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 3rem);
}

.banner-zone {
  min-height: min(42vh, 28rem);
  border: 1px solid var(--line);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.28);
}

.center-stage {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-card {
  width: min(100%, 30rem);
  min-height: 18rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(2rem, 6vw, 4rem);
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 28px;
  background: var(--panel);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);
  text-align: center;
  backdrop-filter: blur(24px);
}

.status-eyebrow {
  margin: 0 0 0.75rem;
  color: var(--muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.status-card h1 {
  margin: 0;
  font-size: clamp(2.5rem, 7vw, 4.75rem);
  line-height: 1;
  letter-spacing: 0;
}

.status-subcopy {
  max-width: 22rem;
  margin: 1.25rem auto 0;
  color: var(--muted);
  font-size: 1rem;
  line-height: 1.7;
}

@media (max-width: 860px) {
  .home-layout {
    grid-template-columns: 1fr;
  }

  .banner-zone {
    display: none;
  }
}
```

- [ ] **Step 5: Run lint**

Run: `npm run lint`

Expected: PASS with no ESLint errors.

### Task 3: Static Export and Deployment Notes

**Files:**
- Modify: `next.config.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: Completed home page from Task 2.
- Produces: Static `out` build compatible with Cloudflare Pages.

- [ ] **Step 1: Enable static export**

Update `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
```

- [ ] **Step 2: Replace README with project instructions**

Update `README.md`:

```md
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

This project uses `output: "export"` in `next.config.ts`, so `next build` emits static files into `out`.
```

- [ ] **Step 3: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit 0 and `next build` writes static output to `out`.
