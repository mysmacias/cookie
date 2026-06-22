import type { Env, OAuthProvider } from './env';
import { createSession, generateId, sessionCookie } from './auth';

const STATE_COOKIE = 'oauth_state';
const PROVIDER_COOKIE = 'oauth_provider';
const STATE_MAX_AGE = 600;

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'github';
}

function requestOrigin(request: Request): string {
  return new URL(request.url).origin;
}

function cookieSecure(request: Request): string {
  return request.url.startsWith('https://') ? '; Secure' : '';
}

function setCookie(name: string, value: string, request: Request, maxAge = STATE_MAX_AGE): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${cookieSecure(request)}`;
}

function clearCookie(name: string, request: Request): string {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cookieSecure(request)}`;
}

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=') || null;
  }
  return null;
}

function redirect(url: string, cookies: string[]): Response {
  const headers = new Headers({ Location: url });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

function authErrorRedirect(request: Request, message: string): Response {
  const url = new URL('/', requestOrigin(request));
  url.searchParams.set('auth_error', message);
  return redirect(url.toString(), [
    clearCookie(STATE_COOKIE, request),
    clearCookie(PROVIDER_COOKIE, request),
  ]);
}

function providerConfigured(env: Env, provider: OAuthProvider): boolean {
  if (provider === 'google') return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

function callbackUrl(request: Request, provider: OAuthProvider): string {
  return `${requestOrigin(request)}/api/auth/oauth/callback/${provider}`;
}

export function startOAuth(request: Request, env: Env, provider: OAuthProvider): Response {
  if (!providerConfigured(env, provider)) {
    return authErrorRedirect(request, `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not configured.`);
  }

  const state = generateId();
  const redirectUri = callbackUrl(request, provider);
  const cookies = [
    setCookie(STATE_COOKIE, state, request),
    setCookie(PROVIDER_COOKIE, provider, request),
  ];

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, cookies);
  }

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
  });
  return redirect(`https://github.com/login/oauth/authorize?${params}`, cookies);
}

interface OAuthProfile {
  providerUserId: string;
  email: string;
  name: string;
}

async function exchangeGoogleCode(request: Request, env: Env, code: string): Promise<OAuthProfile> {
  const redirectUri = callbackUrl(request, 'google');
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenRes.ok) throw new Error('Could not complete Google sign-in.');

  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error('Could not complete Google sign-in.');

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) throw new Error('Could not read your Google profile.');

  const profile = await userRes.json() as { sub?: string; email?: string; name?: string };
  if (!profile.sub || !profile.email) throw new Error('Your Google account did not provide an email address.');

  return {
    providerUserId: profile.sub,
    email: profile.email.toLowerCase(),
    name: profile.name?.trim() ?? '',
  };
}

async function exchangeGithubCode(request: Request, env: Env, code: string): Promise<OAuthProfile> {
  const redirectUri = callbackUrl(request, 'github');
  const body = new URLSearchParams({
    code,
    client_id: env.GITHUB_CLIENT_ID!,
    client_secret: env.GITHUB_CLIENT_SECRET!,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  });

  if (!tokenRes.ok) throw new Error('Could not complete GitHub sign-in.');

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    throw new Error(tokenData.error ?? 'Could not complete GitHub sign-in.');
  }

  const headers = {
    Authorization: `Bearer ${tokenData.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Cookie-App',
  };

  const userRes = await fetch('https://api.github.com/user', { headers });
  if (!userRes.ok) throw new Error('Could not read your GitHub profile.');

  const profile = await userRes.json() as { id?: number; login?: string; name?: string; email?: string | null };

  let email = profile.email?.trim().toLowerCase() ?? '';
  if (!email) {
    const emailsRes = await fetch('https://api.github.com/user/emails', { headers });
    if (emailsRes.ok) {
      const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find(e => e.primary && e.verified) ?? emails.find(e => e.verified);
      email = primary?.email?.toLowerCase() ?? '';
    }
  }

  if (!profile.id || !email) {
    throw new Error('Your GitHub account did not provide a verified email address.');
  }

  return {
    providerUserId: String(profile.id),
    email,
    name: profile.name?.trim() || profile.login?.trim() || '',
  };
}

async function findOrCreateOAuthUser(
  env: Env,
  provider: OAuthProvider,
  profile: OAuthProfile,
): Promise<string> {
  const existingLink = await env.DB.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?',
  ).bind(provider, profile.providerUserId).first<{ user_id: string }>();

  if (existingLink) return existingLink.user_id;

  const byEmail = await env.DB.prepare(
    'SELECT id, name FROM users WHERE email = ?',
  ).bind(profile.email).first<{ id: string; name: string }>();

  let userId: string;
  if (byEmail) {
    userId = byEmail.id;
    if (!byEmail.name && profile.name) {
      await env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(profile.name, userId).run();
    }
  } else {
    userId = generateId();
    await env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, salt, name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(userId, profile.email, '', '', profile.name, Date.now()).run();
  }

  await env.DB.prepare(
    'INSERT INTO oauth_accounts (provider, provider_user_id, user_id, created_at) VALUES (?, ?, ?, ?)',
  ).bind(provider, profile.providerUserId, userId, Date.now()).run();

  return userId;
}

export async function completeOAuth(
  request: Request,
  env: Env,
  provider: OAuthProvider,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return authErrorRedirect(request, 'Sign-in was cancelled.');
  }

  const savedState = readCookie(request, STATE_COOKIE);
  const savedProvider = readCookie(request, PROVIDER_COOKIE);

  if (!code || !state || !savedState || state !== savedState || savedProvider !== provider) {
    return authErrorRedirect(request, 'Sign-in session expired. Please try again.');
  }

  if (!providerConfigured(env, provider)) {
    return authErrorRedirect(request, 'This sign-in method is not configured.');
  }

  try {
    const profile = provider === 'google'
      ? await exchangeGoogleCode(request, env, code)
      : await exchangeGithubCode(request, env, code);

    const userId = await findOrCreateOAuthUser(env, provider, profile);
    const session = await createSession(env, userId);

    return redirect('/', [
      sessionCookie(session.token, session.expiresAt, request.url),
      clearCookie(STATE_COOKIE, request),
      clearCookie(PROVIDER_COOKIE, request),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
    return authErrorRedirect(request, message);
  }
}
