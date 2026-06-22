# COOKIE — The Digital Gastronome

A curated recipe web app for the modern home cook, designed with editorial elegance and deployed on Cloudflare Pages.

## Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite 6** — Build tooling
- **Tailwind CSS v4** — Styling with custom design tokens
- **Motion** — Fluid animations and transitions
- **Cloudflare Pages** — Static hosting + serverless Functions
- **Claude (Anthropic API)** — Recipe photo scanning (via a Pages Function)
- **localStorage / IndexedDB** — Local data persistence (recipes, bookmarks, exports)

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:3000`.

> The recipe photo-scan feature calls the `/api/scan-recipe` Pages Function, which
> only runs under Cloudflare's runtime. Use `npm run pages:dev` (after a build) to
> exercise it locally; `npm run dev` serves the UI but the scan endpoint won't be
> available.

## Building & Deploying

```bash
npm run build            # outputs static site to dist/
npm run deploy           # builds, then deploys to Cloudflare Pages
```

The serverless code lives in `functions/` and is deployed automatically by
Cloudflare Pages alongside the static assets.

### Required secret

The photo-scan Function needs an Anthropic API key:

```bash
npx wrangler pages secret put ANTHROPIC_API_KEY
```

(or set it in the Cloudflare dashboard → Pages → your project → Settings →
Environment variables). Without it, the rest of the app works and the scan
endpoint returns a clear "not configured" message.

## Project Structure

```
src/
├── App.tsx                  # Root orchestrator
├── main.tsx                 # Entry point
├── index.css                # Tailwind + design tokens + bundled fonts
├── types.ts                 # Recipe domain types
├── constants/               # App-wide constants
├── context/                 # RecipeContext provider
├── hooks/                   # Navigation, timers, filters, image picking, forms
├── components/              # Header, Footer, RecipeCard, UI primitives, ...
├── screens/                 # Library, Recipe Detail, Cooking Mode, Add Recipe, ...
├── export/                  # PDF + Markdown export pipeline
├── services/
│   ├── recipeStore.ts       # localStorage persistence layer
│   ├── webExportStore.ts    # IndexedDB store for generated exports
│   └── recipeScan.ts        # Client for the /api/scan-recipe Function
└── utils/                   # haptics (Vibration API), file helpers, ...

functions/
└── api/scan-recipe.ts       # Cloudflare Pages Function: Claude vision recipe scan
```

## Features

- Curated recipe library with search and category filters
- Editorial recipe detail pages with chef's notes
- Interactive cooking mode with real countdown timers and step photos
- Multi-step recipe submission form
- **Scan a recipe from a photo** — upload a photo and Claude fills the form
- Bookmark system with filtered view
- Export recipes to PDF / Markdown, saved to "My books" and shareable
- Installable PWA with bundled fonts and offline-friendly local storage

## License

All rights reserved.
