import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { toggleBookmarkDb } from '../../lib/db';
import { error, json } from '../../lib/response';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: { recipeId?: string };
  try {
    body = await request.json() as { recipeId?: string };
  } catch {
    return error('Invalid request body.');
  }

  const recipeId = body.recipeId?.trim();
  if (!recipeId) return error('recipeId is required.');

  const bookmarked = await toggleBookmarkDb(env, userOrResponse.id, recipeId);
  return json({ bookmarked, recipeId });
};
