import { apiFetch } from './apiClient';
import type { Recipe } from '../types';
import { normalizeRecipeTaxonomy } from '../utils/recipeTaxonomy';

export interface CatalogPreview {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  difficulty: string;
  time: string;
  tags: string[];
  sourceUrl?: string;
  sourceDomain?: string;
}

export interface CatalogSearchResult {
  data: CatalogPreview[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface CatalogSearchParams {
  q?: string;
  page?: number;
  per_page?: number;
}

export async function searchCatalog(params: CatalogSearchParams): Promise<CatalogSearchResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));

  const query = qs.toString();
  return apiFetch<CatalogSearchResult>(`/api/catalog/search${query ? `?${query}` : ''}`);
}

/**
 * Fetch a sample of catalog recipes slimmed down for the similarity graph
 * (ingredient names, tags, category, time — no steps). Normalized the same
 * way as library recipes so region colors and category chips line up.
 */
export async function fetchCatalogGraphRecipes(): Promise<Recipe[]> {
  const res = await apiFetch<{ data: Recipe[] }>('/api/catalog/graph');
  return res.data.map(normalizeRecipeTaxonomy);
}

export async function importRecipeFromCatalog(id: string): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>('/api/catalog/import', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  return data.recipe;
}
