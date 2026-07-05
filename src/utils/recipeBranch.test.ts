import { describe, it, expect } from 'vitest';
import type { Recipe } from '../types';
import {
  branchLabel,
  buildBranchPayload,
  collapseToFamilies,
  diffRecipes,
  getFamilyRoot,
  getParentRecipe,
  getRecipeFamily,
  summarizeDiff,
} from './recipeBranch';

function makeRecipe(overrides: Partial<Recipe> & Pick<Recipe, 'id' | 'title'>): Recipe {
  return {
    description: '',
    image: '',
    difficulty: 'Easy',
    time: '30 min',
    prepTime: '30 min',
    category: 'Italian',
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

const nonna = makeRecipe({
  id: 'r1',
  title: "Nonna's carbonara",
  addedAt: 100,
  ingredients: [
    { name: 'Spaghetti', amount: '400 g' },
    { name: 'Guanciale', amount: '150 g' },
    { name: 'Pecorino', amount: '80 g' },
  ],
  steps: [
    { title: 'Boil pasta', description: 'Cook the spaghetti in salted water.' },
    { title: 'Crisp guanciale', description: 'Render the guanciale until crisp.' },
    { title: 'Combine', description: 'Toss everything off the heat.' },
  ],
});

const moms = makeRecipe({
  id: 'r2',
  title: "Mom's version",
  parentId: 'r1',
  branchName: 'Pecorino blend',
  addedAt: 200,
  ingredients: [
    { name: 'Spaghetti', amount: '400 g' },
    { name: 'Guanciale', amount: '150 g' },
    { name: 'Pecorino', amount: '40 g' },
    { name: 'Parmesan', amount: '40 g' },
  ],
  steps: [
    { title: 'Boil pasta', description: 'Cook the spaghetti in salted water.' },
    { title: 'Crisp guanciale', description: 'Render the guanciale until crisp.' },
    { title: 'Combine', description: 'Toss with both cheeses off the heat.' },
  ],
});

const marcos = makeRecipe({
  id: 'r3',
  title: 'Brown butter carbonara',
  parentId: 'r2',
  branchName: 'Brown butter',
  addedAt: 300,
});

const unrelated = makeRecipe({ id: 'r9', title: 'Salad' });

const all = [nonna, moms, marcos, unrelated];

describe('getFamilyRoot', () => {
  it('walks up to the topmost ancestor', () => {
    expect(getFamilyRoot(all, marcos).id).toBe('r1');
    expect(getFamilyRoot(all, nonna).id).toBe('r1');
  });

  it('treats an orphaned branch as its own root', () => {
    const orphan = makeRecipe({ id: 'r4', title: 'Orphan', parentId: 'gone' });
    expect(getFamilyRoot([...all, orphan], orphan).id).toBe('r4');
  });

  it('survives cycles in corrupted data', () => {
    const a = makeRecipe({ id: 'a', title: 'A', parentId: 'b' });
    const b = makeRecipe({ id: 'b', title: 'B', parentId: 'a' });
    expect(getFamilyRoot([a, b], a).id).toBe('b');
  });
});

describe('getRecipeFamily', () => {
  it('returns the whole tree in depth-first order with depths', () => {
    const family = getRecipeFamily(all, moms);
    expect(family.map(n => n.recipe.id)).toEqual(['r1', 'r2', 'r3']);
    expect(family.map(n => n.depth)).toEqual([0, 1, 2]);
  });

  it('orders siblings oldest-first', () => {
    const younger = makeRecipe({ id: 'r5', title: 'No guanciale', parentId: 'r1', addedAt: 250 });
    const family = getRecipeFamily([...all, younger], nonna);
    expect(family.map(n => n.recipe.id)).toEqual(['r1', 'r2', 'r3', 'r5']);
  });

  it('returns a single node for a recipe with no relatives', () => {
    const family = getRecipeFamily(all, unrelated);
    expect(family).toHaveLength(1);
    expect(family[0].recipe.id).toBe('r9');
  });
});

describe('getParentRecipe', () => {
  it('resolves the parent when present', () => {
    expect(getParentRecipe(all, moms)?.id).toBe('r1');
  });

  it('returns null for roots and orphans', () => {
    expect(getParentRecipe(all, nonna)).toBeNull();
    const orphan = makeRecipe({ id: 'r4', title: 'Orphan', parentId: 'gone' });
    expect(getParentRecipe(all, orphan)).toBeNull();
  });
});

describe('diffRecipes', () => {
  it('reports added, removed and changed ingredients by name', () => {
    const diff = diffRecipes(nonna, moms);
    expect(diff.addedIngredients.map(i => i.name)).toEqual(['Parmesan']);
    expect(diff.removedIngredients).toEqual([]);
    expect(diff.changedIngredients).toEqual([{ name: 'Pecorino', from: '80 g', to: '40 g' }]);
  });

  it('matches ingredient names case-insensitively', () => {
    const a = makeRecipe({ id: 'a', title: 'A', ingredients: [{ name: 'Butter', amount: '1 tbsp' }] });
    const b = makeRecipe({ id: 'b', title: 'B', ingredients: [{ name: 'butter', amount: '1 tbsp' }] });
    expect(diffRecipes(a, b).isEmpty).toBe(true);
  });

  it('flags a step with the same title but new description as changed', () => {
    const diff = diffRecipes(nonna, moms);
    expect(diff.changedSteps).toEqual([{ title: 'Combine' }]);
    expect(diff.addedSteps).toEqual([]);
    expect(diff.removedSteps).toEqual([]);
  });

  it('reports brand-new steps as added', () => {
    const withRest = makeRecipe({
      id: 'x',
      title: 'X',
      ingredients: nonna.ingredients,
      steps: [...nonna.steps, { title: 'Rest', description: 'Let it sit five minutes.' }],
    });
    const diff = diffRecipes(nonna, withRest);
    expect(diff.addedSteps.map(s => s.title)).toEqual(['Rest']);
    expect(diff.changedSteps).toEqual([]);
  });

  it('does not report reordered steps as changes', () => {
    const reordered = makeRecipe({
      id: 'x',
      title: 'X',
      ingredients: nonna.ingredients,
      steps: [nonna.steps[1], nonna.steps[0], nonna.steps[2]],
    });
    expect(diffRecipes(nonna, reordered).isEmpty).toBe(true);
  });

  it('reports changed meta fields', () => {
    const slower = makeRecipe({ id: 'x', title: 'X', ingredients: nonna.ingredients, steps: nonna.steps, prepTime: '45 min', time: '45 min' });
    const diff = diffRecipes(nonna, slower);
    expect(diff.changedMeta).toEqual([
      { label: 'Prep time', from: '30 min', to: '45 min' },
      { label: 'Time', from: '30 min', to: '45 min' },
    ]);
  });

  it('is empty for an untouched copy', () => {
    const copy = { ...nonna, id: 'copy', parentId: nonna.id };
    expect(diffRecipes(nonna, copy).isEmpty).toBe(true);
  });
});

describe('summarizeDiff', () => {
  it('joins the first changes and counts the rest', () => {
    const summary = summarizeDiff(diffRecipes(nonna, moms));
    expect(summary).toBe('~ Pecorino 80 g → 40 g · + Parmesan · +1 more');
  });

  it('respects a custom limit', () => {
    const summary = summarizeDiff(diffRecipes(nonna, moms), 3);
    expect(summary).toBe('~ Pecorino 80 g → 40 g · + Parmesan · ~ Combine');
  });

  it('returns an empty string for an untouched copy', () => {
    const copy = { ...nonna, id: 'copy', parentId: nonna.id };
    expect(summarizeDiff(diffRecipes(nonna, copy))).toBe('');
  });
});

describe('collapseToFamilies', () => {
  it('collapses a family into one entry led by its root', () => {
    const families = collapseToFamilies([nonna, moms, marcos, unrelated], all);
    expect(families.map(f => f.root.id)).toEqual(['r1', 'r9']);
    expect(families[0].variationCount).toBe(2);
    expect(families[1].variationCount).toBe(0);
  });

  it('surfaces the root even when only a branch matched the filters', () => {
    const families = collapseToFamilies([moms], all);
    expect(families.map(f => f.root.id)).toEqual(['r1']);
    expect(families[0].variationCount).toBe(2);
  });

  it('counts draft branches that are not in the visible list', () => {
    const draft = makeRecipe({ id: 'r6', title: 'Draft take', parentId: 'r1', draft: true });
    const families = collapseToFamilies([nonna, unrelated], [...all, draft]);
    expect(families[0].variationCount).toBe(3);
  });

  it('keeps the visible order for family positioning', () => {
    const families = collapseToFamilies([unrelated, marcos], all);
    expect(families.map(f => f.root.id)).toEqual(['r9', 'r1']);
  });

  it('survives cycles in corrupted data', () => {
    const a = makeRecipe({ id: 'a', title: 'A', parentId: 'b' });
    const b = makeRecipe({ id: 'b', title: 'B', parentId: 'a' });
    const families = collapseToFamilies([a], [a, b]);
    expect(families).toHaveLength(1);
    expect(families[0].variationCount).toBeLessThanOrEqual(1);
  });
});

describe('buildBranchPayload', () => {
  it('copies the recipe as a draft pointing at its parent', () => {
    const payload = buildBranchPayload(nonna, { branchName: 'Brown butter', branchNote: 'Browned the butter first' });
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('addedAt');
    expect(payload.parentId).toBe('r1');
    expect(payload.branchName).toBe('Brown butter');
    expect(payload.branchNote).toBe('Browned the butter first');
    expect(payload.draft).toBe(true);
    expect(payload.ingredients).toEqual(nonna.ingredients);
    expect(payload.title).toBe(nonna.title);
  });

  it('branching a branch points at the branch, not the root', () => {
    const payload = buildBranchPayload(moms, { branchName: 'Extra crispy' });
    expect(payload.parentId).toBe('r2');
    expect(payload.branchNote).toBeUndefined();
  });
});

describe('branchLabel', () => {
  it('prefers the branch name and falls back to the title', () => {
    expect(branchLabel(moms)).toBe('Pecorino blend');
    expect(branchLabel(nonna)).toBe("Nonna's carbonara");
  });
});
