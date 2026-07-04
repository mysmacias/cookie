import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertUserRecipe } from '../../lib/db';
import { error, json } from '../../lib/response';

// Copies a catalog recipe into the user's own library. Catalog rows store the
// full Recipe JSON with a stable scrape_ id, so the client treats the copy
// exactly like any other imported recipe.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const id = (body as { id?: unknown }).id;
  if (typeof id !== 'string' || !id) {
    return error('id must be a non-empty string.');
  }

  try {
    const row = await env.DB.prepare('SELECT data FROM recipes WHERE id = ?')
      .bind(id).first<{ data: string }>();
    if (!row) return error('Recipe not found in catalog.', 404);

    const recipe = JSON.parse(row.data) as { id: string } & Record<string, unknown>;
    recipe.addedAt = Date.now();
    await upsertUserRecipe(env, userOrResponse.id, recipe);
    return json({ recipe }, 201);
  } catch {
    return error('Failed to import recipe.', 502);
  }
};
