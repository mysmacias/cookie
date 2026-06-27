import type { Env } from '../../lib/env';

// Public, unauthenticated read of the global recipe catalog (the `recipes`
// table seeded by scripts/load-recipes-d1.mjs). Returned to every visitor so
// the scraped library is shared app-wide, not tied to one account.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { results } = await env.DB
    .prepare('SELECT data FROM recipes ORDER BY created_at DESC')
    .all<{ data: string }>();

  // Each `data` column already holds a valid Recipe JSON object, so we splice
  // the raw strings together instead of parsing + re-serializing 1000 objects.
  const body = `{"recipes":[${(results ?? []).map(r => r.data).join(',')}]}`;

  let hash = 0;
  for (let i = 0; i < body.length; i++) hash = ((hash << 5) - hash + body.charCodeAt(i)) | 0;
  const etag = `"${hash.toString(16)}"`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ETag: etag,
    // Catalog changes rarely; let the browser/edge cache it and revalidate.
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
  };

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(body, { status: 200, headers });
};
