export interface RecipePayload {
  id?: string;
  title: string;
  description: string;
  image?: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced' | 'Expert';
  time: string;
  prepTime: string;
  bakeTime?: string;
  yields?: string;
  category: string;
  tags?: string[];
  ingredients: { name: string; amount: string; image?: string }[];
  steps: {
    title: string;
    description: string;
    timer?: number;
    ingredientIndices?: number[];
    photo?: string;
  }[];
  chefNote?: string;
  isHeirloom?: boolean;
  sourceUrl?: string;
}

const DIFFICULTIES = new Set(['Easy', 'Medium', 'Advanced', 'Expert']);

export interface ShoppingListItemPayload {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
  recipeIds: string[];
  aisle?: string;
}

export interface MealPlanDayPayload {
  date: string;
  recipeIds: string[];
}

export interface MealPlanPayload {
  days: MealPlanDayPayload[];
}

export function parseCollectionName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const name = v.trim();
  if (!name || name.length > 120) return null;
  return name;
}

export function parseShoppingListItems(v: unknown): ShoppingListItemPayload[] | null {
  if (!Array.isArray(v)) return null;
  const items: ShoppingListItemPayload[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id.trim()) return null;
    if (typeof o.name !== 'string' || !o.name.trim() || o.name.length > 200) return null;
    if (typeof o.amount !== 'string' || o.amount.length > 200) return null;
    if (typeof o.checked !== 'boolean') return null;
    if (!Array.isArray(o.recipeIds) || !o.recipeIds.every((id): id is string => typeof id === 'string')) {
      return null;
    }
    items.push({
      id: o.id.trim(),
      name: o.name.trim(),
      amount: o.amount.trim(),
      checked: o.checked,
      recipeIds: o.recipeIds,
      aisle: typeof o.aisle === 'string' ? o.aisle.trim().slice(0, 80) : undefined,
    });
  }
  if (items.length > 500) return null;
  return items;
}

export function parseMealPlanPayload(v: unknown): MealPlanPayload | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.days)) return null;
  const days: MealPlanDayPayload[] = [];
  for (const day of o.days) {
    if (!day || typeof day !== 'object') return null;
    const d = day as Record<string, unknown>;
    if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return null;
    if (!Array.isArray(d.recipeIds) || !d.recipeIds.every((id): id is string => typeof id === 'string')) {
      return null;
    }
    days.push({ date: d.date, recipeIds: d.recipeIds.slice(0, 20) });
  }
  if (days.length > 60) return null;
  return { days };
}

export function parseRecipePayload(v: unknown): RecipePayload | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.title !== 'string' || !o.title.trim()) return null;
  if (typeof o.description !== 'string') return null;
  if (typeof o.prepTime !== 'string' || typeof o.time !== 'string') return null;
  if (typeof o.category !== 'string' || !o.category.trim()) return null;
  if (typeof o.difficulty !== 'string' || !DIFFICULTIES.has(o.difficulty)) return null;
  if (!Array.isArray(o.ingredients) || !Array.isArray(o.steps)) return null;

  const ingredients = o.ingredients.map(ing => {
    if (!ing || typeof ing !== 'object') return null;
    const i = ing as Record<string, unknown>;
    if (typeof i.name !== 'string' || typeof i.amount !== 'string') return null;
    return {
      name: i.name.trim(),
      amount: i.amount.trim(),
      image: typeof i.image === 'string' ? i.image : undefined,
    };
  });
  if (ingredients.some(i => i === null)) return null;

  const steps = o.steps.map(step => {
    if (!step || typeof step !== 'object') return null;
    const s = step as Record<string, unknown>;
    if (typeof s.title !== 'string' || typeof s.description !== 'string') return null;
    return {
      title: s.title.trim(),
      description: s.description.trim(),
      timer: typeof s.timer === 'number' && s.timer > 0 ? s.timer : undefined,
      ingredientIndices: Array.isArray(s.ingredientIndices)
        ? s.ingredientIndices.filter((n): n is number => typeof n === 'number')
        : undefined,
      photo: typeof s.photo === 'string' ? s.photo : undefined,
    };
  });
  if (steps.some(s => s === null)) return null;

  return {
    id: typeof o.id === 'string' ? o.id : undefined,
    title: o.title.trim(),
    description: o.description,
    image: typeof o.image === 'string' ? o.image : '',
    difficulty: o.difficulty as RecipePayload['difficulty'],
    time: o.time,
    prepTime: o.prepTime,
    bakeTime: typeof o.bakeTime === 'string' ? o.bakeTime : undefined,
    yields: typeof o.yields === 'string' ? o.yields : undefined,
    category: o.category.trim(),
    tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : undefined,
    ingredients: ingredients as RecipePayload['ingredients'],
    steps: steps as RecipePayload['steps'],
    chefNote: typeof o.chefNote === 'string' ? o.chefNote : undefined,
    isHeirloom: o.isHeirloom === true,
    sourceUrl: typeof o.sourceUrl === 'string' && o.sourceUrl.trim() ? o.sourceUrl.trim() : undefined,
  };
}
