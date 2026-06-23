import { apiFetch } from './apiClient';
import type { ShoppingItem } from '../utils/shoppingList';

export async function fetchShoppingList(): Promise<ShoppingItem[]> {
  const data = await apiFetch<{ items: ShoppingItem[] }>('/api/shopping-list');
  return data.items ?? [];
}

export async function saveShoppingList(items: ShoppingItem[]): Promise<void> {
  await apiFetch('/api/shopping-list', {
    method: 'PUT',
    body: JSON.stringify({ items }),
  });
}
