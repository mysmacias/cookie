import type { Env } from '../../../../lib/env';
import { completeOAuth, isOAuthProvider } from '../../../../lib/oauth';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const provider = params.provider as string;
  if (!isOAuthProvider(provider)) {
    return new Response('Not found', { status: 404 });
  }
  return completeOAuth(request, env, provider);
};
