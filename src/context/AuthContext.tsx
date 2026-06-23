import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthUser } from '../services/authService';
import * as authService from '../services/authService';
import {
  clearUserDataCache,
  fetchUserData,
  hasLocalDataToImport,
  importLocalDataIfNeeded,
} from '../services/recipeApi';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasLocalImport: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
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
  const user = await authService.fetchCurrentUser();
  if (!user) return null;

  await importLocalDataIfNeeded();
  return user;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLocalImport, setHasLocalImport] = useState(() => hasLocalDataToImport());

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
        if (!cancelled) setUser(current);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authService.login(email, password);
    await importLocalDataIfNeeded();
    setUser(loggedIn);
    setHasLocalImport(hasLocalDataToImport());
  }, []);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const created = await authService.signup(email, password, name);
    await importLocalDataIfNeeded();
    setUser(created);
    setHasLocalImport(hasLocalDataToImport());
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    clearUserDataCache();
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    clearUserDataCache();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: user !== null,
    hasLocalImport,
    login,
    signup,
    logout,
    deleteAccount,
    refreshUser,
  }), [user, isLoading, hasLocalImport, login, signup, logout, deleteAccount, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { fetchUserData };
