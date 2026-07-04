import type { Env } from './env';

const WINDOW_MS = 60_000;
const PRUNE_AGE_MS = 5 * 60_000;
let lastPruneAt = 0;

export async function pruneRateLimits(env: Env): Promise<void> {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_AGE_MS) return;
  lastPruneAt = now;
  await env.DB.prepare(
    'DELETE FROM rate_limits WHERE ? - window_start > ?',
  ).bind(now, WINDOW_MS * 2).run();
}

export async function checkRateLimit(
  env: Env,
  key: string,
  max: number,
): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  await pruneRateLimits(env);
  const now = Date.now();
  // Single atomic upsert: resets the window if it has lapsed, otherwise
  // increments — concurrent requests can't both read a stale count.
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN ?2 - rate_limits.window_start > ?3 THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN ?2 - rate_limits.window_start > ?3 THEN ?2 ELSE rate_limits.window_start END
     RETURNING count, window_start`,
  ).bind(key, now, WINDOW_MS).first<{ count: number; window_start: number }>();

  if (row && row.count > max) {
    const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - row.window_start)) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true };
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP')
    ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? 'unknown';
}
