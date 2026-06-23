import type { Env } from '../../../lib/env';
import { requireUser } from '../../../lib/auth';
import { error, json } from '../../../lib/response';

interface NotesRow {
  notes: string;
  last_cooked_at: number | null;
  rating: number | null;
  updated_at: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const recipeId = params.id as string | undefined;
  if (!recipeId) return error('Recipe id required.');

  const row = await env.DB.prepare(
    'SELECT notes, last_cooked_at, rating, updated_at FROM recipe_notes WHERE user_id = ? AND recipe_id = ?',
  ).bind(userOrResponse.id, recipeId).first<NotesRow>();

  if (!row) {
    return json({ notes: '', lastCookedAt: null, rating: null, updatedAt: null });
  }

  return json({
    notes: row.notes,
    lastCookedAt: row.last_cooked_at,
    rating: row.rating,
    updatedAt: row.updated_at,
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const recipeId = params.id as string | undefined;
  if (!recipeId) return error('Recipe id required.');

  let body: { notes?: string; lastCookedAt?: number | null; rating?: number | null };
  try {
    body = await request.json() as { notes?: string; lastCookedAt?: number | null; rating?: number | null };
  } catch {
    return error('Invalid request body.');
  }

  const notes = typeof body.notes === 'string' ? body.notes : '';
  const lastCookedAt = body.lastCookedAt === null || typeof body.lastCookedAt === 'number'
    ? body.lastCookedAt
    : null;
  const rating = body.rating === null || (typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5)
    ? body.rating
    : null;

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO recipe_notes (user_id, recipe_id, notes, last_cooked_at, rating, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, recipe_id) DO UPDATE SET
       notes = excluded.notes,
       last_cooked_at = COALESCE(excluded.last_cooked_at, recipe_notes.last_cooked_at),
       rating = COALESCE(excluded.rating, recipe_notes.rating),
       updated_at = excluded.updated_at`,
  ).bind(userOrResponse.id, recipeId, notes, lastCookedAt, rating, now).run();

  return json({ ok: true, notes, lastCookedAt, rating, updatedAt: now });
};
