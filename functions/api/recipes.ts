import type { Env } from '../lib/env';
import { generateId, requireUser } from '../lib/auth';
import { upsertUserRecipe } from '../lib/db';
import { checkRateLimit, clientIp } from '../lib/rateLimit';
import { error, json } from '../lib/response';
import { parseRecipePayload } from '../lib/validation';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `recipes:${userOrResponse.id}`, 30);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const parsed = parseRecipePayload(body);
  if (!parsed) return error('Invalid recipe data.', 400, 'invalid_recipe');

  const recipe = { ...parsed, id: `user_${generateId()}` };
  await upsertUserRecipe(env, userOrResponse.id, recipe);
  return json({ recipe }, 201);
};
