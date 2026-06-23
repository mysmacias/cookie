import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertOverride, upsertUserRecipe } from '../../lib/db';
import { error, json } from '../../lib/response';
import { parseRecipePayload } from '../../lib/validation';

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

  const parsed = parseRecipePayload(body);
  if (!parsed || parsed.id !== recipeId) {
    return error('Invalid recipe data.', 400, 'invalid_recipe');
  }

  const recipe = { ...parsed, id: recipeId };

  if (recipeId.startsWith('user_') || recipeId.startsWith('api_')) {
    await upsertUserRecipe(env, userOrResponse.id, recipe);
  } else {
    await upsertOverride(env, userOrResponse.id, recipeId, recipe);
  }

  return json({ recipe });
};
