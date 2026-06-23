import React, { useState } from 'react';
import { Moon, Sun, Monitor, Trash2 } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemePreference } from '../hooks/useTheme';
import { useToast } from '../components/ui/Toast';

interface SettingsScreenProps {
  navigateTo: (screen: Screen) => void;
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigateTo }) => {
  const auth = useAuth();
  const { preference, setPreference } = useTheme();
  const { showToast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await auth.deleteAccount();
      showToast('Account deleted');
      navigateTo('library');
    } catch {
      showToast('Could not delete account');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <ScreenShell onBack={() => navigateTo('library')} backLabel="Back to Library">
      <div className="space-y-3">
        <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Account</p>
        <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Settings</h1>
      </div>

      {auth.user && (
        <section className="rounded-2xl border border-outline-variant/30 p-6 space-y-2">
          <p className="font-headline italic text-2xl">{auth.user.name || 'Chef'}</p>
          <p className="text-on-surface-variant">{auth.user.email}</p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-label uppercase tracking-widest text-on-surface-variant">Appearance</h2>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={preference === opt.value}
              onClick={() => setPreference(opt.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-label uppercase tracking-widest transition-colors ${
                preference === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-label uppercase tracking-widest text-on-surface-variant">Legal</h2>
        <button
          type="button"
          onClick={() => navigateTo('privacy')}
          className="text-sm font-label uppercase tracking-widest text-primary hover:underline"
        >
          Privacy policy
        </button>
      </section>

      <section className="rounded-2xl border border-error/30 bg-error-container/20 p-6 space-y-4">
        <h2 className="text-sm font-label uppercase tracking-widest text-secondary">Danger zone</h2>
        <p className="text-sm text-on-surface-variant">
          Permanently delete your account, recipes, collections, and shopping lists. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={deleting}
          className="flex items-center gap-2 px-5 py-3 rounded-full border border-secondary/40 text-secondary text-xs font-label uppercase tracking-widest font-bold hover:bg-secondary/10"
        >
          <Trash2 size={16} />
          Delete account
        </button>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        message="All your recipes, bookmarks, collections, and notes will be permanently removed."
        confirmLabel={deleting ? 'Deleting…' : 'Delete account'}
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScreenShell>
  );
};
