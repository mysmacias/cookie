import type { Env } from '../../../lib/env';
import { isOAuthProvider, startOAuth } from '../../../lib/oauth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const provider = params.provider as string;
  if (!isOAuthProvider(provider)) {
    return new Response('Not found', { status: 404 });
  }
  return startOAuth(request, env, provider);
};
