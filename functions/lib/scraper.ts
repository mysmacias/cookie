/** Schema.org Recipe as commonly embedded in JSON-LD. */
export interface SchemaRecipe {
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string } | Array<{ url?: string }>;
  recipeYield?: string | string[] | number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  recipeCategory?: string | string[];
  keywords?: string | string[];
  recipeIngredient?: string[];
  recipeInstructions?: unknown;
  author?: string | { name?: string } | Array<string | { name?: string }>;
}

export class ScrapeError extends Error {
  constructor(
    message: string,
    public status = 422,
  ) {
    super(message);
    this.name = 'ScrapeError';
  }
}

const FETCH_HEADERS = {
  'User-Agent': 'CookieRecipeBot/1.0 (+https://cookie.app; recipe import)',
  Accept: 'text/html,application/xhtml+xml',
};

export function isAllowedScrapeUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return false;
  if (host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(host)) return false;
  return true;
}

export function normalizeScrapeUrl(url: string): string {
  const parsed = new URL(url.trim());
  parsed.hash = '';
  return parsed.toString();
}

export async function urlToScrapeId(url: string): Promise<string> {
  const normalized = normalizeScrapeUrl(url);
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  return `scrape_${hex.slice(0, 16)}`;
}

export function extractJsonLdBlocks(html: string): unknown[] {
  const results: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      results.push(JSON.parse(raw));
    } catch {
      // Some sites wrap JSON-LD in HTML comments or use invalid trailing commas — skip.
    }
  }
  return results;
}

export function findSchemaRecipe(node: unknown): SchemaRecipe | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findSchemaRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  if (types.some(t => String(t).toLowerCase() === 'recipe')) {
    return obj as SchemaRecipe;
  }
  if (obj['@graph']) return findSchemaRecipe(obj['@graph']);
  return null;
}

export function parseIsoDurationMinutes(iso?: string): number {
  if (!iso || typeof iso !== 'string') return 0;
  const match = iso.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  const secs = parseInt(match[3] || '0', 10);
  return hours * 60 + mins + Math.ceil(secs / 60);
}

export function resolveSchemaImage(image: SchemaRecipe['image']): string {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (typeof image === 'number') return String(image);
  if (Array.isArray(image)) {
    for (const item of image) {
      const resolved = resolveSchemaImage(item as SchemaRecipe['image']);
      if (resolved) return resolved;
    }
    return '';
  }
  if (typeof image === 'object' && image.url) return image.url;
  return '';
}

export function parseIngredientString(raw: string): { name: string; amount: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { name: '', amount: '' };
  const match = trimmed.match(
    /^([\d./\u00BC-\u00BE\u2150-\u215E\s]+(?:\s*(?:cup|cups|c|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce|ounces|g|gram|grams|kg|ml|l|liter|litre|lb|lbs|pound|pounds|pinch|dash|clove|cloves|can|cans|package|packages|stick|sticks|slice|slices|piece|pieces|head|bunch|sprig|sprigs)?s?)?)\s+(.+)$/i,
  );
  if (match?.[2]) {
    return { amount: match[1].trim(), name: match[2].trim() };
  }
  return { amount: '', name: trimmed };
}

function extractInstructionText(item: unknown): string {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();
  if (typeof item !== 'object') return '';
  const obj = item as Record<string, unknown>;
  if (typeof obj.text === 'string') return obj.text.trim();
  if (typeof obj.name === 'string' && typeof obj.text !== 'string') return obj.name.trim();
  if (Array.isArray(obj.itemListElement)) {
    return obj.itemListElement.map(extractInstructionText).filter(Boolean).join('\n');
  }
  return '';
}

export function parseSchemaInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') {
    return instructions.split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(instructions)) {
    const steps: string[] = [];
    for (const item of instructions) {
      const text = extractInstructionText(item);
      if (text) steps.push(text);
    }
    return steps;
  }
  const single = extractInstructionText(instructions);
  return single ? [single] : [];
}

export async function fetchRecipePage(url: string): Promise<{ html: string; finalUrl: string }> {
  if (!isAllowedScrapeUrl(url)) {
    throw new ScrapeError('Invalid or disallowed URL.', 400);
  }

  const response = await fetch(normalizeScrapeUrl(url), {
    headers: FETCH_HEADERS,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new ScrapeError(`Could not fetch page (${response.status}).`, response.status >= 400 ? response.status : 502);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new ScrapeError('URL does not point to an HTML page.', 422);
  }

  const html = await response.text();
  if (!html.trim()) {
    throw new ScrapeError('Page was empty.', 422);
  }

  return { html, finalUrl: response.url || normalizeScrapeUrl(url) };
}

export function extractSchemaRecipeFromHtml(html: string): SchemaRecipe | null {
  const blocks = extractJsonLdBlocks(html);
  for (const block of blocks) {
    const recipe = findSchemaRecipe(block);
    if (recipe?.name) return recipe;
  }
  return null;
}

export async function scrapeRecipeFromUrl(url: string): Promise<{ schema: SchemaRecipe; finalUrl: string }> {
  const { html, finalUrl } = await fetchRecipePage(url);
  const schema = extractSchemaRecipeFromHtml(html);
  if (!schema?.name) {
    throw new ScrapeError(
      'No structured recipe found on this page. Try a page that publishes schema.org Recipe data.',
      422,
    );
  }
  return { schema, finalUrl };
}
