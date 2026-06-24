import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../services/authService';
import * as authService from '../services/authService';
import {
  clearUserDataCache,
  fetchUserData,
  hasLocalDataToImport,
  importLocalDataIfNeeded,
  loadGuestData,
  setGuestMode,
} from '../services/recipeApi';

const GUEST_MODE_KEY = 'cookie_guest_mode';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  hasLocalImport: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  continueAsGuest: () => void;
  exitGuest: () => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

async function bootstrapSession(): Promise<AuthUser | null> {
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('devauth')) {
    return { id: 'dev', email: 'dev@test.com', name: 'Dev' };
  }
  const user = await authService.fetchCurrentUser();
  if (!user) return null;

  await importLocalDataIfNeeded();
  return user;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocalImport, setHasLocalImport] = useState(() => hasLocalDataToImport());

  const clearGuest = useCallback(() => {
    localStorage.removeItem(GUEST_MODE_KEY);
    setGuestMode(false);
    setIsGuest(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = await authService.fetchCurrentUser();
    setUser(current);
    setHasLocalImport(hasLocalDataToImport());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await bootstrapSession();
        if (cancelled) return;
        if (current) {
          clearGuest();
          setUser(current);
        } else if (localStorage.getItem(GUEST_MODE_KEY) === '1') {
          setGuestMode(true);
          setIsGuest(true);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clearGuest]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authService.login(email, password);
    await importLocalDataIfNeeded();
    clearGuest();
    setUser(loggedIn);
    setHasLocalImport(hasLocalDataToImport());
  }, [clearGuest]);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const created = await authService.signup(email, password, name);
    await importLocalDataIfNeeded();
    clearGuest();
    setUser(created);
    setHasLocalImport(hasLocalDataToImport());
  }, [clearGuest]);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_MODE_KEY, '1');
    setGuestMode(true);
    loadGuestData();
    setIsGuest(true);
    setHasLocalImport(hasLocalDataToImport());
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearUserDataCache();
    clearGuest();
    setUser(null);
  }, [clearGuest]);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    clearUserDataCache();
    clearGuest();
    setUser(null);
  }, [clearGuest]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: user !== null,
    isGuest: user === null && isGuest,
    hasLocalImport,
    login,
    signup,
    continueAsGuest,
    exitGuest: clearGuest,
    logout,
    deleteAccount,
    refreshUser,
  }), [user, isGuest, isLoading, hasLocalImport, login, signup, continueAsGuest, clearGuest, logout, deleteAccount, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { fetchUserData };
