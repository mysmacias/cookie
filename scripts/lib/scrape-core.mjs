/**
 * Shared recipe-scraping core used by the default-recipe generator and the
 * bulk database crawler. Mirrors functions/lib/scraper.ts + scrape-mapper.ts
 * so bundled data and the runtime "import from URL" feature stay consistent.
 */

export const FETCH_HEADERS = {
  'User-Agent': 'CookieRecipeBot/1.0 (+https://cookie.app; recipe import)',
  Accept: 'text/html,application/xhtml+xml',
};

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// schema.org/Recipe JSON-LD extraction
// ---------------------------------------------------------------------------
export function extractJsonLdBlocks(html) {
  const results = [];
  // Allow unquoted attribute values (e.g. Yoast emits `type=application/ld+json class=...`).
  const re = /<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!raw) continue;
    try {
      results.push(JSON.parse(raw));
    } catch {
      // Invalid trailing commas / HTML-wrapped JSON — skip.
    }
  }
  return results;
}

export function collectSchemaRecipes(node, acc = []) {
  if (!node) return acc;
  if (Array.isArray(node)) {
    for (const item of node) collectSchemaRecipes(item, acc);
    return acc;
  }
  if (typeof node !== 'object') return acc;
  const type = node['@type'];
  const types = Array.isArray(type) ? type : type ? [type] : [];
  if (types.some(t => String(t).toLowerCase() === 'recipe')) acc.push(node);
  if (node['@graph']) collectSchemaRecipes(node['@graph'], acc);
  return acc;
}

function schemaRecipeScore(recipe) {
  const ingredients = Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient.length : 0;
  const instructions = Array.isArray(recipe.recipeInstructions)
    ? recipe.recipeInstructions.length
    : typeof recipe.recipeInstructions === 'string'
      ? 1
      : 0;
  return ingredients + instructions;
}

// A page can embed several recipes (roundups, related posts). Pick the one
// with the most real content — that's the page's primary recipe.
export function extractSchemaRecipeFromHtml(html) {
  const recipes = [];
  for (const block of extractJsonLdBlocks(html)) collectSchemaRecipes(block, recipes);
  const named = recipes.filter(r => r.name);
  if (named.length === 0) return null;
  return named.reduce((best, r) => (schemaRecipeScore(r) > schemaRecipeScore(best) ? r : best));
}

// ---------------------------------------------------------------------------
// Field parsing
// ---------------------------------------------------------------------------
export function parseIsoDurationMinutes(iso) {
  if (!iso || typeof iso !== 'string') return 0;
  const match = iso.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  const secs = parseInt(match[3] || '0', 10);
  return hours * 60 + mins + Math.ceil(secs / 60);
}

export function resolveSchemaImage(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  if (typeof image === 'number') return String(image);
  if (Array.isArray(image)) {
    for (const item of image) {
      const resolved = resolveSchemaImage(item);
      if (resolved) return resolved;
    }
    return '';
  }
  if (typeof image === 'object' && image.url) return image.url;
  return '';
}

export function parseIngredientString(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) return { name: '', amount: '' };
  const match = trimmed.match(
    /^([\d./¼-¾⅐-⅞\s]+(?:\s*(?:cup|cups|c|tbsp|tablespoons?|tsp|teaspoons?|oz|ounce|ounces|g|gram|grams|kg|ml|l|liter|litre|lb|lbs|pound|pounds|pinch|dash|clove|cloves|can|cans|package|packages|stick|sticks|slice|slices|piece|pieces|head|bunch|sprig|sprigs)?s?)?)\s+(.+)$/i,
  );
  if (match?.[2]) return { amount: match[1].trim(), name: match[2].trim() };
  return { amount: '', name: trimmed };
}

function extractInstructionText(item) {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();
  if (typeof item !== 'object') return '';
  if (typeof item.text === 'string') return item.text.trim();
  if (typeof item.name === 'string' && typeof item.text !== 'string') return item.name.trim();
  if (Array.isArray(item.itemListElement)) {
    return item.itemListElement.map(extractInstructionText).filter(Boolean).join('\n');
  }
  return '';
}

export function parseSchemaInstructions(instructions) {
  if (!instructions) return [];
  if (typeof instructions === 'string') {
    return decodeHtml(instructions).split(/\n+/).map(s => s.trim()).filter(Boolean);
  }
  if (Array.isArray(instructions)) {
    const steps = [];
    for (const item of instructions) {
      const text = extractInstructionText(item);
      if (text) steps.push(decodeHtml(text));
    }
    return steps;
  }
  const single = extractInstructionText(instructions);
  return single ? [decodeHtml(single)] : [];
}

