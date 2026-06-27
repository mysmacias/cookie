import type { RecipeApiRecipe } from './recipeapi';

type CookieDifficulty = 'Easy' | 'Medium' | 'Advanced' | 'Expert';

export interface CookieRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  difficulty: CookieDifficulty;
  time: string;
  prepTime: string;
  bakeTime?: string;
  yields?: string;
  category: string;
  tags?: string[];
  ingredients: { name: string; amount: string }[];
  steps: { title: string; description: string }[];
  addedAt?: number;
}

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
}

function mapDifficulty(difficulty: string): CookieDifficulty {
  const d = difficulty.toLowerCase();
  if (d === 'easy') return 'Easy';
  if (d === 'medium') return 'Medium';
  if (d === 'hard' || d === 'advanced') return 'Advanced';
  return 'Expert';
}

function formatCategory(mealType: string): string {
  if (!mealType) return 'Imported';
  return mealType
    .split(/[_\s-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatIngredientAmount(quantity: number, unit: string): string {
  const q = Number.isInteger(quantity) ? String(quantity) : String(quantity);
  return unit ? `${q} ${unit}` : q;
}

function buildTags(recipe: RecipeApiRecipe): string[] {
  const tags = new Set<string>();
  if (recipe.cuisine) tags.add(recipe.cuisine.replace(/_/g, ' '));
  if (recipe.meal_type) tags.add(recipe.meal_type.replace(/_/g, ' '));
  for (const tag of recipe.dietary_tags ?? []) {
    tags.add(tag.replace(/_/g, ' '));
  }
  return [...tags];
}

export function mapRecipeApiToCookie(recipe: RecipeApiRecipe): CookieRecipe {
  const totalMins = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return {
    id: `api_${recipe.id}`,
    title: recipe.name,
    description: recipe.description,
    image: '',
    difficulty: mapDifficulty(recipe.difficulty),
    time: formatMinutes(totalMins) || formatMinutes(recipe.cook_time) || '—',
    prepTime: formatMinutes(recipe.prep_time) || '—',
    bakeTime: recipe.cook_time > 0 ? formatMinutes(recipe.cook_time) : undefined,
    yields: recipe.servings ? `${recipe.servings} servings` : undefined,
    category: formatCategory(recipe.meal_type),
    tags: buildTags(recipe),
    ingredients: (recipe.ingredients ?? []).map(ing => ({
      name: ing.name,
      amount: formatIngredientAmount(ing.quantity, ing.unit),
    })),
    steps: (recipe.instructions ?? []).map((text, i) => ({
      title: `Step ${i + 1}`,
      description: text,
    })),
    addedAt: Date.now(),
  };
}
