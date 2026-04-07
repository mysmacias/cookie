import type { Recipe } from '../types';
import type { ExportOptions, ExportRecipeModel, ExportStepModel, ResolvedIngredientRef } from './types';

/** Format seconds as a short human-readable timer label for print/export */
export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) {
    if (m > 0) return `${h} hr ${m} min`;
    return `${h} hr`;
  }
  if (m > 0 && rem > 0) return `${m} min ${rem} sec`;
  if (m > 0) return `${m} min`;
  return `${rem} sec`;
}

function resolveIngredientIndices(
  recipe: Recipe,
  indices: number[] | undefined
): ResolvedIngredientRef[] {
  if (!indices?.length) return [];
  const out: ResolvedIngredientRef[] = [];
  for (const i of indices) {
    const ing = recipe.ingredients[i];
    if (ing) out.push({ name: ing.name, amount: ing.amount });
  }
  return out;
}

export function normalizeRecipeForExport(recipe: Recipe, options: ExportOptions): ExportRecipeModel {
  const steps: ExportStepModel[] = recipe.steps.map((step, i) => {
    const linkedIngredients = resolveIngredientIndices(recipe, step.ingredientIndices);
    const timerLabel = step.timer ? formatDurationSeconds(step.timer) : undefined;
    return {
      index: i + 1,
      title: step.title,
      description: step.description,
      timerLabel: timerLabel || undefined,
      linkedIngredients,
      photo: options.includeStepPhotos ? step.photo : undefined,
    };
  });

  const ingredients = recipe.ingredients.map((ing) => ({
    name: ing.name,
    amount: ing.amount,
    image: options.includeIngredientImages ? ing.image : undefined,
  }));

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    category: recipe.category,
    tags: options.includeTags ? recipe.tags : undefined,
    isHeirloom: recipe.isHeirloom,
    image: options.includeHeroImage ? recipe.image : undefined,
    chefNote: options.includeChefNote ? recipe.chefNote : undefined,
    prepTime: recipe.prepTime,
    bakeTime: recipe.bakeTime,
    time: recipe.time,
    difficulty: recipe.difficulty,
    yields: recipe.yields,
    ingredients,
    steps,
  };
}

/** Naive flat list: every ingredient line from each recipe, in order (duplicates allowed) */
export function buildCombinedShoppingListLines(recipes: Recipe[]): string[] {
  const lines: string[] = [];
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      lines.push(`${ing.name} — ${ing.amount}`);
    }
  }
  return lines;
}
