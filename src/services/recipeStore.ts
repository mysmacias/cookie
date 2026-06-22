import { Recipe } from '../types';
import { RECIPES } from '../data/bundledRecipes';
import { applyBundledRecipeMedia } from '../utils/applyBundledRecipeMedia';
import {
  getCachedBookmarks,
  getCachedOverrides,
  getCachedUserRecipes,
} from './recipeApi';

export function getAllRecipes(): Recipe[] {
  const overrides = getCachedOverrides();
  const bundled = RECIPES.map(r => applyBundledRecipeMedia(overrides[r.id] ?? r));
  return [...bundled, ...getCachedUserRecipes()];
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
