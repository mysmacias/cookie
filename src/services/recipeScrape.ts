import { apiFetch } from './apiClient';
import type { Recipe } from '../types';

export interface WebRecipeSearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
}

export interface WebRecipeSearchResponse {
  data: WebRecipeSearchResult[];
  meta: {
    page: number;
    per_page: number;
    has_more: boolean;
  };
}

export interface WebRecipeSearchParams {
  q?: string;
  page?: number;
  per_page?: number;
}

export async function searchWebRecipes(params: WebRecipeSearchParams = {}): Promise<WebRecipeSearchResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  const query = qs.toString();
  return apiFetch<WebRecipeSearchResponse>(`/api/scrape-recipe/search${query ? `?${query}` : ''}`);
}

export async function importRecipeFromUrl(url: string): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>('/api/scrape-recipe/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  return data.recipe;
}

export function getImportedScrapeUrls(recipes: Recipe[]): Set<string> {
  const urls = new Set<string>();
  for (const r of recipes) {
    if (r.sourceUrl) urls.add(r.sourceUrl);
    if (r.id.startsWith('scrape_') && r.sourceUrl) urls.add(r.sourceUrl);
  }
  return urls;
}

export function findRecipeBySourceUrl(recipes: Recipe[], url: string): Recipe | undefined {
  const normalized = url.trim();
  return recipes.find(r => r.sourceUrl === normalized || r.id.startsWith('scrape_') && r.sourceUrl === normalized);
}
