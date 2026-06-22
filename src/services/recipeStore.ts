import { Recipe } from '../types';
import { RECIPES } from '../data/bundledRecipes';
import { applyBundledRecipeMedia } from '../utils/applyBundledRecipeMedia';

const USER_RECIPES_KEY = 'cookie_user_recipes';
const BOOKMARKS_KEY = 'cookie_bookmarks';
const OVERRIDES_KEY = 'cookie_recipe_overrides';

function loadUserRecipes(): Recipe[] {
  try {
    const raw = localStorage.getItem(USER_RECIPES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUserRecipes(recipes: Recipe[]): void {
  try {
    const json = JSON.stringify(recipes);
    localStorage.setItem(USER_RECIPES_KEY, json);
  } catch (e) {
    console.warn('saveUserRecipes failed:', e);
  }
}

function isRecipeShape(v: unknown): v is Recipe {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.title === 'string' &&
    Array.isArray(o.steps) && Array.isArray(o.ingredients);
}

function loadOverrides(): Record<string, Recipe> {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, Recipe> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (isRecipeShape(v)) result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function saveOverrides(map: Record<string, Recipe>): void {
  try {
    const json = JSON.stringify(map);
    localStorage.setItem(OVERRIDES_KEY, json);
  } catch (e) {
    console.warn('saveOverrides failed:', e);
  }
}

function loadBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBookmarks(ids: string[]): void {
  try {
    const json = JSON.stringify(ids);
    localStorage.setItem(BOOKMARKS_KEY, json);
  } catch (e) {
    console.warn('saveBookmarks failed:', e);
  }
}

export function getAllRecipes(): Recipe[] {
  const overrides = loadOverrides();
  const bundled = RECIPES.map(r => applyBundledRecipeMedia(overrides[r.id] ?? r));
  return [...bundled, ...loadUserRecipes()];
}

export function addRecipe(recipe: Omit<Recipe, 'id'>): Recipe {
  const complete: Recipe = { ...recipe, id: `user_${Date.now()}` };
  const current = loadUserRecipes();
  current.push(complete);
  saveUserRecipes(current);
  return complete;
}

export function updateRecipe(recipe: Recipe): void {
  if (recipe.id.startsWith('user_')) {
    const list = loadUserRecipes();
    const i = list.findIndex(r => r.id === recipe.id);
    if (i !== -1) {
      list[i] = recipe;
      saveUserRecipes(list);
    }
    return;
  }
  const overrides = loadOverrides();
  overrides[recipe.id] = recipe;
  saveOverrides(overrides);
}

export function getUserRecipes(): Recipe[] {
  return loadUserRecipes();
}

export function isBookmarked(recipeId: string): boolean {
  return loadBookmarks().includes(recipeId);
}

export function toggleBookmark(recipeId: string): boolean {
  const ids = loadBookmarks();
  const index = ids.indexOf(recipeId);
  if (index === -1) {
    ids.push(recipeId);
  } else {
    ids.splice(index, 1);
  }
  saveBookmarks(ids);
  return index === -1;
}

export function getBookmarkedIds(): string[] {
  return loadBookmarks();
}
