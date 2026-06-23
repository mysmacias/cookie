import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertUserRecipe } from '../../lib/db';
import { fetchRecipeById, RecipeApiError } from '../../lib/recipeapi';
import { mapRecipeApiToCookie } from '../../lib/recipeapi-mapper';
import { error, json } from '../../lib/response';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.RECIPE_API_KEY) {
    return error('Recipe API is not configured.', 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const externalId = (body as { externalId?: unknown }).externalId;
  if (typeof externalId !== 'number' || !Number.isInteger(externalId) || externalId <= 0) {
    return error('externalId must be a positive integer.');
  }

  try {
    const remote = await fetchRecipeById(env.RECIPE_API_KEY, externalId);
    const recipe = mapRecipeApiToCookie(remote);
    await upsertUserRecipe(env, userOrResponse.id, { ...recipe });
    return json({ recipe }, 201);
  } catch (e) {
    if (e instanceof RecipeApiError) {
      return error(e.message, e.status >= 400 && e.status < 600 ? e.status : 502);
    }
    return error('Failed to import recipe.', 502);
  }
};
