import type { Recipe } from '../types';
import { FOOD_IMAGE_URLS } from '../data/bundledMediaPools';

function stableHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick(pool: string[], seed: number, offset: number): string {
  const n = pool.length;
  if (n === 0) return '';
  return pool[(seed + offset) % n]!;
}

/**
 * Ensures bundled (non–user_) recipes have hero, ingredient, and step imagery.
 * Does not replace existing non-empty URLs (including user overrides).
 */
export function applyBundledRecipeMedia(recipe: Recipe): Recipe {
  if (recipe.id.startsWith('user_')) return recipe;

  const pool = FOOD_IMAGE_URLS;
  const h = stableHash(recipe.id);

  return {
    ...recipe,
    image: recipe.image?.trim() ? recipe.image : pick(pool, h, 0),
    ingredients: recipe.ingredients.map((ing, i) =>
      ing.image?.trim()
        ? ing
        : {
            ...ing,
            image: pick(pool, h, 3 + i * 17),
          },
    ),
    steps: recipe.steps.map((step, i) =>
      step.photo?.trim()
        ? step
        : {
            ...step,
            photo: pick(pool, h, 11 + i * 23),
          },
    ),
  };
}
