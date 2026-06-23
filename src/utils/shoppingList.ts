import type { Recipe } from '../types';

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
  recipeIds: string[];
  aisle?: string;
}

const AISLE_RULES: { aisle: string; keywords: string[] }[] = [
  { aisle: 'Produce', keywords: ['lettuce', 'tomato', 'onion', 'garlic', 'herb', 'basil', 'parsley', 'cilantro', 'lemon', 'lime', 'apple', 'banana', 'carrot', 'celery', 'potato', 'spinach', 'pepper', 'mushroom', 'ginger', 'avocado', 'cucumber', 'zucchini', 'broccoli', 'kale', 'fruit', 'vegetable'] },
  { aisle: 'Dairy', keywords: ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'egg', 'sour cream', 'parmesan', 'mozzarella', 'cheddar'] },
  { aisle: 'Meat & Seafood', keywords: ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'shrimp', 'bacon', 'sausage', 'turkey', 'steak', 'tuna'] },
  { aisle: 'Bakery', keywords: ['bread', 'bun', 'roll', 'tortilla', 'pita', 'baguette', 'croissant'] },
  { aisle: 'Pantry', keywords: ['flour', 'sugar', 'rice', 'pasta', 'oil', 'vinegar', 'salt', 'pepper', 'spice', 'honey', 'syrup', 'bean', 'lentil', 'stock', 'broth', 'can', 'tomato paste', 'soy sauce', 'baking powder', 'yeast', 'oat', 'nut', 'almond'] },
  { aisle: 'Frozen', keywords: ['frozen', 'ice cream'] },
  { aisle: 'Beverages', keywords: ['wine', 'beer', 'juice', 'water', 'coffee', 'tea'] },
];

export function inferAisle(name: string): string {
  const lower = name.trim().toLowerCase();
  for (const rule of AISLE_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) return rule.aisle;
  }
  return 'Other';
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
          aisle: inferAisle(ing.name),
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function createManualShoppingItem(name: string, amount = ''): ShoppingItem {
  const trimmed = name.trim();
  const id = `manual_${normalizeName(trimmed)}_${Date.now()}`;
  return {
    id,
    name: trimmed,
    amount: amount.trim(),
    checked: false,
    recipeIds: [],
    aisle: inferAisle(trimmed),
  };
}

export function mergeShoppingItems(existing: ShoppingItem[], incoming: ShoppingItem[]): ShoppingItem[] {
  const map = new Map(existing.map(i => [i.id, { ...i }]));
  for (const item of incoming) {
    const prior = map.get(item.id);
    if (prior) {
      prior.amount = prior.amount.includes(item.amount) ? prior.amount : `${prior.amount}; ${item.amount}`;
      for (const rid of item.recipeIds) {
        if (!prior.recipeIds.includes(rid)) prior.recipeIds.push(rid);
      }
    } else {
      map.set(item.id, { ...item, aisle: item.aisle ?? inferAisle(item.name) });
    }
  }
  return Array.from(map.values());
}

export interface AisleGroup {
  aisle: string;
  items: ShoppingItem[];
}

export function groupItemsByAisle(items: ShoppingItem[]): AisleGroup[] {
  const groups = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const aisle = item.aisle ?? inferAisle(item.name);
    const list = groups.get(aisle) ?? [];
    list.push({ ...item, aisle });
    groups.set(aisle, list);
  }
  const order = [...AISLE_RULES.map(r => r.aisle), 'Other'];
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([aisle, aisleItems]) => ({
      aisle,
      items: aisleItems.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function shoppingListToMarkdown(items: ShoppingItem[]): string {
  const lines = ['# Shopping list', ''];
  for (const group of groupItemsByAisle(items)) {
    lines.push(`## ${group.aisle}`, '');
    for (const item of group.items) {
      const mark = item.checked ? 'x' : ' ';
      lines.push(`- [${mark}] **${item.name}** — ${item.amount}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
