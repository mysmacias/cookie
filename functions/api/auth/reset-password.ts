import type { Env } from '../../lib/env';
import { createSalt, hashPassword, isValidPassword } from '../../lib/auth';
import { checkRateLimit, clientIp } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const rate = await checkRateLimit(env, `reset-confirm:${clientIp(request)}`, 10);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  let body: { token?: string; password?: string };
  try {
    body = await request.json() as { token?: string; password?: string };
  } catch {
    return error('Invalid request body.');
  }

  const token = body.token?.trim() ?? '';
  const password = body.password ?? '';
  if (!token) return error('Reset token required.');
  if (!isValidPassword(password)) return error('Password must be at least 8 characters.');

  const row = await env.DB.prepare(
    'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?',
  ).bind(token).first<{ user_id: string; expires_at: number }>();

  if (!row || row.expires_at < Date.now()) {
    return error('Invalid or expired reset token.', 400, 'invalid_token');
  }

  const salt = createSalt();
  const passwordHash = await hashPassword(password, salt);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?')
      .bind(passwordHash, salt, row.user_id),
    env.DB.prepare('DELETE FROM password_reset_tokens WHERE token = ?').bind(token),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
  ]);

  return json({ ok: true });
};
