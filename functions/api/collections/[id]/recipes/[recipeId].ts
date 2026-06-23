import type { Env } from '../../../../lib/env';
import { requireUser } from '../../../../lib/auth';
import { error, json } from '../../../../lib/response';

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const collectionId = params.id as string;
  const collection = await env.DB.prepare(
    'SELECT id FROM collections WHERE id = ? AND user_id = ?',
  ).bind(collectionId, userOrResponse.id).first();

  if (!collection) return error('Collection not found.', 404);

  let body: { recipeId?: string };
  try {
    body = await request.json() as { recipeId?: string };
  } catch {
    return error('Invalid request body.');
  }

  const recipeId = body.recipeId?.trim() ?? '';
  if (!recipeId) return error('Recipe id required.');

  await env.DB.prepare(
    `INSERT INTO collection_recipes (collection_id, recipe_id, added_at)
     VALUES (?, ?, ?) ON CONFLICT(collection_id, recipe_id) DO NOTHING`,
  ).bind(collectionId, recipeId, Date.now()).run();

  await env.DB.prepare(
    'UPDATE collections SET updated_at = ? WHERE id = ?',
  ).bind(Date.now(), collectionId).run();

  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const collectionId = params.id as string;
  const recipeId = params.recipeId as string;

  const collection = await env.DB.prepare(
    'SELECT id FROM collections WHERE id = ? AND user_id = ?',
  ).bind(collectionId, userOrResponse.id).first();

  if (!collection) return error('Collection not found.', 404);

  await env.DB.prepare(
    'DELETE FROM collection_recipes WHERE collection_id = ? AND recipe_id = ?',
  ).bind(collectionId, recipeId).run();

  return new Response(null, { status: 204 });
};
