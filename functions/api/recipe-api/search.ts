import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { RecipeApiError, searchRecipes } from '../../lib/recipeapi';
import { error, json } from '../../lib/response';

const ALLOWED_PARAMS = new Set([
  'search',
  'page',
  'per_page',
  'cuisine',
  'meal_type',
  'difficulty',
  'dietary_tags',
  'ingredients',
  'max_prep_time',
  'max_cook_time',
  'max_calories',
]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.RECIPE_API_KEY) {
    return error('Recipe API is not configured.', 503);
  }

  const url = new URL(request.url);
  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key) && value) params[key] = value;
  }

  if (!params.page) params.page = '1';
  if (!params.per_page) params.per_page = '10';

  try {
    const result = await searchRecipes(env.RECIPE_API_KEY, params);
    return json(result);
  } catch (e) {
    if (e instanceof RecipeApiError) {
      return error(e.message, e.status >= 400 && e.status < 600 ? e.status : 502);
    }
    return error('Failed to search recipes.', 502);
  }
};
