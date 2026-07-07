import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { error, json } from '../../lib/response';

// Accept a pending request sent to the current user by :id.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const requesterId = params.id as string;
  const result = await env.DB.prepare(
    `UPDATE friendships SET status = 'accepted', accepted_at = ?
     WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
  ).bind(Date.now(), requesterId, userOrResponse.id).run();

  if (!result.meta.changes) return error('Friend request not found.', 404);
  return json({ ok: true });
};

// Remove whatever connection exists with :id — declines an incoming request,
// cancels an outgoing one, or unfriends.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const otherId = params.id as string;
  const result = await env.DB.prepare(
    `DELETE FROM friendships
     WHERE (requester_id = ?1 AND addressee_id = ?2) OR (requester_id = ?2 AND addressee_id = ?1)`,
  ).bind(userOrResponse.id, otherId).run();

  if (!result.meta.changes) return error('Friend not found.', 404);
  return new Response(null, { status: 204 });
};
