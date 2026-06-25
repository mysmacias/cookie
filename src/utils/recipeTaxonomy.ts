import type { Recipe } from '../types';

/**
 * Canonical cuisine vocabulary — the single "where it's from" facet.
 * Recipes may carry one or more of these (fusion dishes list several), or none
 * when there's no cuisine signal at all.
 */
export const CUISINES = [
  'American', 'Brazilian', 'Caribbean', 'Chinese', 'French', 'Greek',
  'Indian', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Levantine',
  'Mexican', 'Moroccan', 'Peruvian', 'Polish', 'Portuguese', 'Spanish',
  'Thai', 'Turkish', 'Vietnamese',
] as const;

const CUISINE_SET = new Set<string>(CUISINES);

/**
 * Old single-axis category -> cuisine(s). Covers renames (Sichuan -> Chinese)
 * and themed buckets that resolve to a real cuisine (Curry Night -> Indian).
 * Categories not listed here either already are a cuisine (kept as-is) or carry
 * no cuisine in the name — cuisine is then recovered from tags, or left empty.
 */
const CATEGORY_TO_CUISINES: Record<string, string[]> = {
  Sichuan: ['Chinese'],
  Levant: ['Levantine'],
  'North African': ['Moroccan'],
  Tapas: ['Spanish'],
  'Curry Night': ['Indian'],
  'Street Food': ['Mexican'],
  'Coastal Latin': ['Mexican', 'Peruvian'],
};

/**
 * Tags whose presence implies a cuisine. Mainly recovers cuisine for the
 * MealDB/recipeapi seeds, whose `category` is a protein or course but whose
 * cuisine rides along in the tags (e.g. category "Chicken", tags [..., "greek"]).
 */
const TAG_TO_CUISINE: Record<string, string> = {
  greek: 'Greek', italian: 'Italian', spanish: 'Spanish', mexican: 'Mexican',
  indian: 'Indian', portuguese: 'Portuguese', french: 'French', thai: 'Thai',
  japanese: 'Japanese', korean: 'Korean', vietnamese: 'Vietnamese',
  chinese: 'Chinese', turkish: 'Turkish', moroccan: 'Moroccan',
  brazilian: 'Brazilian', caribbean: 'Caribbean', indonesian: 'Indonesian',
  polish: 'Polish', peruvian: 'Peruvian', american: 'American',
};

function dedupe(xs: string[]): string[] {
  return [...new Set(xs)];
}

/**
 * Resolve a recipe's cuisines. Precedence:
 *   1. explicit recipe.cuisines (a user/author already decided)
 *   2. category that is itself a cuisine
 *   3. category that maps to one or more cuisines
 *   4. cuisine-bearing tags
 * Returns [] when there is no signal (e.g. "Heirloom Recipe" cookies) — by
 * design, since many cultures make cookies; such recipes stay findable via tags.
 */
export function deriveCuisines(
  recipe: Pick<Recipe, 'cuisines' | 'category' | 'tags'>,
): string[] {
  if (recipe.cuisines && recipe.cuisines.length > 0) {
    return dedupe(recipe.cuisines.map(c => c.trim()).filter(Boolean));
  }
  const out: string[] = [];
  const cat = (recipe.category ?? '').trim();
  if (CUISINE_SET.has(cat)) out.push(cat);
  for (const c of CATEGORY_TO_CUISINES[cat] ?? []) out.push(c);
  for (const t of recipe.tags ?? []) {
    const c = TAG_TO_CUISINE[t.trim().toLowerCase()];
    if (c) out.push(c);
  }
  return dedupe(out);
}

/**
 * Normalize a recipe onto the faceted taxonomy:
 *  - populate `cuisines` (multi-valued)
 *  - set `category` to the primary cuisine for display / sort / back-compat
 *  - demote a non-cuisine category to a tag so nothing becomes unsearchable
 * Recipes with no cuisine signal keep their existing category/tags and get an
 * empty `cuisines` array. Idempotent.
 */
export function normalizeRecipeTaxonomy(recipe: Recipe): Recipe {
  const cuisines = deriveCuisines(recipe);

  if (cuisines.length === 0) {
    if (recipe.cuisines && recipe.cuisines.length === 0) return recipe;
    return { ...recipe, cuisines: [] };
  }

  const primary = cuisines[0];
  const oldCat = (recipe.category ?? '').trim();
  let tags = recipe.tags ?? [];

  if (oldCat && oldCat !== primary && !CUISINE_SET.has(oldCat)) {
    const lower = oldCat.toLowerCase();
    if (!tags.some(t => t.trim().toLowerCase() === lower)) {
      tags = [...tags, lower];
    }
  }

  return { ...recipe, cuisines, category: primary, tags };
}
