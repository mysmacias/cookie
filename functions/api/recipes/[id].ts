import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertOverride, upsertUserRecipe } from '../../lib/db';
import { error, json } from '../../lib/response';

function isRecipeShape(v: unknown): v is Record<string, unknown> & { id: string } {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.title === 'string' &&
    Array.isArray(o.steps) && Array.isArray(o.ingredients);
}

export const onRequestPut: PagesFunction<Env> = async ({ request, env, params }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const recipeId = params.id as string | undefined;
  if (!recipeId) return error('Recipe id required.');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  if (!isRecipeShape(body) || body.id !== recipeId) {
    return error('Invalid recipe data.');
  }

  if (recipeId.startsWith('user_')) {
    const existing = await env.DB.prepare(
      'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
    ).bind(userOrResponse.id, recipeId).first<{ data: string }>();
    const prior = existing ? JSON.parse(existing.data) as { addedAt?: number } : null;
    const recipe = {
      ...body,
      addedAt: typeof body.addedAt === 'number' ? body.addedAt : prior?.addedAt ?? Date.now(),
    };
    await upsertUserRecipe(env, userOrResponse.id, recipe);
    return json({ recipe });
  } else {
    await upsertOverride(env, userOrResponse.id, recipeId, body);
  }

  return json({ recipe: body });
};
