import { apiFetch } from './apiClient';

export interface FriendEntry {
  id: string;
  name: string;
  email: string;
}

export interface FriendsOverview {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}

export interface FriendActivityEvent {
  type: 'cooked' | 'added';
  friendId: string;
  friendName: string;
  recipeId: string;
  recipeTitle: string;
  recipeImage: string | null;
  at: number;
}

export async function fetchFriends(): Promise<FriendsOverview> {
  return apiFetch<FriendsOverview>('/api/friends');
}

/** Sends a request; resolves to 'accepted' when it matched a pending invite from them. */
export async function sendFriendRequest(email: string): Promise<'pending' | 'accepted'> {
  const data = await apiFetch<{ status: 'pending' | 'accepted' }>('/api/friends', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return data.status;
}

export async function acceptFriendRequest(userId: string): Promise<void> {
  await apiFetch(`/api/friends/${encodeURIComponent(userId)}`, { method: 'POST' });
}

/** Declines an incoming request, cancels an outgoing one, or unfriends. */
export async function removeFriend(userId: string): Promise<void> {
  await apiFetch(`/api/friends/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function fetchFriendActivity(): Promise<FriendActivityEvent[]> {
  const data = await apiFetch<{ events: FriendActivityEvent[] }>('/api/friends/activity');
  return data.events;
}
