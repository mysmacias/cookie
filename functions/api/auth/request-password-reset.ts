import type { Env } from '../../lib/env';
import {
  createSalt,
  generateId,
  hashPassword,
  isValidEmail,
  isValidPassword,
} from '../../lib/auth';
import { checkRateLimit, clientIp } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

const TOKEN_HOURS = 1;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rate = await checkRateLimit(env, `reset:${clientIp(request)}`, 5);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  let body: { email?: string };
  try {
    body = await request.json() as { email?: string };
  } catch {
    return error('Invalid request body.');
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) return json({ ok: true });

  const user = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?',
  ).bind(email).first<{ id: string }>();

  if (!user) return json({ ok: true });

  const token = generateId();
  const now = Date.now();
  const expiresAt = now + TOKEN_HOURS * 60 * 60 * 1000;

  await env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare(
    'INSERT INTO password_reset_tokens (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  ).bind(token, user.id, expiresAt, now).run();

  // Email delivery is not configured; token returned only in non-production for dev testing.
  const isProd = request.url.startsWith('https://') && !request.url.includes('localhost');
  return json(isProd ? { ok: true } : { ok: true, devToken: token });
};
