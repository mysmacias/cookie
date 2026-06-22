# Cookie — Run Instructions

## Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node)
- A **Cloudflare account** (for deployment)
- An **Anthropic API key** (for the photo-scan feature)

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

> The `/api/scan-recipe` endpoint runs only under Cloudflare's runtime, so the
> photo-scan button won't work under `npm run dev`. See step 5 to test it locally.

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
ANTHROPIC_API_KEY=sk-ant-... npm run pages:dev
```

## 6. Deploy to Cloudflare Pages

```bash
npm run deploy        # runs `npm run build` then `wrangler pages deploy dist`
```

First-time setup:

1. Authenticate Wrangler: `npx wrangler login`
2. Set the scan secret: `npx wrangler pages secret put ANTHROPIC_API_KEY`

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
| `npm run build`    | `vite build`                     | Production build to `dist/`          |
| `npm run preview`  | `vite preview`                   | Serve production build (static only) |
| `npm run pages:dev`| `wrangler pages dev dist`        | Serve build + Functions locally      |
| `npm run deploy`   | build + `wrangler pages deploy`  | Deploy to Cloudflare Pages           |
| `npm run clean`    | `rm -rf dist`                    | Remove build output                  |
| `npm run lint`     | `tsc --noEmit`                   | TypeScript type checking (app)       |
| `npm test`         | `vitest run`                     | Run unit tests                       |
