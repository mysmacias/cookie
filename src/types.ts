export interface Ingredient {
  name: string;
  amount: string;
  image?: string;
}

export interface Step {
  title: string;
  description: string;
  timer?: number; // in seconds
  /** Indices into recipe.ingredients used in this step; when set on any step, explicit mode wins for crossing off */
  ingredientIndices?: number[];
  /** User-attached photo for this step (e.g. how it looked last time), data URL or remote URL */
  photo?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced' | 'Expert';
  time: string;
  prepTime: string;
  bakeTime?: string;
  yields?: string;
  category: string;
  /** Lowercase or mixed; matched case-insensitively in library search */
  tags?: string[];
  ingredients: Ingredient[];
  steps: Step[];
  chefNote?: string;
  isHeirloom?: boolean;
  /** Unix ms when the recipe was first added to the library */
  addedAt?: number;
}
