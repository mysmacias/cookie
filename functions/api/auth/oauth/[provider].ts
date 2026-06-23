import type { Env } from '../../../lib/env';
import { isOAuthProvider, startOAuth } from '../../../lib/oauth';
import { checkRateLimit, clientIp } from '../../../lib/rateLimit';
import { error } from '../../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const rate = await checkRateLimit(env, `oauth:${clientIp(request)}`, 15);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  const provider = params.provider as string;
  if (!isOAuthProvider(provider)) {
    return new Response('Not found', { status: 404 });
  }
  return startOAuth(request, env, provider);
};
