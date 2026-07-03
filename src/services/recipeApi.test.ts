import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Recipe } from '../types';
import {
  clearUserDataCache,
  createRecipe,
  getCachedUserRecipes,
  saveRecipe,
  setGuestMode,
} from './recipeApi';

const payload: Omit<Recipe, 'id'> = {
  title: 'Guest recipe',
  description: '',
  image: '',
  difficulty: 'Easy',
  time: '10 mins',
  prepTime: '10 mins',
  category: 'Uncategorized',
  ingredients: [],
  steps: [],
};

describe('recipeApi guest mode', () => {
  beforeEach(() => {
    clearUserDataCache();
    setGuestMode(true);
  });

  afterEach(() => {
    setGuestMode(false);
    clearUserDataCache();
  });

  it('preserves addedAt when an update payload omits it', async () => {
    const created = await createRecipe(payload);
    expect(created.addedAt).toBeTypeOf('number');

    // Form payloads never carry addedAt — the stored value must survive.
    const { addedAt: _dropped, ...withoutAddedAt } = created;
    await saveRecipe(withoutAddedAt as Recipe);

    expect(getCachedUserRecipes()[0].addedAt).toBe(created.addedAt);
  });

  it('clears the draft flag when an update omits it (publish)', async () => {
    const created = await createRecipe({ ...payload, draft: true });
    expect(getCachedUserRecipes()[0].draft).toBe(true);

    await saveRecipe({ ...created, draft: undefined });
    expect(getCachedUserRecipes()[0].draft).toBeUndefined();
  });
});
