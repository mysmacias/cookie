import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { error, json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const id = params.id as string;
  const collection = await env.DB.prepare(
    'SELECT id, name FROM collections WHERE id = ? AND user_id = ?',
  ).bind(id, userOrResponse.id).first<{ id: string; name: string }>();

  if (!collection) return error('Collection not found.', 404);

  const recipes = await env.DB.prepare(
    'SELECT recipe_id, added_at FROM collection_recipes WHERE collection_id = ? ORDER BY added_at ASC',
  ).bind(id).all<{ recipe_id: string; added_at: number }>();

  return json({ collection, recipeIds: (recipes.results ?? []).map(r => r.recipe_id) });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const id = params.id as string;
  let body: { name?: string };
  try {
    body = await request.json() as { name?: string };
  } catch {
    return error('Invalid request body.');
  }

  const name = body.name?.trim() ?? '';
  if (!name) return error('Collection name required.');

  const result = await env.DB.prepare(
    'UPDATE collections SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?',
  ).bind(name, Date.now(), id, userOrResponse.id).run();

  if (!result.meta.changes) return error('Collection not found.', 404);
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const id = params.id as string;
  await env.DB.prepare('DELETE FROM collection_recipes WHERE collection_id = ?').bind(id).run();
  const result = await env.DB.prepare(
    'DELETE FROM collections WHERE id = ? AND user_id = ?',
  ).bind(id, userOrResponse.id).run();

  if (!result.meta.changes) return error('Collection not found.', 404);
  return new Response(null, { status: 204 });
};
