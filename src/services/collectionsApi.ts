import { apiFetch } from './apiClient';

export interface CollectionSummary {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  recipe_count: number;
}

export async function fetchCollections(): Promise<CollectionSummary[]> {
  const data = await apiFetch<{ collections: CollectionSummary[] }>('/api/collections');
  return data.collections;
}

export async function createCollection(name: string): Promise<CollectionSummary> {
  const data = await apiFetch<{ collection: CollectionSummary }>('/api/collections', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return data.collection;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  await apiFetch(`/api/collections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function deleteCollection(id: string): Promise<void> {
  await apiFetch(`/api/collections/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchCollectionRecipeIds(id: string): Promise<string[]> {
  const data = await apiFetch<{ recipeIds: string[] }>(`/api/collections/${encodeURIComponent(id)}`);
  return data.recipeIds;
}

export async function addRecipeToCollection(collectionId: string, recipeId: string): Promise<void> {
  await apiFetch(`/api/collections/${encodeURIComponent(collectionId)}/recipes/${encodeURIComponent(recipeId)}`, {
    method: 'POST',
    body: JSON.stringify({ recipeId }),
  });
}

export async function removeRecipeFromCollection(collectionId: string, recipeId: string): Promise<void> {
  await apiFetch(`/api/collections/${encodeURIComponent(collectionId)}/recipes/${encodeURIComponent(recipeId)}`, {
    method: 'DELETE',
  });
}
