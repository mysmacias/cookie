import { apiFetch } from './apiClient';
import type { Recipe } from '../types';

// Preview of a recipe in the global Cookie collection (D1 `recipes` catalog).
export interface CatalogPreview {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  time: string;
  sourceUrl: string;
  sourceDomain: string;
}

export interface CatalogSearchResult {
  data: CatalogPreview[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
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

export async function importCatalogRecipe(id: string): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>('/api/catalog/import', {
    method: 'POST',
    body: JSON.stringify({ id }),
  });
  return data.recipe;
}

// Catalog recipes keep their scrape_ id when imported, so presence of that id
// in the user's library marks the card as already saved.
export function getImportedCatalogIds(recipes: Recipe[]): Set<string> {
  const ids = new Set<string>();
  for (const r of recipes) {
    if (r.id.startsWith('scrape_')) ids.add(r.id);
  }
  return ids;
}
