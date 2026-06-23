import { describe, it, expect } from 'vitest';
import { buildShoppingItemsFromRecipes } from './shoppingList';
import type { Recipe } from '../types';

const sample: Recipe = {
  id: 'r1',
  title: 'Test',
  description: '',
  image: '',
  difficulty: 'Easy',
  time: '30m',
  prepTime: '10m',
  category: 'Main',
  ingredients: [
    { name: 'Flour', amount: '2 cups' },
    { name: 'Sugar', amount: '1 cup' },
  ],
  steps: [{ title: 'Mix', description: 'Mix it' }],
};

describe('buildShoppingItemsFromRecipes', () => {
  it('merges duplicate ingredient names', () => {
    const r2: Recipe = {
      ...sample,
      id: 'r2',
      ingredients: [{ name: 'flour', amount: '1 cup' }],
    };
    const items = buildShoppingItemsFromRecipes([sample, r2]);
    const flour = items.find(i => i.name === 'Flour');
    expect(flour?.amount).toContain('2 cups');
    expect(flour?.amount).toContain('1 cup');
    expect(flour?.recipeIds).toHaveLength(2);
  });

  it('sorts alphabetically', () => {
    const items = buildShoppingItemsFromRecipes([sample]);
    expect(items[0].name).toBe('Flour');
    expect(items[1].name).toBe('Sugar');
  });
});
