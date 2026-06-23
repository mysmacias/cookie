import type { Env } from '../../lib/env';
import {
  createSession,
  hashPassword,
  isValidEmail,
  isValidPassword,
  sessionCookie,
} from '../../lib/auth';
import { checkRateLimit, clientIp } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

interface LoginBody {
  email?: string;
  password?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rate = await checkRateLimit(env, `login:${clientIp(request)}`, 10);
  if (!rate.ok) return error('Too many login attempts. Try again later.', 429, 'rate_limited');

  let body: LoginBody;
  try {
    body = await request.json() as LoginBody;
  } catch {
    return error('Invalid request body.');
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!isValidEmail(email)) return error('Please enter a valid email address.');
  if (!isValidPassword(password)) return error('Invalid email or password.', 401);

  const user = await env.DB.prepare(
    'SELECT id, email, name, password_hash, salt FROM users WHERE email = ?',
  ).bind(email).first<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    salt: string;
  }>();

  if (!user) return error('Invalid email or password.', 401);

  if (!user.password_hash || !user.salt) {
    return error('This account uses Google or GitHub sign-in. Use that option instead.', 401);
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) return error('Invalid email or password.', 401);

  const session = await createSession(env, user.id);

  return json(
    { user: { id: user.id, email: user.email, name: user.name } },
    200,
    { 'Set-Cookie': sessionCookie(session.token, session.expiresAt, request.url) },
  );
};
