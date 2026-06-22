import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { fetchUserData } from '../../lib/db';
import { json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const data = await fetchUserData(env, userOrResponse.id);
  return json(data);
};
