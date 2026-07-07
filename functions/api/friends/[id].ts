import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { acceptFriendship, getFriendship } from '../../lib/friends';
import { error, json } from '../../lib/response';

// Accept a pending request sent to the current user by :id.
export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const requesterId = params.id as string;
  const changes = await acceptFriendship(env, requesterId, userOrResponse.id);
  if (!changes) {
    // A repeated accept (double-click, second tab) is a success, not an error.
    const row = await getFriendship(env, userOrResponse.id, requesterId);
    if (row?.status === 'accepted') return json({ ok: true });
    return error('Friend request not found.', 404);
  }
  return json({ ok: true });
};

// Remove the connection with :id — declines an incoming request, cancels an
// outgoing one, or unfriends.
export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const otherId = params.id as string;
  const row = await getFriendship(env, userOrResponse.id, otherId);
  if (!row) return error('Friend not found.', 404);

  if (row.status === 'pending' && row.addressee_id === userOrResponse.id) {
    // Sticky decline: keep the row so the requester can't re-request, while
    // to them the invite just looks unanswered.
    await env.DB.prepare(
      `UPDATE friendships SET status = 'declined' WHERE requester_id = ? AND addressee_id = ?`,
    ).bind(otherId, userOrResponse.id).run();
  } else {
    await env.DB.prepare(
      `DELETE FROM friendships
       WHERE (requester_id = ?1 AND addressee_id = ?2) OR (requester_id = ?2 AND addressee_id = ?1)`,
    ).bind(userOrResponse.id, otherId).run();
  }

  return new Response(null, { status: 204 });
};
