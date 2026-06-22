import { apiFetch } from './apiClient';
import type { Recipe } from '../types';

export interface RecipeApiPreview {
  id: number;
  name: string;
  description: string;
  difficulty: string;
  meal_type: string;
  cuisine: string;
  dietary_tags: string[];
  servings: number;
  prep_time: number;
  cook_time: number;
}

export interface RecipeApiSearchResult {
  data: RecipeApiPreview[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface RecipeApiSearchParams {
  search?: string;
  page?: number;
  per_page?: number;
  cuisine?: string;
  meal_type?: string;
  difficulty?: string;
}

export async function searchRecipeApi(params: RecipeApiSearchParams): Promise<RecipeApiSearchResult> {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.cuisine) qs.set('cuisine', params.cuisine);
  if (params.meal_type) qs.set('meal_type', params.meal_type);
  if (params.difficulty) qs.set('difficulty', params.difficulty);

  const query = qs.toString();
  return apiFetch<RecipeApiSearchResult>(`/api/recipe-api/search${query ? `?${query}` : ''}`);
}

export async function importRecipeFromApi(externalId: number): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>('/api/recipe-api/import', {
    method: 'POST',
    body: JSON.stringify({ externalId }),
  });
  return data.recipe;
}

export function getImportedApiExternalIds(recipes: Recipe[]): Set<number> {
  const ids = new Set<number>();
  for (const r of recipes) {
    if (!r.id.startsWith('api_')) continue;
    const n = parseInt(r.id.slice(4), 10);
    if (!Number.isNaN(n)) ids.add(n);
  }
  return ids;
}
