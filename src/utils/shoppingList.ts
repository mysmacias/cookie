import type { Recipe } from '../types';

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
  recipeIds: string[];
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function buildShoppingItemsFromRecipes(recipes: Recipe[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = normalizeName(ing.name);
      const existing = map.get(key);
      if (existing) {
        if (!existing.recipeIds.includes(recipe.id)) {
          existing.recipeIds.push(recipe.id);
          existing.amount = `${existing.amount}; ${ing.amount}`;
        }
      } else {
        map.set(key, {
          id: key,
          name: ing.name,
          amount: ing.amount,
          checked: false,
          recipeIds: [recipe.id],
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function shoppingListToMarkdown(items: ShoppingItem[]): string {
  const lines = ['# Shopping list', ''];
  for (const item of items) {
    const mark = item.checked ? 'x' : ' ';
    lines.push(`- [${mark}] **${item.name}** — ${item.amount}`);
  }
  return lines.join('\n');
}
