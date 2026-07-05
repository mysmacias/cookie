import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { checkRateLimit } from '../../lib/rateLimit';
import { error, json } from '../../lib/response';

export interface CatalogPreview {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  difficulty: string;
  time: string;
  tags: string[];
  sourceUrl?: string;
  sourceDomain?: string;
  /** Display name of the user who published this recipe, for community rows */
  author?: string;
}

interface CatalogRow {
  id: string;
  data: string;
  source_url: string | null;
  source_domain: string | null;
  author: string | null;
}

// Escape LIKE wildcards in user input; we add our own % around the term.
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, ch => `\\${ch}`)}%`;
}

function toPreview(row: CatalogRow): CatalogPreview {
  const recipe = JSON.parse(row.data) as Record<string, unknown>;
  return {
    id: row.id,
    title: typeof recipe.title === 'string' ? recipe.title : '',
    description: typeof recipe.description === 'string' ? recipe.description : '',
    image: typeof recipe.image === 'string' ? recipe.image : '',
    category: typeof recipe.category === 'string' ? recipe.category : '',
    difficulty: typeof recipe.difficulty === 'string' ? recipe.difficulty : '',
    time: typeof recipe.time === 'string' ? recipe.time : '',
    tags: Array.isArray(recipe.tags) ? (recipe.tags as string[]).slice(0, 6) : [],
    ...(row.source_url ? { sourceUrl: row.source_url } : {}),
    ...(row.source_domain ? { sourceDomain: row.source_domain } : {}),
    ...(row.author ? { author: row.author } : {}),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `catalog-search:${userOrResponse.id}`, 60);
  if (!rate.ok) return error('Too many searches. Try again later.', 429, 'rate_limited');

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const page = Math.max(parseInt(url.searchParams.get('page') ?? '1', 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(url.searchParams.get('per_page') ?? '10', 10) || 10, 1), 20);
  const offset = (page - 1) * perPage;

  try {
    let rowsResult: D1Result<CatalogRow>;
    let countRow: { n: number } | null;
    if (query) {
      // Match the title, or fall back to the recipe JSON (tags, ingredients,
      // description). ~1k rows, so a scan is fine.
      const pattern = likePattern(query);
      [rowsResult, countRow] = await Promise.all([
        env.DB.prepare(
          `SELECT r.id, r.data, r.source_url, r.source_domain, u.name AS author
           FROM recipes r LEFT JOIN users u ON u.id = r.published_by
           WHERE r.title LIKE ?1 ESCAPE '\\' OR r.data LIKE ?1 ESCAPE '\\'
           ORDER BY (r.title LIKE ?1 ESCAPE '\\') DESC, r.title ASC
           LIMIT ?2 OFFSET ?3`,
        ).bind(pattern, perPage, offset).all<CatalogRow>(),
        env.DB.prepare(
          `SELECT COUNT(*) AS n FROM recipes
           WHERE title LIKE ?1 ESCAPE '\\' OR data LIKE ?1 ESCAPE '\\'`,
        ).bind(pattern).first<{ n: number }>(),
      ]);
    } else {
      [rowsResult, countRow] = await Promise.all([
        env.DB.prepare(
          `SELECT r.id, r.data, r.source_url, r.source_domain, u.name AS author
           FROM recipes r LEFT JOIN users u ON u.id = r.published_by
           ORDER BY r.title ASC LIMIT ?1 OFFSET ?2`,
        ).bind(perPage, offset).all<CatalogRow>(),
        env.DB.prepare('SELECT COUNT(*) AS n FROM recipes').first<{ n: number }>(),
      ]);
    }

    const total = countRow?.n ?? 0;
    return json({
      data: (rowsResult.results ?? []).map(toPreview),
      meta: {
        page,
        per_page: perPage,
        total,
        last_page: Math.max(Math.ceil(total / perPage), 1),
      },
    });
  } catch {
    return error('Catalog search failed.', 502);
  }
};
