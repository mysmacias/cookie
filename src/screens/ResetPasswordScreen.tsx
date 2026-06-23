import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { ApiError } from '../services/apiClient';
import * as authService from '../services/authService';

export const ResetPasswordScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token')?.trim();
    if (t) setToken(t);
    document.title = 'Reset password · COOKIE';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token.trim()) {
      setError('Reset link is invalid or missing a token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword(token.trim(), password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-headline font-bold italic tracking-[-0.06em] text-primary mb-3">COOKIE</h1>
          <p className="text-on-surface-variant font-body">Choose a new password for your account.</p>
        </div>

        <div className="bg-surface-container-low rounded-3xl p-8 shadow-xl shadow-primary/5 border border-outline-variant/20">
          {success ? (
            <div className="space-y-6 text-center">
              <p className="text-primary" role="status">Your password has been updated.</p>
              <Button type="button" variant="primary" size="lg" className="w-full" onClick={onDone}>
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label as="label" htmlFor="reset-password" className="block mb-2">New password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label as="label" htmlFor="reset-confirm" className="block mb-2">Confirm password</Label>
                <Input
                  id="reset-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-secondary" role="alert">{error}</p>}
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
