import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { mediaKeyFromUrl } from '../../lib/media';
import { checkRateLimit } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';
import { parseRecipePayload, type RecipePayload } from '../../lib/validation';

// Publishes a copy of one of the user's own recipes into the shared catalog
// (the `recipes` table that backs /api/catalog/*), where everyone can find it
// on the Discover screen. The catalog row keeps the user_ id, so importers get
// a normal user-owned copy and the publisher's own library shows "already saved".

function parseIdBody(body: unknown): string | null {
  const id = (body as { id?: unknown } | null)?.id;
  return typeof id === 'string' && id ? id : null;
}

// Owner-scoped /api/media/ URLs return 403 for everyone but the uploader, so
// they can't be shared. Step photos are personal cook-log shots either way.
function stripPrivateMedia(recipe: RecipePayload): RecipePayload {
  const publicUrl = (url: string | undefined): string | undefined =>
    url && mediaKeyFromUrl(url) ? undefined : url;
  return {
    ...recipe,
    image: publicUrl(recipe.image) ?? '',
    ingredients: recipe.ingredients.map(ing => ({ ...ing, image: publicUrl(ing.image) })),
    steps: recipe.steps.map(step => {
      const { photo: _photo, ...rest } = step;
      return rest;
    }),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rows = await env.DB.prepare('SELECT id FROM recipes WHERE published_by = ?')
    .bind(userOrResponse.id).all<{ id: string }>();
  return json({ ids: (rows.results ?? []).map(r => r.id) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `catalog-publish:${userOrResponse.id}`, 20);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const id = parseIdBody(body);
  if (!id) return error('id must be a non-empty string.');
  // Only recipes the user authored; imported catalog/scrape ids stay put.
  if (!id.startsWith('user_')) return error('Only your own recipes can be published.', 400, 'not_publishable');

  const row = await env.DB.prepare('SELECT data FROM user_recipes WHERE user_id = ? AND id = ?')
    .bind(userOrResponse.id, id).first<{ data: string }>();
  if (!row) return error('Recipe not found.', 404);

  const parsed = parseRecipePayload(JSON.parse(row.data));
  if (!parsed) return error('Invalid recipe data.', 400, 'invalid_recipe');
  if (parsed.draft) return error('Finish the draft before publishing.', 400, 'draft_recipe');

  const recipe = { ...stripPrivateMedia(parsed), id, draft: undefined };

  const existing = await env.DB.prepare('SELECT published_by FROM recipes WHERE id = ?')
    .bind(id).first<{ published_by: string | null }>();
  if (existing && existing.published_by !== userOrResponse.id) {
    return error('This recipe id is already taken in the catalog.', 409);
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO recipes (id, data, title, source_url, source_domain, image, created_at, published_by, published_at)
     VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       data = excluded.data,
       title = excluded.title,
       image = excluded.image,
       published_at = excluded.published_at`,
  ).bind(id, JSON.stringify(recipe), recipe.title, recipe.image, now, userOrResponse.id, now).run();

  return json({ id, publishedAt: now }, existing ? 200 : 201);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const id = parseIdBody(body);
  if (!id) return error('id must be a non-empty string.');

  const result = await env.DB.prepare('DELETE FROM recipes WHERE id = ? AND published_by = ?')
    .bind(id, userOrResponse.id).run();
  if (!result.meta.changes) return error('Recipe is not published.', 404);
  return json({ ok: true });
};
