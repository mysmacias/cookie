# Recipe scraping — hand-off for continuing past 1000

This document lets a fresh agent pick up the recipe-scraping pipeline and grow
the database beyond its current size. Read it top to bottom before running
anything.

## Current state (as of the last run)

- **`data/recipes.json`** — the recipe database. Currently **1000** unique
  recipes, each with a remote image URL and passing the quality gate
  (≥3 ingredients, ≥2 steps). Deduped by canonical source URL.
- **`data/scrape-state.json`** — resume state: the discovered URL `pool`
  (~6,700 URLs) and the `seen` set of already-attempted URLs. The crawler reads
  this to avoid re-fetching.
- **D1** — both the local and remote (`cookie-db`) databases have been seeded:
  - global `recipes` catalog table (migration `0005_recipes_catalog.sql`): 1000 rows.
  - `user_recipes` for `mysmacias@gmail.com` (remote only): 1000 rows with `scrape_` ids.
- Source mix so far: budgetbytes ~360, sallysbakingaddiction ~386,
  recipetineats ~249, loveandlemons ~6 (that site rate-limited the bot mid-run).

## The pipeline (files)

- `scripts/lib/scrape-core.mjs` — shared parsing/mapping (schema.org JSON-LD →
  Cookie `Recipe`), sitemap helpers, `scrapeRecipe(url)`. Mirrors
  `functions/lib/scraper.ts` + `scrape-mapper.ts`. **Fix bugs here, not in copies.**
- `scripts/build-recipe-db.mjs` — the bulk crawler (sitemap discovery → scrape →
  dedupe → `data/recipes.json`). Resumable.
- `scripts/load-recipes-d1.mjs` — generates idempotent seed SQL from
  `data/recipes.json` into `data/seed/{catalog,user-recipes}.sql`.
- `scripts/scrape-default-recipes.mjs` — separate: regenerates the 26 bundled
  in-app defaults (`src/data/bundledRecipes.ts`) and downloads their images to
  `public/recipe-images/`. **Not** part of the bulk DB; leave it alone unless
  changing the in-app defaults.

## How to grow the database past 1000

1. **Raise the target and re-run the crawler.** It resumes from
   `data/scrape-state.json`, skipping seen URLs:
   ```bash
   node scripts/build-recipe-db.mjs --target=2000 --concurrency=6 --delay=300
   ```
   - `--concurrency` workers, `--delay` ms per worker between requests.
   - Keep concurrency modest and delay ≥300ms — be polite; sites rate-limit.
   - It saves every 25 new recipes, so it's safe to interrupt and re-run.
   - Exit code `2` means the URL pool was exhausted (see next step).

2. **Add more sources when the pool runs low.** Edit the `SOURCES` array in
   `scripts/build-recipe-db.mjs`. Each entry is `{ domain, sitemapIndex }`.
   Good candidates publish schema.org/Recipe JSON-LD and expose
   `post-sitemap*.xml`. Verify a site first:
   ```bash
   curl -sSL -A "CookieRecipeBot/1.0" https://SITE/robots.txt | grep -i sitemap
   curl -sSL -A "CookieRecipeBot/1.0" https://SITE/SOME-RECIPE/ | grep -c 'application/ld+json'
   ```
   Then force re-discovery of the pool:
   ```bash
   node scripts/build-recipe-db.mjs --target=2000 --refresh-sitemaps
   ```
   Sites confirmed reachable from this environment: recipetineats.com,
   loveandlemons.com, budgetbytes.com, sallysbakingaddiction.com, bbcgoodfood.com.
   Dotdash Meredith sites (allrecipes, seriouseats, simplyrecipes) returned HTTP
   402 here and were unusable.

3. **Re-seed D1 after the crawl.** Regenerate SQL, then apply:
   ```bash
   node scripts/load-recipes-d1.mjs --email=mysmacias@gmail.com
   npx wrangler d1 execute cookie-db --local  --file=data/seed/catalog.sql
   npx wrangler d1 execute cookie-db --remote --file=data/seed/catalog.sql
   npx wrangler d1 execute cookie-db --remote --file=data/seed/user-recipes.sql
   ```
   All inserts are `INSERT OR REPLACE`, so re-seeding is idempotent. (Local
   `user-recipes.sql` is a no-op unless a local account with that email exists.)

## Gotchas learned the hard way

- **Remote D1 rejects `BEGIN TRANSACTION`/`COMMIT`** — the generator emits none;
  wrangler batches statements itself. Don't add them back.
- **`SQLITE_TOOBIG`** — recipe JSON is large; the loader emits **one INSERT per
  row** (`--chunk=1`). Don't batch many rows into one statement.
- **Yoast emits unquoted `<script type=application/ld+json ...>`** — the JSON-LD
  regex in `scrape-core.mjs` handles unquoted attrs. Keep it that way.
- **Pages can embed several recipes** (roundups / related posts) — extraction
  picks the one with the most ingredients+steps. Verify if titles look off.
- **Don't read user PII into the transcript.** The `user_recipes` seed resolves
  `user_id` via `SELECT id FROM users WHERE email = ?` inside the INSERT, so you
  never need to SELECT emails/names. Keep it that way.
- **Politeness / rate limits.** loveandlemons throttled a burst. Spread load
  across domains (the crawler interleaves round-robin) and keep delays.

## Verify

```bash
# dataset
node -e 'const r=require("./data/recipes.json");console.log(r.length,"recipes,",new Set(r.map(x=>x.sourceUrl)).size,"unique")'
# remote D1 (aggregate only)
npx wrangler d1 execute cookie-db --remote --command="SELECT COUNT(*) FROM recipes;"
```

## Not yet done (possible next steps)

- No API serves the global `recipes` catalog yet; the app still loads its
  library from bundled TS + `user_recipes`. To surface the catalog app-wide, add
  a read endpoint (e.g. `functions/api/recipes/catalog.ts`) and wire it into
  `src/services/recipeStore.ts` (`getAllRecipes`).
- Images are remote URLs (not downloaded) to avoid repo bloat at scale; consider
  caching hero images to R2 if hotlinking becomes a problem.
