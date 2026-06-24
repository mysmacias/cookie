import type { Recipe } from '../types';

/** Known cuisine / regional tags used for area matching */
const CUISINE_KEYWORDS = new Set([
  'mediterranean',
  'italian',
  'greek',
  'spanish',
  'french',
  'moroccan',
  'turkish',
  'lebanese',
  'middle eastern',
  'asian',
  'chinese',
  'japanese',
  'korean',
  'thai',
  'indian',
  'mexican',
  'american',
  'british',
  'german',
  'african',
  'caribbean',
  'latin',
  'southern',
  'cajun',
]);

/**
 * Maps individual cuisine tags to a broader region of origin. Each region has a
 * stable key, a human label, and a distinct hue used to color graph nodes.
 */
export interface RegionInfo {
  key: string;
  label: string;
  /** HSL hue (0–360) used to derive node fill/stroke colors. */
  hue: number;
}

const REGIONS: Record<string, RegionInfo> = {
  mediterranean: { key: 'mediterranean', label: 'Mediterranean', hue: 28 },
  'middle-eastern': { key: 'middle-eastern', label: 'Middle East & N. Africa', hue: 45 },
  'east-asian': { key: 'east-asian', label: 'East & SE Asia', hue: 0 },
  'south-asian': { key: 'south-asian', label: 'South Asian', hue: 16 },
  european: { key: 'european', label: 'European', hue: 210 },
  americas: { key: 'americas', label: 'Americas', hue: 145 },
  african: { key: 'african', label: 'African', hue: 95 },
  unknown: { key: 'unknown', label: 'Unspecified', hue: 220 },
};

/** Cuisine keyword → region key. Keep in sync with CUISINE_KEYWORDS. */
const CUISINE_TO_REGION: Record<string, string> = {
  mediterranean: 'mediterranean',
  italian: 'mediterranean',
  greek: 'mediterranean',
  spanish: 'mediterranean',
  french: 'european',
  moroccan: 'middle-eastern',
  turkish: 'middle-eastern',
  lebanese: 'middle-eastern',
  'middle eastern': 'middle-eastern',
  asian: 'east-asian',
  chinese: 'east-asian',
  japanese: 'east-asian',
  korean: 'east-asian',
  thai: 'east-asian',
  indian: 'south-asian',
  mexican: 'americas',
  american: 'americas',
  british: 'european',
  german: 'european',
  african: 'african',
  caribbean: 'americas',
  latin: 'americas',
  southern: 'americas',
  cajun: 'americas',
};

/** Determine the region of origin for a recipe from its cuisine tags. */
export function getRecipeRegion(recipe: Recipe): RegionInfo {
  for (const tag of cuisineSet(recipe)) {
    const regionKey = CUISINE_TO_REGION[tag];
    if (regionKey && REGIONS[regionKey]) return REGIONS[regionKey];
  }
  return REGIONS.unknown;
}

/** All regions present across the given recipes, for building a legend. */
export function getRegionLegend(recipes: Recipe[]): RegionInfo[] {
  const present = new Map<string, RegionInfo>();
  for (const recipe of recipes) {
    const region = getRecipeRegion(recipe);
    present.set(region.key, region);
  }
  // Stable order: known regions first (by REGIONS order), unknown last.
  const order = Object.keys(REGIONS);
  return [...present.values()].sort(
    (a, b) => order.indexOf(a.key) - order.indexOf(b.key),
  );
}

/**
 * Parse a free-form recipe time string ("1 hr 15 mins", "30m", "2 days",
 * "14+ hrs") into total minutes. Returns null when nothing parseable is found.
 */
export function parseRecipeTimeMinutes(time: string | undefined): number | null {
  if (!time) return null;
  const text = time.toLowerCase();
  let minutes = 0;
  let matched = false;

  const dayMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:days?|d)\b/);
  if (dayMatch) {
    minutes += parseFloat(dayMatch[1]) * 24 * 60;
    matched = true;
  }
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h)\b/);
  if (hourMatch) {
    minutes += parseFloat(hourMatch[1]) * 60;
    matched = true;
  }
  const minMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:mins?|minutes?|m)\b/);
  if (minMatch) {
    minutes += parseFloat(minMatch[1]);
    matched = true;
  }

  if (!matched) {
    const bare = text.match(/(\d+(?:\.\d+)?)/);
    if (bare) {
      minutes = parseFloat(bare[1]);
      matched = true;
    }
  }

  return matched ? Math.round(minutes) : null;
}

const SCORE_WEIGHTS = {
  ingredients: 0.45,
  tags: 0.3,
  category: 0.15,
  cuisine: 0.1,
} as const;

export interface SimilarityBreakdown {
  score: number;
  ingredientJaccard: number;
  tagJaccard: number;
  sameCategory: boolean;
  cuisineMatch: boolean;
  sharedIngredients: string[];
  sharedTags: string[];
}

export interface GraphNode {
  id: string;
  recipe: Recipe;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  breakdown: SimilarityBreakdown;
}

export interface RecipeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildGraphOptions {
  /** Minimum similarity score (0–1) to include an edge. Default 0.25 */
  threshold?: number;
  /** Only include recipes in this category (case-insensitive). */
  categoryFilter?: string | null;
  /** Cap edges per node to keep the graph readable. Default 6 */
  maxEdgesPerNode?: number;
}

export interface SimilarRecipeResult {
  recipe: Recipe;
  breakdown: SimilarityBreakdown;
}

/** Normalize ingredient names for overlap comparison (aligned with shoppingList). */
export function normalizeIngredientName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()[\]]/g, '')
    .replace(/^(fresh|dried|chopped|minced|sliced|ground)\s+/i, '');
}

