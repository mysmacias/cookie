import type { Env } from './env';

// Opportunistic cleanup of rows that expire but were never deleted:
// expired sessions and password-reset tokens, lapsed share links, and
// old daily scan counters. Runs at most once per interval per isolate,
// piggybacking on session creation (login/signup/oauth) so no cron is
// needed on Cloudflare Pages.
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const SCAN_USAGE_KEEP_DAYS = 30;
let lastPruneAt = 0;

export async function pruneExpiredRows(env: Env): Promise<void> {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;

  const cutoffDay = new Date(now - SCAN_USAGE_KEEP_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM shared_recipes WHERE expires_at IS NOT NULL AND expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM scan_usage WHERE day < ?').bind(cutoffDay),
  ]);
}
