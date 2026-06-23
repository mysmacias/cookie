import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { error } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.MEDIA_BUCKET) return error('Media storage is not configured.', 503);

  const key = decodeURIComponent((params.path as string[] | string | undefined)?.toString() ?? '');
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

  const key = decodeURIComponent((params.path as string[] | string | undefined)?.toString() ?? '');
  if (!key || !key.startsWith(`users/${userOrResponse.id}/`)) {
    return error('Forbidden.', 403);
  }

  await env.MEDIA_BUCKET.delete(key);
  return new Response(null, { status: 204 });
};
