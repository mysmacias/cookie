import { describe, it, expect } from 'vitest';
import {
  parseRecipePayload,
  parseCollectionName,
  parseShoppingListItems,
  parseMealPlanPayload,
} from './validation';

describe('parseRecipePayload', () => {
  it('accepts valid recipe', () => {
    const result = parseRecipePayload({
      title: 'Bread',
      description: 'Good bread',
      prepTime: '10m',
      time: '30m',
      category: 'Bread',
      difficulty: 'Easy',
      ingredients: [{ name: 'Flour', amount: '2 cups' }],
      steps: [{ title: 'Mix', description: 'Mix flour' }],
    });
    expect(result?.title).toBe('Bread');
  });

  it('rejects missing title', () => {
    expect(parseRecipePayload({
      title: '', description: 'x', prepTime: '1', time: '1', category: 'x', difficulty: 'Easy',
      ingredients: [], steps: [],
    })).toBeNull();
  });

  it('rejects invalid difficulty', () => {
    expect(parseRecipePayload({
      title: 'X', description: 'x', prepTime: '1', time: '1', category: 'x', difficulty: 'Hard',
      ingredients: [], steps: [],
    })).toBeNull();
  });
});

describe('parseCollectionName', () => {
  it('accepts valid names', () => {
    expect(parseCollectionName('Weeknight dinners')).toBe('Weeknight dinners');
  });

  it('rejects empty names', () => {
    expect(parseCollectionName('   ')).toBeNull();
    expect(parseCollectionName(null)).toBeNull();
  });

  it('rejects overly long names', () => {
    expect(parseCollectionName('x'.repeat(121))).toBeNull();
  });
});

describe('parseShoppingListItems', () => {
  it('accepts valid items', () => {
    const items = parseShoppingListItems([
      { id: 'flour', name: 'Flour', amount: '2 cups', checked: false, recipeIds: ['r1'] },
    ]);
    expect(items).toHaveLength(1);
    expect(items?.[0].name).toBe('Flour');
  });

  it('rejects invalid items', () => {
    expect(parseShoppingListItems([{ id: '', name: 'x', amount: '1', checked: false, recipeIds: [] }])).toBeNull();
    expect(parseShoppingListItems('not-array')).toBeNull();
  });
});

describe('parseMealPlanPayload', () => {
  it('accepts valid plan', () => {
    const plan = parseMealPlanPayload({
      days: [{ date: '2026-06-22', recipeIds: ['user_1'] }],
    });
    expect(plan?.days).toHaveLength(1);
  });

  it('rejects invalid dates', () => {
    expect(parseMealPlanPayload({ days: [{ date: 'bad', recipeIds: [] }] })).toBeNull();
  });
});
