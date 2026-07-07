import type { Env } from '../../lib/env';
import { requireUser, isValidEmail } from '../../lib/auth';
import { getFriendship } from '../../lib/friends';
import { checkRateLimit } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

interface FriendListRow {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: number;
  accepted_at: number | null;
  friend_id: string;
  friend_name: string;
  friend_email: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;
  const userId = userOrResponse.id;

  const result = await env.DB.prepare(
    `SELECT f.requester_id, f.addressee_id, f.status, f.created_at, f.accepted_at,
            u.id AS friend_id, u.name AS friend_name, u.email AS friend_email
     FROM friendships f
     JOIN users u ON u.id = CASE WHEN f.requester_id = ?1 THEN f.addressee_id ELSE f.requester_id END
     WHERE f.requester_id = ?1 OR f.addressee_id = ?1
     ORDER BY f.created_at DESC`,
  ).bind(userId).all<FriendListRow>();

  const friends: unknown[] = [];
  const incoming: unknown[] = [];
  const outgoing: unknown[] = [];
  for (const row of result.results ?? []) {
    const entry = {
      id: row.friend_id,
      name: row.friend_name,
      email: row.friend_email,
      since: row.accepted_at ?? row.created_at,
    };
    if (row.status === 'accepted') friends.push(entry);
    else if (row.addressee_id === userId) incoming.push(entry);
    else outgoing.push(entry);
  }

  return json({ friends, incoming, outgoing });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;
  const userId = userOrResponse.id;

  // Sending requests looks up accounts by email, so keep it rate-limited to
  // make address enumeration impractical.
  const limit = await checkRateLimit(env, `friend-request:${userId}`, 10);
  if (!limit.ok) {
    return error('Too many friend requests. Try again shortly.', 429, 'rate_limited');
  }

  let body: { email?: string };
  try {
    body = await request.json() as { email?: string };
  } catch {
    return error('Invalid request body.');
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  if (!isValidEmail(email)) return error('A valid email is required.');
  if (email === userOrResponse.email.toLowerCase()) {
    return error("That's your own email — invite a friend instead.", 400, 'self');
  }

  const target = await env.DB.prepare(
    'SELECT id, name, email FROM users WHERE email = ?',
  ).bind(email).first<{ id: string; name: string; email: string }>();

  if (!target) return error('No COOKIE account with that email yet.', 404, 'not_found');

  const existing = await getFriendship(env, userId, target.id);
  const now = Date.now();

  if (existing?.status === 'accepted') {
    return error('You are already friends.', 409, 'already_friends');
  }
  if (existing && existing.requester_id === userId) {
    return error('Friend request already sent.', 409, 'already_requested');
  }
  if (existing) {
    // They already invited us — treat sending a request back as accepting.
    await env.DB.prepare(
      'UPDATE friendships SET status = ?, accepted_at = ? WHERE requester_id = ? AND addressee_id = ?',
    ).bind('accepted', now, target.id, userId).run();
    return json({ status: 'accepted', friend: { id: target.id, name: target.name, email: target.email, since: now } });
  }

  await env.DB.prepare(
    'INSERT INTO friendships (requester_id, addressee_id, status, created_at) VALUES (?, ?, ?, ?)',
  ).bind(userId, target.id, 'pending', now).run();

  return json({ status: 'pending', friend: { id: target.id, name: target.name, email: target.email, since: now } });
};
