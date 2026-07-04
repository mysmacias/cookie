# Database design

The backend is Cloudflare Pages Functions on top of a single D1 (SQLite)
database, bound as `DB` in `wrangler.toml`. Schema changes are numbered
migrations in `migrations/`, applied with
`npx wrangler d1 migrations apply cookie-db`.

## Design approach: hybrid relational + document

Tables fall into two groups, on purpose:

- **Relational tables** for identity and anything queried by relation:
  `users`, `sessions`, `oauth_accounts`, `bookmarks`, `collections`,
  `collection_recipes`, `recipe_notes`, `password_reset_tokens`,
  `rate_limits`, `scan_usage`.
- **Document tables** where the row is a JSON blob in a `data` column:
  `user_recipes`, `recipe_overrides`, `shopping_lists`, `meal_plans`,
  `shared_recipes.recipe_data`.

The document approach fits because a Recipe is a deep, evolving structure
(ingredients, steps, media, draft flag) that the app always reads and writes
whole, and D1 has no JSON indexing worth leaning on. The trade-off: fields
inside `data` are invisible to SQL. If a future feature needs to *query* a
recipe field server-side (e.g. filter by tag or draft state), promote that
field to a real column (or a generated column) in a migration rather than
parsing JSON in queries.

## How recipe ownership works

There are three kinds of recipe state per user:

- **`user_recipes`** — recipes the user created, scanned, or imported. IDs
  are generated with a prefix (`user_`, `api_`, `scrape_`). Drafts are
  ordinary rows here with `draft: true` inside the JSON.
- **`recipe_overrides`** — the user's edited copy of a *bundled* catalog
  recipe (ids without a generated prefix), keyed `(user_id, recipe_id)`.
- **`bookmarks`** — just ids; the recipe body lives in the bundle or above.

Routing between the first two is decided by `isUserOwnedRecipeId()` in
`functions/lib/db.ts`. Always use that helper — do not re-implement the
prefix check in routes.

The `recipes` catalog table (migration 0005) is seeded from
`data/recipes.json` by `scripts/load-recipes-d1.mjs` but is not yet read by
any route; the bundled catalog still ships with the frontend.

## Conventions

- **IDs** are `crypto.randomUUID()` strings (`TEXT PRIMARY KEY`); recipe ids
  carry a source prefix as above.
- **Timestamps** are epoch milliseconds in `INTEGER` columns
  (`created_at`, `updated_at`, `expires_at`). `scan_usage.day` is a
  `YYYY-MM-DD` string.
- **Per-user singletons** (`shopping_lists`, `meal_plans`) use
  `user_id` as the primary key with a JSON `data` blob.
- **Deletes**: FKs declare `ON DELETE CASCADE`, but account deletion
  (`functions/api/user/account.ts`) also deletes explicitly per table —
  keep that list in sync when adding a per-user table, since not every
  table has an FK (e.g. `scan_usage`, tables keyed by recipe_id).

## Row lifecycle / cleanup

Cloudflare Pages has no cron triggers, so cleanup is opportunistic:

- `functions/lib/maintenance.ts` prunes expired `sessions`,
  `password_reset_tokens`, lapsed `shared_recipes`, and old `scan_usage`
  rows. It runs at most once per 6h per isolate, triggered from
  `createSession()` (login/signup/oauth).
- `functions/lib/rateLimit.ts` prunes its own `rate_limits` rows the same
  way, and enforces limits with a single atomic upsert.

If a new table gains expiring rows, add its DELETE to `pruneExpiredRows()`.

## Adding a migration

1. Create `migrations/NNNN_short_name.sql` (next number).
2. Use `IF NOT EXISTS` guards; D1 tracks applied migrations, but the guards
   make local re-runs harmless.
3. Index any column used in a WHERE clause that isn't the leading column of
   the table's primary key.
4. If the table is per-user, add it to the account-deletion batch and, if
   rows expire, to `pruneExpiredRows()`.
