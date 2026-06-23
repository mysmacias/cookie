import type { Env } from './env';

const WINDOW_MS = 60_000;

export async function checkRateLimit(
  env: Env,
  key: string,
  max: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const now = Date.now();
  const row = await env.DB.prepare(
    'SELECT count, window_start FROM rate_limits WHERE key = ?',
  ).bind(key).first<{ count: number; window_start: number }>();

  if (!row || now - row.window_start > WINDOW_MS) {
    await env.DB.prepare(
      'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start',
    ).bind(key, now).run();
    return { ok: true };
  }

  if (row.count >= max) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - row.window_start)) / 1000);
    return { ok: false, retryAfterSec };
  }

  await env.DB.prepare(
    'UPDATE rate_limits SET count = count + 1 WHERE key = ?',
  ).bind(key).run();
  return { ok: true };
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? 'unknown';
}
