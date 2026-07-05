import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

// Serves a random sample of catalog recipes with just the fields the recipe
// graph needs (similarity runs on ingredients/tags/category client-side).
// Sampled and slimmed because the full catalog (~3300 rows, ~8.6MB) is both
// too heavy to ship and too dense to render as a legible force graph.
const DEFAULT_LIMIT = 300;
const MAX_LIMIT = 500;

interface CatalogRow {
  id: string;
  data: string;
  source_url: string | null;
}

function toGraphRecipe(row: CatalogRow): Record<string, unknown> {
  const recipe = JSON.parse(row.data) as Record<string, unknown>;
  return {
    id: row.id,
    title: typeof recipe.title === 'string' ? recipe.title : '',
    description: typeof recipe.description === 'string' ? recipe.description.slice(0, 200) : '',
    image: typeof recipe.image === 'string' ? recipe.image : '',
    difficulty: typeof recipe.difficulty === 'string' ? recipe.difficulty : 'Medium',
    time: typeof recipe.time === 'string' ? recipe.time : '',
    prepTime: typeof recipe.prepTime === 'string' ? recipe.prepTime : '',
    category: typeof recipe.category === 'string' ? recipe.category : '',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    ingredients: Array.isArray(recipe.ingredients)
      ? (recipe.ingredients as { name?: unknown }[])
          .filter(i => typeof i?.name === 'string')
          .map(i => ({ name: i.name, amount: '' }))
      : [],
    steps: [],
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `catalog-graph:${userOrResponse.id}`, 30);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 25),
    MAX_LIMIT,
  );

  try {
    const rows = await env.DB.prepare(
      'SELECT id, data, source_url FROM recipes ORDER BY RANDOM() LIMIT ?1',
    ).bind(limit).all<CatalogRow>();

    return json({ data: (rows.results ?? []).map(toGraphRecipe) });
  } catch {
    return error('Failed to load catalog recipes.', 502);
  }
};
