import type { Env } from '../../lib/env';
import { getUserFromRequest } from '../../lib/auth';
import { json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await getUserFromRequest(env, request);
  if (!user) return json({ user: null });
  return json({ user });
};
