import type { Env } from './env';

export interface UserDataPayload {
  userRecipes: unknown[];
  overrides: Record<string, unknown>;
  bookmarks: string[];
}

export async function fetchUserData(env: Env, userId: string): Promise<UserDataPayload> {
  const [recipesResult, overridesResult, bookmarksResult] = await Promise.all([
    env.DB.prepare('SELECT data, updated_at FROM user_recipes WHERE user_id = ? ORDER BY updated_at DESC')
      .bind(userId).all<{ data: string; updated_at: number }>(),
    env.DB.prepare('SELECT recipe_id, data FROM recipe_overrides WHERE user_id = ?')
      .bind(userId).all<{ recipe_id: string; data: string }>(),
    env.DB.prepare('SELECT recipe_id FROM bookmarks WHERE user_id = ? ORDER BY created_at ASC')
      .bind(userId).all<{ recipe_id: string }>(),
  ]);

  const userRecipes = (recipesResult.results ?? []).map(r => {
    const recipe = JSON.parse(r.data) as Record<string, unknown>;
    if (typeof recipe.addedAt !== 'number') recipe.addedAt = r.updated_at;
    return recipe;
  });
  const overrides: Record<string, unknown> = {};
  for (const row of overridesResult.results ?? []) {
    overrides[row.recipe_id] = JSON.parse(row.data);
  }
  const bookmarks = (bookmarksResult.results ?? []).map(r => r.recipe_id);

  return { userRecipes, overrides, bookmarks };
}

export async function upsertUserRecipe(env: Env, userId: string, recipe: { id: string } & Record<string, unknown>): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO user_recipes (id, user_id, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).bind(recipe.id, userId, JSON.stringify(recipe), now).run();
}

export async function upsertOverride(env: Env, userId: string, recipeId: string, data: Record<string, unknown>): Promise<void> {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO recipe_overrides (user_id, recipe_id, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, recipe_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).bind(userId, recipeId, JSON.stringify(data), now).run();
}

export async function toggleBookmarkDb(env: Env, userId: string, recipeId: string): Promise<boolean> {
  const existing = await env.DB.prepare(
    'SELECT recipe_id FROM bookmarks WHERE user_id = ? AND recipe_id = ?',
  ).bind(userId, recipeId).first();

  if (existing) {
    await env.DB.prepare('DELETE FROM bookmarks WHERE user_id = ? AND recipe_id = ?')
      .bind(userId, recipeId).run();
    return false;
  }

  await env.DB.prepare(
    'INSERT INTO bookmarks (user_id, recipe_id, created_at) VALUES (?, ?, ?)',
  ).bind(userId, recipeId, Date.now()).run();
  return true;
}

export async function importUserData(env: Env, userId: string, payload: UserDataPayload): Promise<void> {
  const stmts: D1PreparedStatement[] = [];

  for (const recipe of payload.userRecipes) {
    if (!recipe || typeof recipe !== 'object') continue;
    const r = recipe as { id?: string };
    if (!r.id || typeof r.id !== 'string') continue;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO user_recipes (id, user_id, data, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, id) DO NOTHING`,
      ).bind(r.id, userId, JSON.stringify(recipe), Date.now()),
    );
  }

  for (const [recipeId, data] of Object.entries(payload.overrides ?? {})) {
    if (!data || typeof data !== 'object') continue;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO recipe_overrides (user_id, recipe_id, data, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, recipe_id) DO NOTHING`,
      ).bind(userId, recipeId, JSON.stringify(data), Date.now()),
    );
  }

  for (const recipeId of payload.bookmarks ?? []) {
    if (typeof recipeId !== 'string') continue;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO bookmarks (user_id, recipe_id, created_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, recipe_id) DO NOTHING`,
      ).bind(userId, recipeId, Date.now()),
    );
  }

  if (stmts.length > 0) {
    await env.DB.batch(stmts);
  }
}
