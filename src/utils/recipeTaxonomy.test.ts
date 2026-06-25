import { describe, it, expect } from 'vitest';
import type { Recipe } from '../types';
import { deriveCuisines, normalizeRecipeTaxonomy } from './recipeTaxonomy';

function recipe(partial: Partial<Recipe>): Recipe {
  return {
    id: 'r', title: 't', description: '', image: '', difficulty: 'Easy',
    time: '', prepTime: '', category: '', ingredients: [], steps: [],
    ...partial,
  };
}

describe('deriveCuisines', () => {
  it('keeps a category that is already a cuisine', () => {
    expect(deriveCuisines({ category: 'Japanese', tags: [] })).toEqual(['Japanese']);
  });

  it('renames regional categories to their parent cuisine', () => {
    expect(deriveCuisines({ category: 'Sichuan', tags: [] })).toEqual(['Chinese']);
    expect(deriveCuisines({ category: 'Levant', tags: [] })).toEqual(['Levantine']);
    expect(deriveCuisines({ category: 'North African', tags: [] })).toEqual(['Moroccan']);
  });

  it('resolves themed categories to a cuisine', () => {
    expect(deriveCuisines({ category: 'Curry Night', tags: [] })).toEqual(['Indian']);
    expect(deriveCuisines({ category: 'Tapas', tags: [] })).toEqual(['Spanish']);
  });

  it('treats fusion dishes as multi-cuisine', () => {
    expect(deriveCuisines({ category: 'Coastal Latin', tags: [] }))
      .toEqual(['Mexican', 'Peruvian']);
  });

  it('recovers cuisine from tags when the category is a protein/course', () => {
    expect(deriveCuisines({ category: 'Chicken', tags: ['chicken', 'greek', 'mediterranean'] }))
      .toEqual(['Greek']);
    expect(deriveCuisines({ category: 'Side Dish', tags: ['portuguese', 'vegan'] }))
      .toEqual(['Portuguese']);
  });

  it('returns empty when there is no cuisine signal', () => {
    expect(deriveCuisines({ category: 'Heirloom Recipe', tags: ['cookies', 'baking'] }))
      .toEqual([]);
  });

  it('honours an explicit cuisines array', () => {
    expect(deriveCuisines({ cuisines: ['Peruvian'], category: 'Chicken', tags: ['greek'] }))
      .toEqual(['Peruvian']);
  });
});

describe('normalizeRecipeTaxonomy', () => {
  it('sets category to the primary cuisine and demotes the old one to a tag', () => {
    const out = normalizeRecipeTaxonomy(recipe({ category: 'Sichuan', tags: ['tofu', 'spicy'] }));
    expect(out.category).toBe('Chinese');
    expect(out.cuisines).toEqual(['Chinese']);
    expect(out.tags).toContain('sichuan');
  });

  it('does not duplicate a demoted category already present as a tag', () => {
    const out = normalizeRecipeTaxonomy(recipe({ category: 'Chicken', tags: ['chicken', 'greek'] }));
    expect(out.category).toBe('Greek');
    expect(out.tags?.filter(t => t === 'chicken')).toHaveLength(1);
  });

  it('files a fusion dish under every cuisine', () => {
    const out = normalizeRecipeTaxonomy(recipe({ category: 'Coastal Latin', tags: ['ceviche'] }));
    expect(out.cuisines).toEqual(['Mexican', 'Peruvian']);
    expect(out.category).toBe('Mexican');
  });

  it('leaves a no-cuisine recipe’s category intact with empty cuisines', () => {
    const out = normalizeRecipeTaxonomy(recipe({ category: 'Bakery Classic', tags: ['donuts'] }));
    expect(out.category).toBe('Bakery Classic');
    expect(out.cuisines).toEqual([]);
  });

  it('is idempotent', () => {
    const once = normalizeRecipeTaxonomy(recipe({ category: 'Tapas', tags: ['spanish', 'eggs'] }));
    const twice = normalizeRecipeTaxonomy(once);
    expect(twice).toEqual(once);
  });
});
