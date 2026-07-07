import type { Env } from './env';

export interface FriendRow {
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: number;
  accepted_at: number | null;
}

/** The friendship row between two users, regardless of who sent the request. */
export async function getFriendship(env: Env, userA: string, userB: string): Promise<FriendRow | null> {
  return env.DB.prepare(
    `SELECT requester_id, addressee_id, status, created_at, accepted_at
     FROM friendships
     WHERE (requester_id = ?1 AND addressee_id = ?2) OR (requester_id = ?2 AND addressee_id = ?1)`,
  ).bind(userA, userB).first<FriendRow>();
}

/** Accepts a pending request; returns the number of rows updated (0 if none was pending). */
export async function acceptFriendship(env: Env, requesterId: string, addresseeId: string): Promise<number> {
  const result = await env.DB.prepare(
    `UPDATE friendships SET status = 'accepted', accepted_at = ?
     WHERE requester_id = ? AND addressee_id = ? AND status = 'pending'`,
  ).bind(Date.now(), requesterId, addresseeId).run();
  return result.meta.changes ?? 0;
}

/** Ids of users with an accepted friendship with this user. */
export async function getAcceptedFriendIds(env: Env, userId: string): Promise<string[]> {
  const result = await env.DB.prepare(
    `SELECT CASE WHEN requester_id = ?1 THEN addressee_id ELSE requester_id END AS friend_id
     FROM friendships
     WHERE status = 'accepted' AND (requester_id = ?1 OR addressee_id = ?1)`,
  ).bind(userId).all<{ friend_id: string }>();
  return (result.results ?? []).map(r => r.friend_id);
}
