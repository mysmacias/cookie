import type { Env } from '../lib/env';
import { generateId, requireUser } from '../lib/auth';
import { upsertUserRecipe } from '../lib/db';
import { checkRateLimit } from '../lib/rateLimit';
import { error, json } from '../lib/response';
import { parseRecipePayload } from '../lib/validation';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `recipes:${userOrResponse.id}`, 30);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const bodyObj = body as Record<string, unknown>;
  const copyFrom = typeof bodyObj.copyFrom === 'string' ? bodyObj.copyFrom : null;

  if (copyFrom) {
    let source: Record<string, unknown> | null = null;
    if (copyFrom.startsWith('user_') || copyFrom.startsWith('api_') || copyFrom.startsWith('scrape_')) {
      const row = await env.DB.prepare(
        'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
      ).bind(userOrResponse.id, copyFrom).first<{ data: string }>();
      if (row) source = JSON.parse(row.data) as Record<string, unknown>;
    } else {
      const row = await env.DB.prepare(
        'SELECT data FROM recipe_overrides WHERE user_id = ? AND recipe_id = ?',
      ).bind(userOrResponse.id, copyFrom).first<{ data: string }>();
      if (row) source = JSON.parse(row.data) as Record<string, unknown>;
    }
    if (!source) return error('Recipe to copy not found.', 404);
    const parsed = parseRecipePayload({ ...source, title: `${String(source.title ?? 'Recipe')} (copy)` });
    if (!parsed) return error('Invalid recipe data.', 400, 'invalid_recipe');
    const recipe = { ...parsed, id: `user_${generateId()}`, addedAt: Date.now() };
    await upsertUserRecipe(env, userOrResponse.id, recipe);
    return json({ recipe }, 201);
  }

  const parsed = parseRecipePayload(body);
  if (!parsed) return error('Invalid recipe data.', 400, 'invalid_recipe');

  const recipe = { ...parsed, id: `user_${generateId()}`, addedAt: Date.now() };
  await upsertUserRecipe(env, userOrResponse.id, recipe);
  return json({ recipe }, 201);
};
