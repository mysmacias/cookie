import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertUserRecipe } from '../../lib/db';
import { checkRateLimit } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';
import { parseRecipePayload } from '../../lib/validation';

// Copy a recipe from the global catalog into the user's library, keeping the
// stable scrape_ id so re-imports overwrite instead of duplicating.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `catalog-import:${userOrResponse.id}`, 30);
  if (!rate.ok) return error('Too many imports. Try again later.', 429, 'rate_limited');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const id = (body as { id?: unknown }).id;
  if (typeof id !== 'string' || !id.startsWith('scrape_')) {
    return error('A catalog recipe id is required.');
  }

  const row = await env.DB.prepare('SELECT data FROM recipes WHERE id = ?')
    .bind(id).first<{ data: string }>();
  if (!row) return error('Catalog recipe not found.', 404);

  const source = JSON.parse(row.data) as Record<string, unknown>;
  const validated = parseRecipePayload(source);
  if (!validated) return error('Catalog recipe could not be validated.', 422);

  const existing = await env.DB.prepare(
    'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
  ).bind(userOrResponse.id, id).first<{ data: string }>();
  const prior = existing ? JSON.parse(existing.data) as { addedAt?: number } : null;

  const recipe = {
    ...validated,
    id,
    ...(typeof source.sourceUrl === 'string' ? { sourceUrl: source.sourceUrl } : {}),
    addedAt: prior?.addedAt ?? Date.now(),
  };

  await upsertUserRecipe(env, userOrResponse.id, recipe);
  return json({ recipe }, existing ? 200 : 201);
};
