import type { Env } from '../lib/env';
import { requireUser } from '../lib/auth';
import { checkRateLimit } from '../lib/rateLimit';
import { error, json } from '../lib/response';
import { parseShoppingListItems } from '../lib/validation';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const row = await env.DB.prepare(
    'SELECT data FROM shopping_lists WHERE user_id = ?',
  ).bind(userOrResponse.id).first<{ data: string }>();

  if (!row) return json({ items: [] });
  try {
    const parsed = JSON.parse(row.data);
    return json({ items: Array.isArray(parsed) ? parsed : [] });
  } catch {
    return json({ items: [] });
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `shopping:${userOrResponse.id}`, 30);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  let body: { items?: unknown };
  try {
    body = await request.json() as { items?: unknown };
  } catch {
    return error('Invalid request body.');
  }

  const items = parseShoppingListItems(body.items);
  if (!items) return error('Invalid shopping list items.');

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO shopping_lists (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).bind(userOrResponse.id, JSON.stringify(items), now).run();

  return json({ ok: true });
};
