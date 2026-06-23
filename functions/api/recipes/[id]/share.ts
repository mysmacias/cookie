import type { Env } from '../../../lib/env';
import { requireUser, generateId } from '../../../lib/auth';
import { error, json } from '../../../lib/response';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const recipeId = params.id as string | undefined;
  if (!recipeId) return error('Recipe id required.');

  let recipeData: Record<string, unknown> | null = null;

  if (recipeId.startsWith('user_') || recipeId.startsWith('api_') || recipeId.startsWith('scrape_')) {
    const row = await env.DB.prepare(
      'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
    ).bind(userOrResponse.id, recipeId).first<{ data: string }>();
    if (row) recipeData = JSON.parse(row.data) as Record<string, unknown>;
  } else {
    const override = await env.DB.prepare(
      'SELECT data FROM recipe_overrides WHERE user_id = ? AND recipe_id = ?',
    ).bind(userOrResponse.id, recipeId).first<{ data: string }>();
    if (override) {
      recipeData = JSON.parse(override.data) as Record<string, unknown>;
    }
  }

  if (!recipeData) return error('Recipe not found.', 404);

  const token = generateId();
  const now = Date.now();
  const expiresAt = now + 90 * 24 * 60 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO shared_recipes (token, user_id, recipe_id, recipe_data, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(token, userOrResponse.id, recipeId, JSON.stringify(recipeData), now, expiresAt).run();

  return json({ token, url: `/share/${token}` }, 201);
};
