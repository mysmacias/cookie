import { describe, it, expect } from 'vitest';
import { inferAisle, groupItemsByAisle } from './shoppingList';
import type { ShoppingItem } from './shoppingList';

describe('inferAisle', () => {
  it('classifies produce', () => {
    expect(inferAisle('Fresh basil')).toBe('Produce');
  });

  it('classifies dairy', () => {
    expect(inferAisle('Whole milk')).toBe('Dairy');
  });

  it('falls back to Other', () => {
    expect(inferAisle('Widget doodad')).toBe('Other');
  });
});

describe('groupItemsByAisle', () => {
  it('groups items by aisle', () => {
    const items: ShoppingItem[] = [
      { id: '1', name: 'Flour', amount: '2 cups', checked: false, recipeIds: [], aisle: 'Pantry' },
      { id: '2', name: 'Basil', amount: '1 bunch', checked: false, recipeIds: [], aisle: 'Produce' },
    ];
    const groups = groupItemsByAisle(items);
    expect(groups.map(g => g.aisle)).toContain('Pantry');
    expect(groups.map(g => g.aisle)).toContain('Produce');
  });
});
