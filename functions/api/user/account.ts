import type { Env } from '../../lib/env';
import { clearSessionCookie } from '../../lib/auth';
import { requireUser } from '../../lib/auth';
import { deleteUserMediaPrefix } from '../../lib/media';
import { error, json } from '../../lib/response';

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  await deleteUserMediaPrefix(env, userOrResponse.id);

  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM oauth_accounts WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM bookmarks WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM user_recipes WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM recipe_overrides WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM collection_recipes WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ?)').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM collections WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM shopping_lists WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM recipe_notes WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM scan_usage WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM meal_plans WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM shared_recipes WHERE user_id = ?').bind(userOrResponse.id),
    env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userOrResponse.id),
  ]);

  return json({ ok: true }, 200, {
    'Set-Cookie': clearSessionCookie(),
  });
};
