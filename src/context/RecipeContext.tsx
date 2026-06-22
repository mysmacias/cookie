import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Recipe } from '../types';
import { useAuth, fetchUserData } from './AuthContext';
import {
  createRecipe,
  saveRecipe,
  toggleBookmarkApi,
  clearUserDataCache,
} from '../services/recipeApi';
import {
  getAllRecipes as storeGetAll,
  isBookmarked as storeIsBookmarked,
  getBookmarkedIds as storeBookmarkedIds,
} from '../services/recipeStore';

interface RecipeContextValue {
  recipes: Recipe[];
  bookmarkedIds: string[];
  isLoading: boolean;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  toggleBookmark: (id: string) => Promise<boolean>;
  isBookmarked: (id: string) => boolean;
  refreshRecipes: () => Promise<void>;
  version: number;
}

const RecipeContext = createContext<RecipeContextValue | null>(null);

export function useRecipes(): RecipeContextValue {
  const ctx = useContext(RecipeContext);
  if (!ctx) throw new Error('useRecipes must be used within RecipeProvider');
  return ctx;
}

export const RecipeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const syncFromCache = useCallback(() => {
    setRecipes(storeGetAll());
    setBookmarkedIds(storeBookmarkedIds());
    setVersion(v => v + 1);
  }, []);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      clearUserDataCache();
      setRecipes([]);
      setBookmarkedIds([]);
      return;
    }
    setIsLoading(true);
    try {
      await fetchUserData();
      syncFromCache();
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, syncFromCache]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    const created = await createRecipe(recipe);
    syncFromCache();
    return created;
  }, [syncFromCache]);

  const updateRecipe = useCallback(async (recipe: Recipe) => {
    await saveRecipe(recipe);
    syncFromCache();
  }, [syncFromCache]);

  const toggleBookmark = useCallback(async (id: string) => {
    const newState = await toggleBookmarkApi(id);
    setBookmarkedIds(storeBookmarkedIds());
    return newState;
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return storeIsBookmarked(id);
  }, [bookmarkedIds, version]);

  const value = useMemo<RecipeContextValue>(() => ({
    recipes,
    bookmarkedIds,
    isLoading,
    addRecipe,
    updateRecipe,
    toggleBookmark,
    isBookmarked,
    refreshRecipes: refresh,
    version,
  }), [recipes, bookmarkedIds, isLoading, addRecipe, updateRecipe, toggleBookmark, isBookmarked, refresh, version]);

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};
