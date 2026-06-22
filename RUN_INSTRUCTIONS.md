# Cookie — Run Instructions

## Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node)
- A **Cloudflare account** (for deployment)
- An **Anthropic API key** (for the photo-scan feature)
- A **Recipe API key** from [recipeapi.io](https://recipeapi.io/) (for the Discover / import feature)
- **Google** and/or **GitHub OAuth apps** (for social sign-in; optional but recommended)

## 1. Install Dependencies

```bash
cd /Users/marcomacias/Projects/Cookie
npm install
```

## 2. Run in the Browser (Development)

```bash
npm run dev
```

Opens a dev server at **http://localhost:3000** with hot module replacement.
This is the fastest way to develop and test UI changes.

> Auth and recipe APIs require Cloudflare Functions + D1. Use `npm run dev:full`
> (build + `wrangler pages dev` proxying Vite) to test sign-up, login, and synced
> recipes locally. Plain `npm run dev` only serves the static UI — API calls will fail.

## 2b. Full-stack local dev (auth + recipes + scan)

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run build && npx wrangler pages dev dist --local --proxy 3000 --port 8788
```

Open **http://localhost:8788** (not 3000) so `/api/*` routes work with the local D1 database.

Apply migrations after schema changes:

```bash
npx wrangler d1 migrations apply cookie-db --local
npx wrangler d1 migrations apply cookie-db --remote   # production
```

## 3. Type Check

```bash
npm run lint   # app code (src/)
npx tsc --noEmit -p functions/tsconfig.json   # serverless code (functions/)
```

## 4. Production Build

```bash
npm run build
```

Generates an optimized static bundle in the `dist/` folder.

## 5. Preview with Functions (Cloudflare runtime)

```bash
npm run build
npm run pages:dev
```

`wrangler pages dev dist` serves the built site **and** the `functions/` code,
so you can exercise `/api/scan-recipe`. Provide the API key for local testing:

```bash
ANTHROPIC_API_KEY=sk-ant-... \
RECIPE_API_KEY=sk_live_... \
GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... \
GITHUB_CLIENT_ID=... GITHUB_CLIENT_SECRET=... \
npm run pages:dev
```

For local full-stack dev, you can also put secrets in `.dev.vars` (gitignored) — Wrangler loads it automatically:

```
RECIPE_API_KEY=sk_live_...
ANTHROPIC_API_KEY=sk-ant-...
```

## 5b. OAuth setup (Google + GitHub)

Create OAuth apps with these **authorized redirect URIs** (add both local and production):

| Provider | Redirect URI |
|----------|----------------|
| Google | `http://localhost:8788/api/auth/oauth/callback/google` |
| Google | `https://<your-pages-domain>/api/auth/oauth/callback/google` |
| GitHub | `http://localhost:8788/api/auth/oauth/callback/github` |
| GitHub | `https://<your-pages-domain>/api/auth/oauth/callback/github` |

**Google:** [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client ID (Web application).

**GitHub:** Settings → Developer settings → OAuth Apps → New OAuth App.

Set secrets for production:

```bash
npx wrangler pages secret put GOOGLE_CLIENT_ID
npx wrangler pages secret put GOOGLE_CLIENT_SECRET
npx wrangler pages secret put GITHUB_CLIENT_ID
npx wrangler pages secret put GITHUB_CLIENT_SECRET
```

For local full-stack dev, pass them as environment variables when starting `wrangler pages dev` (see §2b).

## 6. Deploy to Cloudflare Pages

```bash
npm run deploy        # runs `npm run build` then `wrangler pages deploy dist`
```

First-time setup:

1. Authenticate Wrangler: `npx wrangler login`
2. Apply D1 migrations: `npx wrangler d1 migrations apply cookie-db --remote`
3. Set secrets: `ANTHROPIC_API_KEY`, `RECIPE_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (see §5b)
4. If deploying via the Cloudflare dashboard (Git), add a **D1 binding** named `DB` → `cookie-db` under Pages → Settings → Functions

Alternatively, connect the Git repo in the Cloudflare dashboard with:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Environment variable:** `ANTHROPIC_API_KEY` (and `NODE_VERSION` = 18+)

## 7. Clean Build

```bash
npm run clean        # removes dist/
npm run build        # fresh build
```

## Available npm Scripts

| Script             | Command                          | Description                          |
|--------------------|----------------------------------|--------------------------------------|
| `npm run dev`      | `vite`                           | Start dev server on port 3000        |
| `npm run dev:full` | build + wrangler pages dev proxy | Auth/API local testing (see §2b)     |
| `npm run build`    | `vite build`                     | Production build to `dist/`          |
| `npm run preview`  | `vite preview`                   | Serve production build (static only) |
| `npm run pages:dev`| `wrangler pages dev dist`        | Serve build + Functions locally      |
| `npm run deploy`   | build + `wrangler pages deploy`  | Deploy to Cloudflare Pages           |
| `npm run clean`    | `rm -rf dist`                    | Remove build output                  |
| `npm run lint`     | `tsc --noEmit`                   | TypeScript type checking (app)       |
| `npm test`         | `vitest run`                     | Run unit tests                       |
