import { describe, it, expect } from 'vitest';
import { isIngredientCrossedOff, isIngredientActiveOnStep } from './cookingIngredientProgress';
import type { Recipe } from '../types';

const recipe: Recipe = {
  id: 'r1',
  title: 'Test',
  description: '',
  image: '',
  difficulty: 'Easy',
  time: '10m',
  prepTime: '5m',
  category: 'Main',
  ingredients: [
    { name: 'Flour', amount: '1 cup' },
    { name: 'Sugar', amount: '2 tbsp' },
  ],
  steps: [
    { title: 'Mix flour', description: 'Combine flour in a bowl', ingredientIndices: [0] },
    { title: 'Add sugar', description: 'Stir in sugar', ingredientIndices: [1] },
  ],
};

describe('cookingIngredientProgress', () => {
  it('highlights active ingredients on current step', () => {
    expect(isIngredientActiveOnStep(recipe, 0, 0)).toBe(true);
    expect(isIngredientActiveOnStep(recipe, 1, 0)).toBe(false);
  });

  it('crosses off ingredients after their last step', () => {
    expect(isIngredientCrossedOff(recipe, 0, 0)).toBe(false);
    expect(isIngredientCrossedOff(recipe, 0, 1)).toBe(true);
    expect(isIngredientCrossedOff(recipe, 1, 1)).toBe(false);
  });
});
