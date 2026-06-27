-- Global catalog of scraped recipes (shared library, not user-owned).
-- Populated by scripts/load-recipes-d1.mjs from data/recipes.json.
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,            -- full Recipe JSON (matches src/types.ts Recipe)
  title TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  source_domain TEXT,
  image TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_source_url ON recipes(source_url);
CREATE INDEX IF NOT EXISTS idx_recipes_domain ON recipes(source_domain);
