import type { Env } from '../../lib/env';
import {
  createSalt,
  createSession,
  generateId,
  hashPassword,
  isValidEmail,
  isValidPassword,
  sessionCookie,
} from '../../lib/auth';
import { error, json } from '../../lib/response';

interface SignupBody {
  email?: string;
  password?: string;
  name?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: SignupBody;
  try {
    body = await request.json() as SignupBody;
  } catch {
    return error('Invalid request body.');
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const name = body.name?.trim() ?? '';

  if (!isValidEmail(email)) return error('Please enter a valid email address.');
  if (!isValidPassword(password)) return error('Password must be at least 8 characters.');

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) return error('An account with this email already exists.', 409);

  const userId = generateId();
  const salt = createSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = Date.now();

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, salt, name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(userId, email, passwordHash, salt, name, now).run();

  const session = await createSession(env, userId);

  return json(
    { user: { id: userId, email, name } },
    201,
    { 'Set-Cookie': sessionCookie(session.token, session.expiresAt, request.url) },
  );
};
