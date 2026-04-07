import type { Recipe } from '../types';

export interface ExportOptions {
  includeHeroImage: boolean;
  includeStepPhotos: boolean;
  includeIngredientImages: boolean;
  includeChefNote: boolean;
  includeTags: boolean;
  /** For multi-recipe exports: append combined shopping list */
  appendShoppingList: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  includeHeroImage: true,
  includeStepPhotos: true,
  includeIngredientImages: true,
  includeChefNote: true,
  includeTags: true,
  appendShoppingList: true,
};

export interface ResolvedIngredientRef {
  name: string;
  amount: string;
}

export interface ExportStepModel {
  index: number;
  title: string;
  description: string;
  timerLabel?: string;
  linkedIngredients: ResolvedIngredientRef[];
  photo?: string;
}

export interface ExportRecipeModel {
  id: string;
  title: string;
  description: string;
  category: string;
  tags?: string[];
  isHeirloom?: boolean;
  image?: string;
  chefNote?: string;
  prepTime: string;
  bakeTime?: string;
  time: string;
  difficulty: string;
  yields?: string;
  ingredients: { name: string; amount: string; image?: string }[];
  steps: ExportStepModel[];
}

export interface NormalizedExportInput {
  recipe: Recipe;
  options: ExportOptions;
}
