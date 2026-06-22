import type { Env } from '../lib/env';
import { generateId, requireUser } from '../lib/auth';
import { upsertUserRecipe } from '../lib/db';
import { error, json } from '../lib/response';

function isRecipeShape(v: unknown): v is Record<string, unknown> & { id: string } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.title === 'string' && Array.isArray(o.steps) && Array.isArray(o.ingredients);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  if (!isRecipeShape(body)) return error('Invalid recipe data.');

  const recipe = { ...body, id: `user_${generateId()}` };
  await upsertUserRecipe(env, userOrResponse.id, recipe);
  return json({ recipe }, 201);
};
