import { apiFetch } from './apiClient';

export interface RecipeNotes {
  notes: string;
  lastCookedAt: number | null;
  rating: number | null;
  updatedAt: number | null;
}

export async function fetchRecipeNotes(recipeId: string): Promise<RecipeNotes> {
  return apiFetch<RecipeNotes>(`/api/recipes/${encodeURIComponent(recipeId)}/notes`);
}

export async function saveRecipeNotes(
  recipeId: string,
  patch: Partial<Pick<RecipeNotes, 'notes' | 'lastCookedAt' | 'rating'>>,
): Promise<RecipeNotes> {
  return apiFetch<RecipeNotes>(`/api/recipes/${encodeURIComponent(recipeId)}/notes`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
}
