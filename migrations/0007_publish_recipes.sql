-- User-published recipes live alongside scraped ones in the shared catalog.
-- published_by marks the owning user (NULL for bundled/scraped rows) so only
-- the author can republish or unpublish their copy.
ALTER TABLE recipes ADD COLUMN published_by TEXT;
ALTER TABLE recipes ADD COLUMN published_at INTEGER;

CREATE INDEX IF NOT EXISTS idx_recipes_published_by ON recipes(published_by);
