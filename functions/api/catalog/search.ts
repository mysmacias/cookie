import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

// Preview shape sent to the Discover screen — a trimmed-down catalog recipe.
export interface CatalogPreview {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  time: string;
  sourceUrl: string;
  sourceDomain: string;
}

interface CatalogRow {
  id: string;
  data: string;
  source_url: string | null;
  source_domain: string | null;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `catalog:${userOrResponse.id}`, 60);
  if (!rate.ok) return error('Too many requests. Try again later.', 429, 'rate_limited');

  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(url.searchParams.get('per_page') ?? '12', 10) || 12, 1), 24);
  const offset = (page - 1) * perPage;

  // Title match first; fall back to a substring match over the recipe JSON so
  // queries like "chicken" or "korean" also hit tags/ingredients/category.
  const where = q ? 'WHERE title LIKE ?1 OR data LIKE ?1' : '';
  const like = `%${q}%`;

  const countStmt = env.DB.prepare(`SELECT COUNT(*) AS n FROM recipes ${where}`);
  const rowsStmt = env.DB.prepare(
    `SELECT id, data, source_url, source_domain FROM recipes ${where}
     ORDER BY created_at DESC, id LIMIT ?${q ? 2 : 1} OFFSET ?${q ? 3 : 2}`,
  );

  const [countRes, rowsRes] = await Promise.all([
    (q ? countStmt.bind(like) : countStmt).first<{ n: number }>(),
    (q ? rowsStmt.bind(like, perPage, offset) : rowsStmt.bind(perPage, offset)).all<CatalogRow>(),
  ]);

  const total = countRes?.n ?? 0;
  const data: CatalogPreview[] = (rowsRes.results ?? []).map(row => {
    const recipe = JSON.parse(row.data) as Record<string, unknown>;
    return {
      id: row.id,
      title: String(recipe.title ?? ''),
      description: String(recipe.description ?? ''),
      image: String(recipe.image ?? ''),
      category: String(recipe.category ?? ''),
      time: String(recipe.time ?? ''),
      sourceUrl: row.source_url ?? '',
      sourceDomain: row.source_domain ?? '',
    };
  });

  return json({
    data,
    meta: {
      current_page: page,
      last_page: Math.max(Math.ceil(total / perPage), 1),
      per_page: perPage,
      total,
    },
  });
};