// ---------------------------------------------------------------------------
// Text cleanup
// ---------------------------------------------------------------------------
export function decodeHtml(input) {
  return String(input ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&#x2F;|&#47;/gi, '/')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&frac12;/g, '½')
    .replace(/&frac14;/g, '¼')
    .replace(/&frac34;/g, '¾')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function shortenDescription(text) {
  const clean = decodeHtml(text)
    .replace(/^(recipe\s+video\s+above\.?|new!?|video\s+below\.?)\s*/i, '')
    .trim();
  if (clean.length <= 240) return clean;
  const slice = clean.slice(0, 240);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastStop > 80) return slice.slice(0, lastStop + 1);
  return slice.replace(/\s+\S*$/, '') + '…';
}

// ---------------------------------------------------------------------------
// Mapping to the Cookie Recipe shape
// ---------------------------------------------------------------------------
function formatMinutes(mins) {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
}

function estimateDifficulty(ingredientCount, stepCount) {
  const score = ingredientCount + stepCount * 2;
  if (score <= 12) return 'Easy';
  if (score <= 22) return 'Medium';
  if (score <= 35) return 'Advanced';
  return 'Expert';
}

function formatYield(recipeYield) {
  if (recipeYield == null) return undefined;
  if (typeof recipeYield === 'number') return `${recipeYield} servings`;
  if (Array.isArray(recipeYield)) {
    const first = recipeYield.map(v => decodeHtml(String(v))).find(Boolean);
    return first || undefined;
  }
  return decodeHtml(String(recipeYield)) || undefined;
}

function formatCategory(recipeCategory) {
  const raw = Array.isArray(recipeCategory) ? recipeCategory[0] : recipeCategory;
  if (!raw || typeof raw !== 'string') return 'Imported';
  return decodeHtml(raw) || 'Imported';
}

function buildTags(schema, sourceUrl) {
  const tags = new Set();
  const keywords = schema.keywords;
  if (typeof keywords === 'string') {
    keywords.split(/[,;]+/).forEach(k => {
      const t = decodeHtml(k).toLowerCase();
      if (t) tags.add(t);
    });
  } else if (Array.isArray(keywords)) {
    keywords.forEach(k => {
      if (typeof k === 'string' && k.trim()) tags.add(decodeHtml(k).toLowerCase());
    });
  }
  const cat = Array.isArray(schema.recipeCategory) ? schema.recipeCategory[0] : schema.recipeCategory;
  if (typeof cat === 'string' && cat.trim()) tags.add(decodeHtml(cat).toLowerCase());
  const cuisine = Array.isArray(schema.recipeCuisine) ? schema.recipeCuisine[0] : schema.recipeCuisine;
  if (typeof cuisine === 'string' && cuisine.trim()) tags.add(decodeHtml(cuisine).toLowerCase());
  try {
    tags.add(new URL(sourceUrl).hostname.replace(/^www\./, ''));
  } catch {
    // ignore
  }
  return [...tags].slice(0, 12);
}

export function mapSchemaToCookieRecipe(schema, sourceUrl) {
  const rawIngredients = Array.isArray(schema.recipeIngredient) ? schema.recipeIngredient : [];
  const ingredients = rawIngredients
    .filter(s => typeof s === 'string' && s.trim().length > 0)
    .map(decodeHtml)
    .map(parseIngredientString)
    .filter(i => i.name);

  const steps = parseSchemaInstructions(schema.recipeInstructions).map((description, i) => ({
    title: `Step ${i + 1}`,
    description,
  }));

  const prepMins = parseIsoDurationMinutes(schema.prepTime);
  const cookMins = parseIsoDurationMinutes(schema.cookTime);
  const totalMins = parseIsoDurationMinutes(schema.totalTime) || prepMins + cookMins;

  const title = decodeHtml(schema.name ?? '');
  const description =
    shortenDescription(typeof schema.description === 'string' ? schema.description : '') ||
    `Imported from ${new URL(sourceUrl).hostname.replace(/^www\./, '')}.`;

  return {
    title,
    description,
    image: resolveSchemaImage(schema.image),
    difficulty: estimateDifficulty(ingredients.length, steps.length),
    time: formatMinutes(totalMins) || '—',
    prepTime: formatMinutes(prepMins) || '—',
    bakeTime: cookMins > 0 ? formatMinutes(cookMins) : undefined,
    yields: formatYield(schema.recipeYield),
    category: formatCategory(schema.recipeCategory),
    tags: buildTags(schema, sourceUrl),
    ingredients,
    steps,
    sourceUrl,
  };
}

/**
 * Fetch a page and return a mapped recipe, or throw with a reason.
 * Enforces a minimum-content quality gate to reject roundup/incomplete pages.
 */
export async function scrapeRecipe(url, { minIngredients = 3, minSteps = 2 } = {}) {
  const res = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (!/text\/html|application\/xhtml/i.test(contentType)) throw new Error('not HTML');
  const html = await res.text();
  const schema = extractSchemaRecipeFromHtml(html);
  if (!schema?.name) throw new Error('No schema.org Recipe found');
  const recipe = mapSchemaToCookieRecipe(schema, res.url || url);
  if (recipe.ingredients.length < minIngredients || recipe.steps.length < minSteps) {
    throw new Error(`incomplete (${recipe.ingredients.length} ing, ${recipe.steps.length} steps)`);
  }
  return recipe;
}

// ---------------------------------------------------------------------------
// Sitemap crawling
// ---------------------------------------------------------------------------
export function extractSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1]);
  return locs;
}

export async function fetchSitemapUrls(sitemapUrl) {
  const res = await fetch(sitemapUrl, { headers: FETCH_HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  return extractSitemapLocs(await res.text());
}
