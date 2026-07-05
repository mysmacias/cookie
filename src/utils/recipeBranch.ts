import type { Ingredient, Recipe, Step } from '../types';

/** A member of a recipe family, with its depth below the family root. */
export interface FamilyNode {
  recipe: Recipe;
  depth: number;
}

export interface RecipeDiff {
  addedIngredients: Ingredient[];
  removedIngredients: Ingredient[];
  /** Same ingredient (by name), different amount */
  changedIngredients: { name: string; from: string; to: string }[];
  addedSteps: Step[];
  removedSteps: Step[];
  /** Same step (by title), different description */
  changedSteps: { title: string }[];
  /** Recipe-level fields that differ (prep time, yields, difficulty…) */
  changedMeta: { label: string; from: string; to: string }[];
  isEmpty: boolean;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** The display name for a family member: its branch name, falling back to title. */
export function branchLabel(recipe: Recipe): string {
  return recipe.branchName?.trim() || recipe.title;
}

/**
 * Walk up the parent chain to the topmost recipe we can still resolve.
 * Deleted parents simply end the chain, so a branch whose parent is gone
 * becomes its own family root. Guards against cycles in corrupted data.
 */
export function getFamilyRoot(all: Recipe[], recipe: Recipe): Recipe {
  const byId = new Map(all.map(r => [r.id, r]));
  let current = recipe;
  const visited = new Set<string>([current.id]);
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    current = parent;
  }
  return current;
}

/**
 * The whole family of a recipe — the root plus every descendant, flattened in
 * depth-first order so it renders as an indented lineage list. Children are
 * ordered oldest-first (by addedAt) so the tree reads chronologically.
 * Returns a single node when the recipe has no relatives.
 */
export function getRecipeFamily(all: Recipe[], recipe: Recipe): FamilyNode[] {
  const root = getFamilyRoot(all, recipe);
  const childrenOf = new Map<string, Recipe[]>();
  for (const r of all) {
    if (!r.parentId) continue;
    const siblings = childrenOf.get(r.parentId);
    if (siblings) siblings.push(r);
    else childrenOf.set(r.parentId, [r]);
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => (a.addedAt ?? 0) - (b.addedAt ?? 0));
  }

  const nodes: FamilyNode[] = [];
  const visited = new Set<string>();
  const walk = (r: Recipe, depth: number) => {
    if (visited.has(r.id)) return;
    visited.add(r.id);
    nodes.push({ recipe: r, depth });
    for (const child of childrenOf.get(r.id) ?? []) walk(child, depth + 1);
  };
  walk(root, 0);
  return nodes;
}

/** The resolved parent of a branch, or null for roots and orphaned branches. */
export function getParentRecipe(all: Recipe[], recipe: Recipe): Recipe | null {
  if (!recipe.parentId) return null;
  return all.find(r => r.id === recipe.parentId) ?? null;
}

/**
 * What a branch changes relative to its base recipe. Ingredients are matched
 * by normalized name; steps first by identical description (unchanged), then
 * by title (changed), the remainder counting as added/removed. Heuristic, but
 * recipes are short lists — good enough to answer "what's different?".
 */
export function diffRecipes(base: Recipe, branch: Recipe): RecipeDiff {
  const baseIng = new Map(base.ingredients.map(i => [norm(i.name), i]));
  const branchIng = new Map(branch.ingredients.map(i => [norm(i.name), i]));

  const addedIngredients: Ingredient[] = [];
  const removedIngredients: Ingredient[] = [];
  const changedIngredients: RecipeDiff['changedIngredients'] = [];
  for (const [key, ing] of branchIng) {
    const prev = baseIng.get(key);
    if (!prev) addedIngredients.push(ing);
    else if (norm(prev.amount) !== norm(ing.amount)) {
      changedIngredients.push({ name: ing.name, from: prev.amount, to: ing.amount });
    }
  }
  for (const [key, ing] of baseIng) {
    if (!branchIng.has(key)) removedIngredients.push(ing);
  }

  const unmatchedBase = [...base.steps];
  const unmatchedBranch = [...branch.steps];
  // Pass 1: identical descriptions are the same step, wherever it moved.
  for (let i = unmatchedBranch.length - 1; i >= 0; i--) {
    const j = unmatchedBase.findIndex(s => norm(s.description) === norm(unmatchedBranch[i].description));
    if (j !== -1) {
      unmatchedBase.splice(j, 1);
      unmatchedBranch.splice(i, 1);
    }
  }
  // Pass 2: same title with a new description is a changed step.
  const changedSteps: RecipeDiff['changedSteps'] = [];
  for (let i = unmatchedBranch.length - 1; i >= 0; i--) {
    const j = unmatchedBase.findIndex(s => norm(s.title) === norm(unmatchedBranch[i].title));
    if (j !== -1) {
      changedSteps.push({ title: unmatchedBranch[i].title });
      unmatchedBase.splice(j, 1);
      unmatchedBranch.splice(i, 1);
    }
  }
  changedSteps.reverse();

  const changedMeta: RecipeDiff['changedMeta'] = [];
  const meta: [string, string | undefined, string | undefined][] = [
    ['Prep time', base.prepTime, branch.prepTime],
    ['Bake time', base.bakeTime, branch.bakeTime],
    ['Time', base.time, branch.time],
    ['Yields', base.yields, branch.yields],
    ['Difficulty', base.difficulty, branch.difficulty],
  ];
  for (const [label, from, to] of meta) {
    if (norm(from ?? '') !== norm(to ?? '')) {
      changedMeta.push({ label, from: from?.trim() || '—', to: to?.trim() || '—' });
    }
  }

  const diff: RecipeDiff = {
    addedIngredients,
    removedIngredients,
    changedIngredients,
    addedSteps: unmatchedBranch,
    removedSteps: unmatchedBase,
    changedSteps,
    changedMeta,
    isEmpty: false,
  };
  diff.isEmpty =
    addedIngredients.length === 0 &&
    removedIngredients.length === 0 &&
    changedIngredients.length === 0 &&
    diff.addedSteps.length === 0 &&
    diff.removedSteps.length === 0 &&
    changedSteps.length === 0 &&
    changedMeta.length === 0;
  return diff;
}

/**
 * The payload for a new branch of `source`: a full copy pointing back at its
 * parent, created as a draft so an abandoned branch never clutters the library
 * (it surfaces in Drafts, and publishing through the wizard clears the flag).
 */
export function buildBranchPayload(
  source: Recipe,
  opts: { branchName: string; branchNote?: string },
): Omit<Recipe, 'id'> {
  const { id: _id, addedAt: _addedAt, draft: _draft, ...rest } = source;
  return {
    ...rest,
    parentId: source.id,
    branchName: opts.branchName.trim(),
    branchNote: opts.branchNote?.trim() || undefined,
    draft: true,
  };
}
