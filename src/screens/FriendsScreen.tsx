import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChefHat, Plus, Trash2, Users, X } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/apiClient';
import {
  acceptFriendRequest,
  fetchFriendActivity,
  fetchFriends,
  removeFriend,
  sendFriendRequest,
  type FriendActivityEvent,
  type FriendEntry,
  type FriendsOverview,
} from '../services/friendsApi';

interface FriendsScreenProps {
  navigateTo: (screen: Screen) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xs font-label uppercase tracking-widest text-on-surface-variant font-bold">
    {children}
  </h2>
);

export const FriendsScreen: React.FC<FriendsScreenProps> = ({ navigateTo }) => {
  const auth = useAuth();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<FriendsOverview>({ friends: [], incoming: [], outgoing: [] });
  const [activity, setActivity] = useState<FriendActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<FriendEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsData, activityData] = await Promise.all([fetchFriends(), fetchFriendActivity()]);
      setOverview(friendsData);
      setActivity(activityData);
    } catch {
      showToast('Could not load friends');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!auth.isGuest) void load();
    else setLoading(false);
  }, [load, auth.isGuest]);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const status = await sendFriendRequest(trimmed);
      setEmail('');
      showToast(status === 'accepted' ? "You're now friends!" : 'Friend request sent');
      await load();
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'Could not send request');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (friend: FriendEntry) => {
    try {
      await acceptFriendRequest(friend.id);
      showToast(`You're now friends with ${friend.name || friend.email}`);
      await load();
    } catch {
      showToast('Could not accept request');
    }
  };

  const handleRemove = async (friend: FriendEntry, message: string) => {
    try {
      await removeFriend(friend.id);
      showToast(message);
      await load();
    } catch {
      showToast('Could not update friends');
    }
  };

  if (auth.isGuest) {
    return (
      <ScreenShell onBack={() => navigateTo('library')} backLabel="Back to Library">
        <div className="space-y-3">
          <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Kitchen table</p>
          <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Friends</h1>
        </div>
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center space-y-4">
          <Users className="mx-auto text-outline-variant" size={40} />
          <p className="text-on-surface-variant">Friends are tied to your account. Sign up to add friends and see what they're cooking.</p>
          <button
            type="button"
            onClick={() => auth.exitGuest()}
            className="px-5 py-3 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold"
          >
            Sign up to continue
          </button>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell onBack={() => navigateTo('library')} backLabel="Back to Library">
      <div className="space-y-3">
        <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Kitchen table</p>
        <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Friends</h1>
        <p className="text-on-surface-variant">Add friends by email and see what they've been cooking.</p>
      </div>

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="friend@example.com"
          aria-label="Friend's email"
          className="flex-1 rounded-full border border-outline-variant px-5 py-3 bg-surface focus:ring-2 focus:ring-primary/20"
          onKeyDown={e => e.key === 'Enter' && void handleSend()}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={sending}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold disabled:opacity-50"
        >
          <Plus size={16} />
          Add friend
        </button>
      </div>

      {loading ? (
        <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
      ) : (
        <>
          {overview.incoming.length > 0 && (
            <section className="space-y-3">
              <SectionLabel>Requests for you</SectionLabel>
              <ul className="space-y-3">
                {overview.incoming.map(f => (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-headline italic text-xl truncate">{f.name || f.email}</p>
                      <p className="text-xs text-on-surface-variant truncate mt-1">{f.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAccept(f)}
                      className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-[10px] font-label uppercase tracking-widest font-bold"
                    >
                      <Check size={14} />
                      Accept
                    </button>
                    <button
                      type="button"
                      aria-label={`Decline request from ${f.name || f.email}`}
                      onClick={() => void handleRemove(f, 'Request declined')}
                      className="p-3 rounded-full border border-outline-variant text-on-surface-variant hover:text-secondary"
                    >
                      <X size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <SectionLabel>From their kitchens</SectionLabel>
            {activity.length === 0 ? (
              <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center space-y-4">
                <ChefHat className="mx-auto text-outline-variant" size={40} />
                <p className="text-on-surface-variant">
                  {overview.friends.length === 0
                    ? 'No friends yet. Add someone by email to see what they cook.'
                    : "Nothing yet — your friends haven't cooked or added recipes recently."}
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {activity.map(event => (
                  <li
                    key={`${event.type}-${event.friendId}-${event.recipeId}-${event.at}`}
                    className="flex items-center gap-4 rounded-2xl border border-outline-variant/30 px-5 py-4"
                  >
                    {event.recipeImage ? (
                      <img
                        src={event.recipeImage}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
                        <ChefHat size={20} className="text-outline-variant" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-bold">{event.friendName}</span>{' '}
                        {event.type === 'cooked' ? 'cooked' : 'added'}{' '}
                        <span className="font-headline italic">{event.recipeTitle}</span>
                      </p>
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">
                        {timeAgo(event.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <SectionLabel>Your friends</SectionLabel>
            {overview.friends.length === 0 && overview.outgoing.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                No friends yet — invite someone with their email above.
              </p>
            ) : (
              <ul className="space-y-3">
                {overview.friends.map(f => (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-headline italic text-xl truncate">{f.name || f.email}</p>
                      <p className="text-xs text-on-surface-variant truncate mt-1">{f.email}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${f.name || f.email}`}
                      onClick={() => setRemoveTarget(f)}
                      className="p-3 rounded-full border border-outline-variant text-on-surface-variant hover:text-secondary"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
                {overview.outgoing.map(f => (
                  <li key={f.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-outline-variant/50 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-headline italic text-xl truncate">{f.name || f.email}</p>
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">Invited — waiting for them</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemove(f, 'Invite cancelled')}
                      className="px-4 py-2 rounded-full border border-outline-variant text-on-surface-variant text-[10px] font-label uppercase tracking-widest hover:text-secondary"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove friend?"
        message={removeTarget ? `${removeTarget.name || removeTarget.email} will no longer see your cooking, and you won't see theirs.` : ''}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) void handleRemove(removeTarget, 'Friend removed');
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </ScreenShell>
  );
};
