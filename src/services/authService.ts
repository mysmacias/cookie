import { apiFetch } from './apiClient';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const data = await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
  return data.user;
}

export async function signup(email: string, password: string, name?: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return data.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}
