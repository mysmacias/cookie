import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { searchWebRecipes, RecipeSearchError } from '../../lib/recipe-search';
import { error, json } from '../../lib/response';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  if (!env.BRAVE_SEARCH_API_KEY) {
    return error('Web recipe search is not configured.', 503);
  }

  const rate = await checkRateLimit(env, `scrape-search:${userOrResponse.id}`, 30);
  if (!rate.ok) return error('Too many searches. Try again later.', 429, 'rate_limited');

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(url.searchParams.get('per_page') ?? '10', 10) || 10, 1), 20);
  const offset = (page - 1) * perPage;

  try {
    const results = await searchWebRecipes(env.BRAVE_SEARCH_API_KEY, query, {
      count: perPage,
      offset,
    });
    return json({
      data: results,
      meta: {
        page,
        per_page: perPage,
        has_more: results.length === perPage,
      },
    });
  } catch (e) {
    if (e instanceof RecipeSearchError) {
      return error(e.message, e.status >= 400 && e.status < 600 ? e.status : 502);
    }
    return error('Recipe search failed.', 502);
  }
};
