import { apiFetch } from './apiClient';
import type { Recipe } from '../types';

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
  /** Display name of the user who published this recipe, for community rows */
  author?: string;
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

export async function importRecipeFromCatalog(id: string): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>('/api/catalog/import', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  return data.recipe;
}

/** Ids of the current user's recipes that are published to the shared catalog. */
export async function fetchPublishedRecipeIds(): Promise<string[]> {
  const data = await apiFetch<{ ids: string[] }>('/api/catalog/publish');
  return data.ids;
}

export async function publishRecipeToCatalog(id: string): Promise<void> {
  await apiFetch('/api/catalog/publish', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
}

export async function unpublishRecipeFromCatalog(id: string): Promise<void> {
  await apiFetch('/api/catalog/publish', {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  });
}
