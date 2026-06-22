import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useRecipes } from '../context/RecipeContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ApiError } from '../services/apiClient';

type AuthMode = 'login' | 'signup';

function OAuthButton({
  href,
  label,
  icon,
  disabled,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      className={`flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-full border border-outline-variant/40 bg-surface font-label uppercase tracking-widest text-xs transition-colors ${
        disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-surface-container hover:border-outline-variant'
      }`}
    >
      {icon}
      {label}
    </a>
  );
}

export const AuthScreen: React.FC = () => {
  const auth = useAuth();
  const recipes = useRecipes();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    if (authError) {
      setError(authError);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await auth.login(email, password);
      } else {
        await auth.signup(email, password, name || undefined);
      }
      await recipes.refreshRecipes();
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <h1 className="text-5xl font-headline font-bold italic tracking-[-0.06em] text-primary mb-3">
            COOKIE
          </h1>
          <p className="text-on-surface-variant font-body">
            Sign in to keep your recipes, bookmarks, and edits synced to your account.
          </p>
        </div>

        <div className="bg-surface-container-low rounded-3xl p-8 shadow-xl shadow-primary/5 border border-outline-variant/20">
          <div className="space-y-3 mb-6">
            <OAuthButton
              href="/api/auth/oauth/google"
              label="Continue with Google"
              disabled={submitting}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              }
            />
            <OAuthButton
              href="/api/auth/oauth/github"
              label="Continue with GitHub"
              disabled={submitting}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.395-.135-.345-.72-1.395-1.23-1.665-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              }
            />
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-surface-container-low px-3 text-on-surface-variant font-label">or</span>
            </div>
          </div>

          <div className="flex gap-2 mb-8 p-1 bg-surface rounded-full">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest transition-colors ${
                mode === 'login' ? 'bg-primary text-on-primary' : 'hover:text-primary'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 rounded-full text-xs font-label uppercase tracking-widest transition-colors ${
                mode === 'signup' ? 'bg-primary text-on-primary' : 'hover:text-primary'
              }`}
            >
              Sign up
            </button>
          </div>

          {auth.hasLocalImport && (
            <p className="mb-6 text-sm text-on-surface-variant bg-primary/5 rounded-xl px-4 py-3">
              We found recipes saved on this device. They will be added to your account when you sign in.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <Label as="label" htmlFor="name" className="block mb-2">Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            )}

            <div>
              <Label as="label" htmlFor="email" className="block mb-2">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label as="label" htmlFor="password" className="block mb-2">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-secondary" role="alert">{error}</p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
