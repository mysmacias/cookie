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
  /**
   * Cuisines this recipe belongs to ("where it's from"), multi-valued so fusion
   * dishes can list several (e.g. a ceviche tostada is Mexican + Peruvian).
   * Populated by normalizeRecipeTaxonomy at load; `category` mirrors cuisines[0]
   * for display/sort. Empty when the dish has no cuisine signal (e.g. cookies).
   */
  cuisines?: string[];
  /** Lowercase or mixed; matched case-insensitively in library search */
  tags?: string[];
  ingredients: Ingredient[];
  steps: Step[];
  chefNote?: string;
  isHeirloom?: boolean;
  /** Unix ms when the recipe was first added to the library */
  addedAt?: number;
  /** Original page URL when imported from the web */
  sourceUrl?: string;
}
