import { Recipe } from '../types';

function ingredientMentionedInStep(ingredientName: string, stepTitle: string, stepDescription: string): boolean {
  const blob = `${stepTitle} ${stepDescription}`.toLowerCase();
  const name = ingredientName.toLowerCase().trim();
  if (!name || !blob) return false;
  if (blob.includes(name)) return true;
  const words = name.split(/\s+/).filter(w => w.length > 3);
  return words.some(w => blob.includes(w));
}

function recipeUsesExplicitIngredientSteps(recipe: Recipe): boolean {
  return recipe.steps.some(s => s.ingredientIndices != null && s.ingredientIndices.length > 0);
}

/**
 * Last step index where this ingredient is still needed (0-based).
 * After the user moves past that step, it can be crossed off.
 * Returns -1 if never associated with any step (stays active).
 */
export function getLastStepIndexUsingIngredient(recipe: Recipe, ingredientIndex: number): number {
  const ing = recipe.ingredients[ingredientIndex];
  if (!ing) return -1;

  if (recipeUsesExplicitIngredientSteps(recipe)) {
    let last = -1;
    recipe.steps.forEach((s, si) => {
      if (s.ingredientIndices?.includes(ingredientIndex)) last = Math.max(last, si);
    });
    return last;
  }

  let last = -1;
  recipe.steps.forEach((s, si) => {
    if (ingredientMentionedInStep(ing.name, s.title, s.description)) {
      last = Math.max(last, si);
    }
  });
  return last;
}

export function isIngredientCrossedOff(recipe: Recipe, ingredientIndex: number, currentStepIndex: number): boolean {
  const last = getLastStepIndexUsingIngredient(recipe, ingredientIndex);
  if (last < 0) return false;
  return currentStepIndex > last;
}

/**
 * Whether this ingredient is used in the given step (for highlighting in cooking mode).
 * Explicit ingredientIndices wins when any step defines them; per-step empty array falls back to text match.
 */
export function isIngredientActiveOnStep(recipe: Recipe, ingredientIndex: number, stepIndex: number): boolean {
  const ing = recipe.ingredients[ingredientIndex];
  const step = recipe.steps[stepIndex];
  if (!ing || !step) return false;

  if (recipeUsesExplicitIngredientSteps(recipe)) {
    const explicit = step.ingredientIndices;
    if (explicit != null && explicit.length > 0) {
      return explicit.includes(ingredientIndex);
    }
    return ingredientMentionedInStep(ing.name, step.title, step.description);
  }

  return ingredientMentionedInStep(ing.name, step.title, step.description);
}
