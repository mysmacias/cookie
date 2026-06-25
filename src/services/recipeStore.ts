import { Recipe } from '../types';
import { RECIPES } from '../data/bundledRecipes';
import { MEALDB_SEED_RECIPES } from '../data/mealDbSeeds';
import { RECIPE_API_SEED_RECIPES } from '../data/recipeApiSeeds';
import { applyBundledRecipeMedia } from '../utils/applyBundledRecipeMedia';
import { normalizeRecipeTaxonomy } from '../utils/recipeTaxonomy';
import {
  getCachedBookmarks,
  getCachedOverrides,
  getCachedUserRecipes,
} from './recipeApi';

export function getAllRecipes(): Recipe[] {
  const overrides = getCachedOverrides();
  const bundled = RECIPES.map(r => applyBundledRecipeMedia(overrides[r.id] ?? r));
  const seeded = [...RECIPE_API_SEED_RECIPES, ...MEALDB_SEED_RECIPES]
    .map(r => applyBundledRecipeMedia(overrides[r.id] ?? r));
  const imported = getCachedUserRecipes().map(r =>
    r.id.startsWith('api_') ? applyBundledRecipeMedia(r) : r,
  );
  const recipesById = new Map<string, Recipe>();
  for (const recipe of [...bundled, ...seeded, ...imported]) {
    recipesById.set(recipe.id, recipe);
  }
  // Single place every recipe passes through: derive the cuisine facet and
  // mirror the primary cuisine onto `category` for display/sort.
  return [...recipesById.values()].map(normalizeRecipeTaxonomy);
}

export function isBookmarked(recipeId: string): boolean {
  return getCachedBookmarks().includes(recipeId);
}

export function getBookmarkedIds(): string[] {
  return getCachedBookmarks();
}

export function getUserRecipes(): Recipe[] {
  return getCachedUserRecipes();
}
