import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Recipe } from '../types';
import {
  getAllRecipes as storeGetAll,
  addRecipe as storeAdd,
  updateRecipe as storeUpdate,
  getBookmarkedIds as storeBookmarkedIds,
  toggleBookmark as storeToggle,
  isBookmarked as storeIsBookmarked,
} from '../services/recipeStore';

interface RecipeContextValue {
  recipes: Recipe[];
  bookmarkedIds: string[];
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Recipe;
  updateRecipe: (recipe: Recipe) => void;
  toggleBookmark: (id: string) => boolean;
  isBookmarked: (id: string) => boolean;
  refreshRecipes: () => void;
  /** Monotonically increasing version used by legacy consumers during transition */
  version: number;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipeProvider');
  return ctx;
}

export const RecipeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>(() => storeGetAll());
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => storeBookmarkedIds());
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => {
    setRecipes(storeGetAll());
    setBookmarkedIds(storeBookmarkedIds());
    setVersion(v => v + 1);
  }, []);

  const addRecipe = useCallback((recipe: Omit<Recipe, 'id'>) => {
    const created = storeAdd(recipe);
    refresh();
    return created;
  }, [refresh]);

  const updateRecipe = useCallback((recipe: Recipe) => {
    storeUpdate(recipe);
    refresh();
  }, [refresh]);

  const toggleBookmark = useCallback((id: string) => {
    const newState = storeToggle(id);
    setBookmarkedIds(storeBookmarkedIds());
    return newState;
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return storeIsBookmarked(id);
  }, []);

  const value = useMemo<RecipeContextValue>(() => ({
    recipes,
    bookmarkedIds,
    addRecipe,
    updateRecipe,
    toggleBookmark,
    isBookmarked,
    refreshRecipes: refresh,
    version,
  }), [recipes, bookmarkedIds, addRecipe, updateRecipe, toggleBookmark, isBookmarked, refresh, version]);

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};
