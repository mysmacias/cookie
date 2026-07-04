import { Recipe } from '../types';
import { applyBundledRecipeMedia } from '../utils/applyBundledRecipeMedia';
import { normalizeRecipeTaxonomy } from '../utils/recipeTaxonomy';
import {
  getCachedBookmarks,
  getCachedUserRecipes,
} from './recipeApi';

// The library is the user's own collection only — recipes they created or
// imported (via Add or Discover). We intentionally no longer merge the bundled
// default library or the seeded sample recipes; new recipes are found through
// the Discover screen and saved into the user's library explicitly.
function getMergedRecipes(): Recipe[] {
  const imported = getCachedUserRecipes().map(r =>
    r.id.startsWith('api_') ? applyBundledRecipeMedia(r) : r,
  );
  const recipesById = new Map<string, Recipe>();
  for (const recipe of imported) {
    recipesById.set(recipe.id, recipe);
  }
  // Single place every recipe passes through: derive the cuisine facet and
  // mirror the primary cuisine onto `category` for display/sort.
  return [...recipesById.values()].map(normalizeRecipeTaxonomy);
}

/**
 * The published library — everything except in-progress drafts. This feeds the
 * main library, cooking, collections, meal-plan and graph flows, so drafts are
 * excluded everywhere by construction.
 */
export function getAllRecipes(): Recipe[] {
  return getMergedRecipes().filter(r => !r.draft);
}

/** In-progress drafts, newest first — surfaced in the Library's Drafts section. */
export function getDraftRecipes(): Recipe[] {
  return getMergedRecipes()
    .filter(r => r.draft)
    .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
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
