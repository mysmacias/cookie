# COOKIE — The Digital Gastronome

A curated recipe web app for the modern home cook, designed with editorial elegance and deployed on Cloudflare Pages.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite 6** — Build tooling
- **Tailwind CSS v4** — Styling with custom design tokens
- **Motion** — Fluid animations and transitions
- **Cloudflare Pages** — Static hosting + serverless Functions
- **Cloudflare D1** — User accounts, recipes, bookmarks, collections, shopping lists
- **Cloudflare R2** — Recipe and step image storage (optional binding)
- **Claude (Anthropic API)** — Recipe photo scanning
- **IndexedDB** — Local export library ("My books")

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

> Auth, recipes, collections, and shopping lists require Cloudflare Functions + D1.
> Use `npm run dev:full` to test the full stack locally. See [RUN_INSTRUCTIONS.md](RUN_INSTRUCTIONS.md).

## Building & Deploying

```bash
npm run build            # outputs static site to dist/ + service worker
npm run deploy           # builds, then deploys to Cloudflare Pages
```

Apply D1 migrations after schema changes:

```bash
npx wrangler d1 migrations apply cookie-db --local
npx wrangler d1 migrations apply cookie-db --remote
```

### Required secrets

| Secret | Purpose |
|--------|---------|
| `ANTHROPIC_API_KEY` | Photo-scan (`/api/scan-recipe`) |
| `RECIPE_API_KEY` | Discover / import from recipeapi.io |

OAuth (optional): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

```bash
npx wrangler pages secret put ANTHROPIC_API_KEY
```

### R2 media bucket

Create an R2 bucket named `cookie-media` and bind it as `MEDIA_BUCKET` in `wrangler.toml`.
Without it, images are stored inline in recipe JSON (works, but not ideal at scale).

## Project Structure

```
src/
├── App.tsx                  # Root orchestrator + URL routing
├── screens/                 # Library, Detail, Cooking, Discover, Shopping, Collections, …
├── hooks/                   # Navigation, timers, filters, a11y helpers
├── services/                # API clients (auth, recipes, collections, media)
├── export/                  # PDF + Markdown export pipeline
└── components/              # Header, RecipeCard, UI primitives

functions/
├── api/                     # Auth, recipes, collections, shopping-list, media, scan
└── lib/                     # Auth, DB, validation, rate limiting

migrations/                  # D1 schema
```

## Features

- **Account-required** curated recipe library with search, category/tag filters, bookmarks
- **Shareable URLs** — `/recipe/:id`, `/recipe/:id/cook`, `/books`, `/shopping`, `/collections`
- **Cooking mode** — timers, step photos, kitchen display, wake lock, keyboard shortcuts
- **Discover** — search and import recipes from recipeapi.io
- **Collections** — named bookshelves with PDF export
- **Shopping list** — merged ingredients, synced to D1
- **Export** — PDF / Markdown to "My books"
- **PWA** — installable with offline shell caching via service worker
- **Photo scan** — Claude vision fills the add-recipe form

## Testing

```bash
npm run test
npm run test:watch
npm run lint
```

## License

All rights reserved.
