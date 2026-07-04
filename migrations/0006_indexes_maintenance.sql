-- Indexes for query paths that previously scanned:
--  - listing a user's collections (collections has no user_id index)
--  - removing a deleted recipe from all collections (lookup by recipe_id,
--    which is not the leading column of collection_recipes' primary key)
--  - clearing a user's outstanding password reset tokens
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_recipes_recipe ON collection_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
