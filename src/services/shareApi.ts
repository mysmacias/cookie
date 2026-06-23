import { apiFetch } from './apiClient';
import type { Recipe } from '../types';

export async function createShareLink(recipeId: string): Promise<{ token: string; url: string }> {
  return apiFetch(`/api/recipes/${encodeURIComponent(recipeId)}/share`, { method: 'POST' });
}

export async function fetchSharedRecipe(token: string): Promise<Recipe> {
  const data = await apiFetch<{ recipe: Recipe }>(`/api/share/${encodeURIComponent(token)}`);
  return data.recipe;
}
