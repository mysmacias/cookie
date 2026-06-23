import type { Env } from '../../lib/env';
import { error, json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const token = params.token as string | undefined;
  if (!token) return error('Share token required.');

  const row = await env.DB.prepare(
    'SELECT recipe_data, expires_at FROM shared_recipes WHERE token = ?',
  ).bind(token).first<{ recipe_data: string; expires_at: number | null }>();

  if (!row || (row.expires_at && row.expires_at < Date.now())) {
    return error('Share link expired or not found.', 404);
  }

  return json({ recipe: JSON.parse(row.recipe_data) });
};
