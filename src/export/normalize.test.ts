import { describe, expect, it } from 'vitest';
import type { Recipe } from '../types';
import { DEFAULT_EXPORT_OPTIONS } from './types';
import {
  buildCombinedShoppingListLines,
  formatDurationSeconds,
  normalizeRecipeForExport,
} from './normalize';

const baseRecipe: Recipe = {
  id: 't1',
  title: 'Test Tart',
  description: 'A test.',
  image: 'https://example.com/h.jpg',
  difficulty: 'Easy',
  time: '45 min',
  prepTime: '20 min',
  category: 'Dessert',
  ingredients: [
    { name: 'Flour', amount: '2 cups' },
    { name: 'Sugar', amount: '1 cup' },
  ],
  steps: [
    {
      title: 'Mix',
      description: 'Stir dry ingredients.',
      timer: 125,
      ingredientIndices: [0, 1],
    },
  ],
};

describe('formatDurationSeconds', () => {
  it('formats hours and minutes', () => {
    expect(formatDurationSeconds(3600 + 30 * 60)).toBe('1 hr 30 min');
  });
  it('formats minutes only', () => {
    expect(formatDurationSeconds(720)).toBe('12 min');
  });
  it('formats seconds when under a minute', () => {
    expect(formatDurationSeconds(45)).toBe('45 sec');
  });
  it('returns empty for non-positive', () => {
    expect(formatDurationSeconds(0)).toBe('');
  });
});

describe('normalizeRecipeForExport', () => {
  it('resolves ingredientIndices on steps', () => {
    const m = normalizeRecipeForExport(baseRecipe, DEFAULT_EXPORT_OPTIONS);
    expect(m.steps[0].linkedIngredients).toEqual([
      { name: 'Flour', amount: '2 cups' },
      { name: 'Sugar', amount: '1 cup' },
    ]);
  });
  it('formats timer label from seconds', () => {
    const m = normalizeRecipeForExport(baseRecipe, DEFAULT_EXPORT_OPTIONS);
    expect(m.steps[0].timerLabel).toBe('2 min 5 sec');
  });
  it('strips optional sections per options', () => {
    const m = normalizeRecipeForExport(baseRecipe, {
      ...DEFAULT_EXPORT_OPTIONS,
      includeHeroImage: false,
      includeStepPhotos: false,
      includeTags: false,
    });
    expect(m.image).toBeUndefined();
    expect(m.tags).toBeUndefined();
  });
});

describe('buildCombinedShoppingListLines', () => {
  it('flattens ingredients in recipe order', () => {
    const r2: Recipe = {
      ...baseRecipe,
      id: 't2',
      ingredients: [{ name: 'Butter', amount: '1 stick' }],
      steps: [],
    };
    const lines = buildCombinedShoppingListLines([baseRecipe, r2]);
    expect(lines).toEqual(['Flour — 2 cups', 'Sugar — 1 cup', 'Butter — 1 stick']);
  });
});
