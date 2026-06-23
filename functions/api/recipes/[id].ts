import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertOverride, upsertUserRecipe } from '../../lib/db';
import { collectMediaKeysFromRecipe, deleteMediaKeys } from '../../lib/media';
import { error, json } from '../../lib/response';
import { parseRecipePayload } from '../../lib/validation';

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const recipeId = params.id as string | undefined;
  if (!recipeId) return error('Recipe id required.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const parsed = parseRecipePayload(body);
  if (!parsed || parsed.id !== recipeId) {
    return error('Invalid recipe data.', 400, 'invalid_recipe');
  }

  if (recipeId.startsWith('user_') || recipeId.startsWith('api_') || recipeId.startsWith('scrape_')) {
    const existing = await env.DB.prepare(
      'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
    ).bind(userOrResponse.id, recipeId).first<{ data: string }>();
    const prior = existing ? JSON.parse(existing.data) as { addedAt?: number } : null;
    const bodyObj = body as Record<string, unknown>;
    const recipe = {
      ...parsed,
      id: recipeId,
      addedAt: typeof bodyObj.addedAt === 'number' ? bodyObj.addedAt : prior?.addedAt ?? Date.now(),
    };
    await upsertUserRecipe(env, userOrResponse.id, recipe);
    return json({ recipe });
  }

  const recipe = { ...parsed, id: recipeId };
  await upsertOverride(env, userOrResponse.id, recipeId, recipe);
  return json({ recipe });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const recipeId = params.id as string | undefined;
  if (!recipeId) return error('Recipe id required.');

  const mediaKeys: string[] = [];

  if (recipeId.startsWith('user_') || recipeId.startsWith('api_') || recipeId.startsWith('scrape_')) {
    const existing = await env.DB.prepare(
      'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
    ).bind(userOrResponse.id, recipeId).first<{ data: string }>();
    if (!existing) return error('Recipe not found.', 404);
    mediaKeys.push(...collectMediaKeysFromRecipe(JSON.parse(existing.data) as Record<string, unknown>));
    await env.DB.prepare(
      'DELETE FROM user_recipes WHERE user_id = ? AND id = ?',
    ).bind(userOrResponse.id, recipeId).run();
  } else {
    const existing = await env.DB.prepare(
      'SELECT data FROM recipe_overrides WHERE user_id = ? AND recipe_id = ?',
    ).bind(userOrResponse.id, recipeId).first<{ data: string }>();
    if (existing) {
      mediaKeys.push(...collectMediaKeysFromRecipe(JSON.parse(existing.data) as Record<string, unknown>));
    }
    const result = await env.DB.prepare(
      'DELETE FROM recipe_overrides WHERE user_id = ? AND recipe_id = ?',
    ).bind(userOrResponse.id, recipeId).run();
    if (!result.meta.changes && mediaKeys.length === 0) {
      return error('Recipe not found.', 404);
    }
  }

  await env.DB.batch([
    env.DB.prepare('DELETE FROM bookmarks WHERE user_id = ? AND recipe_id = ?').bind(userOrResponse.id, recipeId),
    env.DB.prepare('DELETE FROM collection_recipes WHERE recipe_id = ? AND collection_id IN (SELECT id FROM collections WHERE user_id = ?)')
      .bind(recipeId, userOrResponse.id),
    env.DB.prepare('DELETE FROM recipe_notes WHERE user_id = ? AND recipe_id = ?').bind(userOrResponse.id, recipeId),
    env.DB.prepare('DELETE FROM shared_recipes WHERE user_id = ? AND recipe_id = ?').bind(userOrResponse.id, recipeId),
  ]);

  await deleteMediaKeys(env, mediaKeys);
  return json({ ok: true });
};
