import { describe, it, expect, beforeEach } from 'vitest';
import type { Recipe } from '../types';
import { clearUserDataCache, setUserDataCache } from './recipeApi';
import { getAllRecipes, getDraftRecipes } from './recipeStore';

function makeRecipe(id: string, extra: Partial<Recipe> = {}): Recipe {
  return {
    id,
    title: `Recipe ${id}`,
    description: '',
    image: '',
    difficulty: 'Easy',
    time: '10 mins',
    prepTime: '10 mins',
    category: 'Uncategorized',
    ingredients: [],
    steps: [],
    ...extra,
  };
}

function cache(userRecipes: Recipe[]): void {
  setUserDataCache({ userRecipes, overrides: {}, bookmarks: [] });
}

describe('recipeStore drafts', () => {
  beforeEach(() => {
    clearUserDataCache();
  });

  it('excludes drafts from the published library', () => {
    cache([
      makeRecipe('user_published'),
      makeRecipe('user_draft', { draft: true }),
    ]);
    const ids = getAllRecipes().map(r => r.id);
    expect(ids).toContain('user_published');
    expect(ids).not.toContain('user_draft');
  });

  it('returns only drafts, newest first', () => {
    cache([
      makeRecipe('user_published', { addedAt: 3 }),
      makeRecipe('user_draft_old', { draft: true, addedAt: 1 }),
      makeRecipe('user_draft_new', { draft: true, addedAt: 2 }),
    ]);
    expect(getDraftRecipes().map(r => r.id)).toEqual(['user_draft_new', 'user_draft_old']);
  });

  it('publishing (clearing the flag) moves a recipe out of drafts', () => {
    cache([makeRecipe('user_x', { draft: true })]);
    expect(getDraftRecipes()).toHaveLength(1);

    cache([makeRecipe('user_x')]);
    expect(getDraftRecipes()).toHaveLength(0);
    expect(getAllRecipes().map(r => r.id)).toContain('user_x');
  });
});
