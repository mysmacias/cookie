import type { Env } from '../../lib/env';
import { requireUser, generateId } from '../../lib/auth';
import { error, json } from '../../lib/response';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.MEDIA_BUCKET) {
    return error('Media storage is not configured.', 503, 'media_not_configured');
  }

  let body: { dataUrl?: string; filename?: string };
  try {
    body = await request.json() as { dataUrl?: string; filename?: string };
  } catch {
    return error('Invalid request body.');
  }

  const match = body.dataUrl?.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (!match) return error('Expected a base64 data URL image.');

  const mediaType = match[1];
  if (!ALLOWED.has(mediaType)) return error('Unsupported image type.');

  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  if (bytes.byteLength > MAX_BYTES) return error('Image too large (max 5 MB).', 413);

  const ext = mediaType.split('/')[1] ?? 'jpg';
  const key = `users/${userOrResponse.id}/${generateId()}.${ext}`;
  await env.MEDIA_BUCKET.put(key, bytes, {
    httpMetadata: { contentType: mediaType },
  });

  const url = `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
  return json({ url, key }, 201);
};