function ingredientSet(recipe: Recipe): Set<string> {
  return new Set(recipe.ingredients.map(i => normalizeIngredientName(i.name)).filter(Boolean));
}

function tagSet(recipe: Recipe): Set<string> {
  const tags = (recipe.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean);
  return new Set(tags);
}

function cuisineSet(recipe: Recipe): Set<string> {
  const tags = tagSet(recipe);
  const matches = [...tags].filter(t => CUISINE_KEYWORDS.has(t));
  return new Set(matches);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function sharedItems(a: Set<string>, b: Set<string>): string[] {
  const shared: string[] = [];
  for (const item of a) {
    if (b.has(item)) shared.push(item);
  }
  return shared.sort((x, y) => x.localeCompare(y));
}

function categoriesMatch(a: Recipe, b: Recipe): boolean {
  return a.category.trim().toLowerCase() === b.category.trim().toLowerCase();
}

function cuisinesMatch(a: Recipe, b: Recipe): boolean {
  const ca = cuisineSet(a);
  const cb = cuisineSet(b);
  if (ca.size === 0 || cb.size === 0) return false;
  return jaccard(ca, cb) > 0;
}

/** Score how similar two recipes are (0–1). */
export function computeSimilarity(a: Recipe, b: Recipe): SimilarityBreakdown {
  if (a.id === b.id) {
    return {
      score: 1,
      ingredientJaccard: 1,
      tagJaccard: 1,
      sameCategory: true,
      cuisineMatch: true,
      sharedIngredients: a.ingredients.map(i => normalizeIngredientName(i.name)),
      sharedTags: [...tagSet(a)],
    };
  }

  const ingA = ingredientSet(a);
  const ingB = ingredientSet(b);
  const tagA = tagSet(a);
  const tagB = tagSet(b);

  const ingredientJaccard = jaccard(ingA, ingB);
  const tagJaccard = jaccard(tagA, tagB);
  const sameCategory = categoriesMatch(a, b);
  const cuisineMatch = cuisinesMatch(a, b);

  const score =
    ingredientJaccard * SCORE_WEIGHTS.ingredients +
    tagJaccard * SCORE_WEIGHTS.tags +
    (sameCategory ? SCORE_WEIGHTS.category : 0) +
    (cuisineMatch ? SCORE_WEIGHTS.cuisine : 0);

  return {
    score,
    ingredientJaccard,
    tagJaccard,
    sameCategory,
    cuisineMatch,
    sharedIngredients: sharedItems(ingA, ingB),
    sharedTags: sharedItems(tagA, tagB),
  };
}

function filterRecipes(recipes: Recipe[], categoryFilter?: string | null): Recipe[] {
  if (!categoryFilter) return recipes;
  const needle = categoryFilter.trim().toLowerCase();
  return recipes.filter(r => r.category.trim().toLowerCase() === needle);
}

/** Build an undirected similarity graph from a recipe list. */
export function buildRecipeGraph(recipes: Recipe[], options: BuildGraphOptions = {}): RecipeGraph {
  const {
    threshold = 0.25,
    categoryFilter = null,
    maxEdgesPerNode = 6,
  } = options;

  const filtered = filterRecipes(recipes, categoryFilter);
  const nodes: GraphNode[] = filtered.map(recipe => ({ id: recipe.id, recipe }));

  const candidateEdges: GraphEdge[] = [];
  for (let i = 0; i < filtered.length; i++) {
    for (let j = i + 1; j < filtered.length; j++) {
      const breakdown = computeSimilarity(filtered[i], filtered[j]);
      if (breakdown.score >= threshold) {
        candidateEdges.push({
          source: filtered[i].id,
          target: filtered[j].id,
          weight: breakdown.score,
          breakdown,
        });
      }
    }
  }

  candidateEdges.sort((a, b) => b.weight - a.weight);

  const edgeCount = new Map<string, number>();
  const edges: GraphEdge[] = [];

  for (const edge of candidateEdges) {
    const sourceCount = edgeCount.get(edge.source) ?? 0;
    const targetCount = edgeCount.get(edge.target) ?? 0;
    if (sourceCount >= maxEdgesPerNode || targetCount >= maxEdgesPerNode) continue;
    edges.push(edge);
    edgeCount.set(edge.source, sourceCount + 1);
    edgeCount.set(edge.target, targetCount + 1);
  }

  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  // Keep isolated recipes visible when the library is small
  const prunedNodes =
    filtered.length <= 12
      ? nodes
      : nodes.filter(n => connectedIds.has(n.id));

  return { nodes: prunedNodes, edges };
}

/** Return the most similar recipes to a given id. */
export function getSimilarRecipes(
  recipeId: string,
  recipes: Recipe[],
  limit = 8,
): SimilarRecipeResult[] {
  const source = recipes.find(r => r.id === recipeId);
  if (!source) return [];

  return recipes
    .filter(r => r.id !== recipeId)
    .map(recipe => ({ recipe, breakdown: computeSimilarity(source, recipe) }))
    .filter(({ breakdown }) => breakdown.score > 0)
    .sort((a, b) => b.breakdown.score - a.breakdown.score)
    .slice(0, limit);
}

/** Extract unique categories from recipes for filter chips. */
export function getRecipeCategories(recipes: Recipe[]): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const recipe of recipes) {
    const cat = recipe.category.trim();
    const key = cat.toLowerCase();
    if (!cat || seen.has(key)) continue;
    seen.add(key);
    categories.push(cat);
  }
  return categories.sort((a, b) => a.localeCompare(b));
}
