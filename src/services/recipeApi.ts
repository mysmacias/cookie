import { Recipe } from '../types';
import { apiFetch } from './apiClient';
import { prepareRecipeMedia } from './mediaUpload';

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

// Global, shared recipe catalog (public; same for every visitor). Cached in
// memory; the HTTP response is browser/edge-cached so reloads are cheap.
let catalog: Recipe[] = [];

// Guest mode keeps everything in localStorage (the same keys we later import
// into a real account) instead of hitting the authenticated API.
let guestMode = false;

export function setGuestMode(enabled: boolean): void {
  guestMode = enabled;
}

export function isGuestMode(): boolean {
  return guestMode;
}

function genId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}${rand}`;
}

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

export function getCachedCatalog(): Recipe[] {
  return catalog;
}

// Fetch the shared catalog. Public endpoint, so this works for guests and
// signed-in users alike. On failure the existing cache is left intact.
export async function fetchCatalog(): Promise<Recipe[]> {
  try {
    const data = await apiFetch<{ recipes: Recipe[] }>('/api/recipes/catalog');
    catalog = (data.recipes ?? []).filter(isRecipeShape);
  } catch {
    // keep whatever we already have
  }
  return catalog;
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
  const prepared = await prepareRecipeMedia(recipe as Recipe);
  if (guestMode) {
    const created: Recipe = { ...(prepared as Recipe), id: genId('user_'), addedAt: Date.now() };
    userRecipes.push(created);
    persistGuestData();
    return created;
  }
  const data = await apiFetch<{ recipe: Recipe }>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify(prepared),
  });
  userRecipes.push(data.recipe);
  return data.recipe;
}

function applySavedRecipe(saved: Recipe): void {
  if (saved.id.startsWith('user_') || saved.id.startsWith('api_') || saved.id.startsWith('scrape_')) {
    const i = userRecipes.findIndex(r => r.id === saved.id);
    if (i !== -1) userRecipes[i] = saved;
    else userRecipes.push(saved);
  } else {
    overrides[saved.id] = saved;
  }
}

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const prepared = await prepareRecipeMedia(recipe);
  if (guestMode) {
    applySavedRecipe(prepared);
    persistGuestData();
    return prepared;
  }
  const data = await apiFetch<{ recipe: Recipe }>(`/api/recipes/${encodeURIComponent(recipe.id)}`, {
    method: 'PUT',
    body: JSON.stringify(prepared),
  });

  applySavedRecipe(data.recipe);
  return data.recipe;
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  if (guestMode) {
    userRecipes = userRecipes.filter(r => r.id !== recipeId);
    delete overrides[recipeId];
    bookmarks = bookmarks.filter(id => id !== recipeId);
    persistGuestData();
    return;
  }
  await apiFetch(`/api/recipes/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
  userRecipes = userRecipes.filter(r => r.id !== recipeId);
  delete overrides[recipeId];
  bookmarks = bookmarks.filter(id => id !== recipeId);
}

export async function duplicateRecipe(recipeId: string, source?: Recipe): Promise<Recipe> {
  if (guestMode) {
    if (!source) throw new Error('Recipe to copy not found.');
    const { id: _id, ...rest } = source;
    const copy: Recipe = {
      ...(rest as Omit<Recipe, 'id'>),
      id: genId('user_'),
      title: `${source.title} (copy)`,
      addedAt: Date.now(),
    } as Recipe;
    userRecipes.push(copy);
    persistGuestData();
    return copy;
  }
  const data = await apiFetch<{ recipe: Recipe }>('/api/recipes', {
    method: 'POST',
    body: JSON.stringify({ copyFrom: recipeId }),
  });
  userRecipes.push(data.recipe);
  return data.recipe;
}

export async function toggleBookmarkApi(recipeId: string): Promise<boolean> {
  if (guestMode) {
    const index = bookmarks.indexOf(recipeId);
    const bookmarked = index === -1;
    if (bookmarked) bookmarks.push(recipeId);
    else bookmarks.splice(index, 1);
    persistGuestData();
    return bookmarked;
  }
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

function persistGuestData(): void {
  try {
    localStorage.setItem(USER_RECIPES_KEY, JSON.stringify(userRecipes));
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // Ignore quota / serialization errors; the in-memory cache still works.
  }
}

// Hydrate the in-memory cache from localStorage for guest sessions. Clears the
// "imported" flag so guest data is still picked up if the guest signs up later.
export function loadGuestData(): void {
  localStorage.removeItem(IMPORTED_KEY);
  userRecipes = readLocalJson<unknown[]>(USER_RECIPES_KEY, []).filter(isRecipeShape);
  overrides = {};
  const overridesRaw = readLocalJson<Record<string, unknown>>(OVERRIDES_KEY, {});
  for (const [k, v] of Object.entries(overridesRaw)) {
    if (isRecipeShape(v)) overrides[k] = v;
  }
  bookmarks = readLocalJson<string[]>(BOOKMARKS_KEY, []).filter(id => typeof id === 'string');
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
