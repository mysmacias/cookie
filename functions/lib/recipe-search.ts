export interface WebRecipeSearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
}

export class RecipeSearchError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = 'RecipeSearchError';
  }
}

const RECIPE_SITE_HINTS = [
  'allrecipes.com',
  'seriouseats.com',
  'bonappetit.com',
  'bbcgoodfood.com',
  'foodnetwork.com',
  'tasty.co',
  'simplyrecipes.com',
  'cookieandkate.com',
  'kingarthurbaking.com',
  'nytimes.com',
  'epicurious.com',
  'delish.com',
  'loveandlemons.com',
  'budgetbytes.com',
  'recipetineats.com',
];

function looksLikeRecipeUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (RECIPE_SITE_HINTS.some(host => lower.includes(host))) return true;
  return /\/recipe|\/recipes|\/cooking\//i.test(lower);
}

function buildSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return 'popular dinner recipes';
  if (/\brecipe\b/i.test(trimmed)) return trimmed;
  return `${trimmed} recipe`;
}

export async function searchWebRecipes(
  apiKey: string,
  query: string,
  options?: { count?: number; offset?: number },
): Promise<WebRecipeSearchResult[]> {
  const count = Math.min(Math.max(options?.count ?? 10, 1), 20);
  const offset = Math.max(options?.offset ?? 0, 0);
  const q = buildSearchQuery(query);

  const params = new URLSearchParams({
    q,
    count: String(count),
    offset: String(offset),
    text_decorations: 'false',
    spellcheck: 'true',
  });

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new RecipeSearchError(
      text ? `Recipe search failed: ${text.slice(0, 120)}` : 'Recipe search failed.',
      response.status >= 400 && response.status < 600 ? response.status : 502,
    );
  }

  const data = (await response.json()) as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        thumbnail?: { src?: string };
      }>;
    };
  };

  const results = (data.web?.results ?? [])
    .filter(r => r.url && r.title)
    .map(r => ({
      title: r.title!.trim(),
      url: r.url!.trim(),
      description: (r.description ?? '').trim(),
      thumbnail: r.thumbnail?.src,
    }))
    .filter(r => looksLikeRecipeUrl(r.url));

  return results;
}
