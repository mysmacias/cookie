import type { Env } from '../../lib/env';
import { clearSessionCookie, deleteSession } from '../../lib/auth';
import { json } from '../../lib/response';

function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'cookie_session') return rest.join('=') || null;
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = getSessionToken(request);
  if (token) {
    await deleteSession(env, token);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() });
};
