import { describe, it, expect } from 'vitest';
import { parseRecipePayload } from './validation';

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
