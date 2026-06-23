import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { fetchUserData } from '../../lib/db';
import { json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const data = await fetchUserData(env, userOrResponse.id);
  const body = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < body.length; i++) hash = ((hash << 5) - hash + body.charCodeAt(i)) | 0;
  const etag = `"${hash.toString(16)}"`;

  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return json(data, 200, { ETag: etag });
};
