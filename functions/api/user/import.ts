import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { importUserData } from '../../lib/db';
import { error, json } from '../../lib/response';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  if (!body || typeof body !== 'object') return error('Invalid import payload.');

  const payload = body as {
    userRecipes?: unknown[];
    overrides?: Record<string, unknown>;
    bookmarks?: string[];
  };

  await importUserData(env, userOrResponse.id, {
    userRecipes: Array.isArray(payload.userRecipes) ? payload.userRecipes : [],
    overrides: payload.overrides && typeof payload.overrides === 'object' ? payload.overrides : {},
    bookmarks: Array.isArray(payload.bookmarks) ? payload.bookmarks : [],
  });

  return json({ ok: true });
};
