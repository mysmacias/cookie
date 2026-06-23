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
}

const DIFFICULTIES = new Set(['Easy', 'Medium', 'Advanced', 'Expert']);

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
  };
}
