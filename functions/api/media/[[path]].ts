import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { error } from '../../lib/response';

// A [[path]] catch-all yields the path as an array of URL-encoded segments;
// rebuild the R2 key with slashes (Array#toString would join with commas).
function mediaKeyFromParams(path: string[] | string | undefined): string {
  try {
    if (Array.isArray(path)) return path.map(decodeURIComponent).join('/');
    return path ? decodeURIComponent(path) : '';
  } catch {
    return '';
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.MEDIA_BUCKET) return error('Media storage is not configured.', 503);

  const key = mediaKeyFromParams(params.path as string[] | string | undefined);
  if (!key || !key.startsWith(`users/${userOrResponse.id}/`)) {
    return error('Forbidden.', 403);
  }

  const obj = await env.MEDIA_BUCKET.get(key);
  if (!obj) return error('Not found.', 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.MEDIA_BUCKET) return error('Media storage is not configured.', 503);

  const key = mediaKeyFromParams(params.path as string[] | string | undefined);
  if (!key || !key.startsWith(`users/${userOrResponse.id}/`)) {
    return error('Forbidden.', 403);
  }

  await env.MEDIA_BUCKET.delete(key);
  return new Response(null, { status: 204 });
};
