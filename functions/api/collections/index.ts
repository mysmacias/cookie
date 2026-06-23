import type { Env } from '../../lib/env';
import { requireUser, generateId } from '../../lib/auth';
import { error, json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rows = await env.DB.prepare(
    `SELECT c.id, c.name, c.created_at, c.updated_at,
      (SELECT COUNT(*) FROM collection_recipes cr WHERE cr.collection_id = c.id) AS recipe_count
     FROM collections c WHERE c.user_id = ? ORDER BY c.updated_at DESC`,
  ).bind(userOrResponse.id).all<{
    id: string; name: string; created_at: number; updated_at: number; recipe_count: number;
  }>();

  return json({ collections: rows.results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: { name?: string };
  try {
    body = await request.json() as { name?: string };
  } catch {
    return error('Invalid request body.');
  }

  const name = body.name?.trim() ?? '';
  if (!name) return error('Collection name required.');

  const id = generateId();
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO collections (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
  ).bind(id, userOrResponse.id, name, now, now).run();

  return json({ collection: { id, name, created_at: now, updated_at: now, recipe_count: 0 } }, 201);
};
