import { Recipe } from '../types';
import { apiFetch } from './apiClient';

const USER_RECIPES_KEY = 'cookie_user_recipes';
const BOOKMARKS_KEY = 'cookie_bookmarks';
const OVERRIDES_KEY = 'cookie_recipe_overrides';
const IMPORTED_KEY = 'cookie_data_imported';

export interface UserDataPayload {
  userRecipes: Recipe[];
  overrides: Record<string, Recipe>;
  bookmarks: string[];
}

let userRecipes: Recipe[] = [];
let overrides: Record<string, Recipe> = {};
let bookmarks: string[] = [];

function isRecipeShape(v: unknown): v is Recipe {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.title === 'string' &&
    Array.isArray(o.steps) && Array.isArray(o.ingredients);
}

export function getCachedUserRecipes(): Recipe[] {
  return userRecipes;
}

export function getCachedOverrides(): Record<string, Recipe> {
  return overrides;
}

export function getCachedBookmarks(): string[] {
  return bookmarks;
}

export function setUserDataCache(data: UserDataPayload): void {
  userRecipes = data.userRecipes.filter(isRecipeShape);
  overrides = {};
  for (const [k, v] of Object.entries(data.overrides ?? {})) {
    if (isRecipeShape(v)) overrides[k] = v;
  }
  bookmarks = Array.isArray(data.bookmarks) ? [...data.bookmarks] : [];
}

export function clearUserDataCache(): void {
  userRecipes = [];
  overrides = {};
  bookmarks = [];
}

export async function fetchUserData(): Promise<UserDataPayload> {
  const data = await apiFetch<UserDataPayload>('/api/user/data');
  setUserDataCache(data);
  return data;
}

export async function createRecipe(recipe: Omit<Recipe, 'id'>): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(recipe),
  });
  userRecipes.push(data.recipe);
  return data.recipe;
}

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>(`/api/recipes/${encodeURIComponent(recipe.id)}`, {
    method: 'PUT',
    body: JSON.stringify(recipe),
  });

  if (recipe.id.startsWith('user_')) {
    const i = userRecipes.findIndex(r => r.id === recipe.id);
    if (i !== -1) userRecipes[i] = data.recipe;
    else userRecipes.push(data.recipe);
  } else {
    overrides[recipe.id] = data.recipe;
  }

  return data.recipe;
}

export async function toggleBookmarkApi(recipeId: string): Promise<boolean> {
  const data = await apiFetch<{ bookmarked: boolean }>('/api/bookmarks/toggle', {
    method: 'POST',
    body: JSON.stringify({ recipeId }),
  });

  const index = bookmarks.indexOf(recipeId);
  if (data.bookmarked && index === -1) {
    bookmarks.push(recipeId);
  } else if (!data.bookmarked && index !== -1) {
    bookmarks.splice(index, 1);
  }

  return data.bookmarked;
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function hasLocalDataToImport(): boolean {
  if (localStorage.getItem(IMPORTED_KEY) === '1') return false;
  const recipes = readLocalJson<unknown[]>(USER_RECIPES_KEY, []);
  const overridesRaw = readLocalJson<Record<string, unknown>>(OVERRIDES_KEY, {});
  const bookmarksRaw = readLocalJson<string[]>(BOOKMARKS_KEY, []);
  return recipes.length > 0 || Object.keys(overridesRaw).length > 0 || bookmarksRaw.length > 0;
}

export async function importLocalDataIfNeeded(): Promise<boolean> {
  if (!hasLocalDataToImport()) return false;

  const userRecipesLocal = readLocalJson<unknown[]>(USER_RECIPES_KEY, []).filter(isRecipeShape);
  const overridesLocal: Record<string, Recipe> = {};
  const overridesRaw = readLocalJson<Record<string, unknown>>(OVERRIDES_KEY, {});
  for (const [k, v] of Object.entries(overridesRaw)) {
    if (isRecipeShape(v)) overridesLocal[k] = v;
  }
  const bookmarksLocal = readLocalJson<string[]>(BOOKMARKS_KEY, []);

  await apiFetch('/api/user/import', {
    method: 'POST',
    body: JSON.stringify({
      userRecipes: userRecipesLocal,
      overrides: overridesLocal,
      bookmarks: bookmarksLocal,
    }),
  });

  localStorage.setItem(IMPORTED_KEY, '1');
  localStorage.removeItem(USER_RECIPES_KEY);
  localStorage.removeItem(OVERRIDES_KEY);
  localStorage.removeItem(BOOKMARKS_KEY);
  return true;
}
