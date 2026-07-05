import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Recipe } from '../types';
import { useAuth, fetchUserData } from './AuthContext';
import {
  createRecipe,
  saveRecipe,
  deleteRecipe as deleteRecipeApi,
  duplicateRecipe as duplicateRecipeApi,
  toggleBookmarkApi,
  clearUserDataCache,
  loadGuestData,
} from '../services/recipeApi';
import {
  getAllRecipes as storeGetAll,
  getDraftRecipes as storeGetDrafts,
  isBookmarked as storeIsBookmarked,
  getBookmarkedIds as storeBookmarkedIds,
} from '../services/recipeStore';
import { buildBranchPayload } from '../utils/recipeBranch';

interface RecipeContextValue {
  recipes: Recipe[];
  drafts: Recipe[];
  bookmarkedIds: string[];
  isLoading: boolean;
  addRecipe: (recipe: Omit<Recipe, 'id'>) => Promise<Recipe>;
  updateRecipe: (recipe: Recipe) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  duplicateRecipe: (id: string) => Promise<Recipe>;
  /** Create a draft branch (variation) of a recipe; publish it via the wizard */
  branchRecipe: (source: Recipe, opts: { branchName: string; branchNote?: string }) => Promise<Recipe>;
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
  const { isAuthenticated, isGuest } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [drafts, setDrafts] = useState<Recipe[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);

  const syncFromCache = useCallback(() => {
    setRecipes(storeGetAll());
    setDrafts(storeGetDrafts());
    setBookmarkedIds(storeBookmarkedIds());
    setVersion(v => v + 1);
  }, []);

  const refresh = useCallback(async () => {
    if (isGuest) {
      loadGuestData();
      syncFromCache();
      return;
    }
    if (!isAuthenticated) {
      clearUserDataCache();
      setRecipes([]);
      setDrafts([]);
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
  }, [isAuthenticated, isGuest, syncFromCache]);

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

  const deleteRecipe = useCallback(async (id: string) => {
    await deleteRecipeApi(id);
    syncFromCache();
  }, [syncFromCache]);

  const duplicateRecipe = useCallback(async (id: string) => {
    const source = storeGetAll().find(r => r.id === id);
    const created = await duplicateRecipeApi(id, source);
    syncFromCache();
    return created;
  }, [syncFromCache]);

  const branchRecipe = useCallback(async (source: Recipe, opts: { branchName: string; branchNote?: string }) => {
    const created = await createRecipe(buildBranchPayload(source, opts));
    syncFromCache();
    return created;
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
    drafts,
    bookmarkedIds,
    isLoading,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    duplicateRecipe,
    branchRecipe,
    toggleBookmark,
    isBookmarked,
    refreshRecipes: refresh,
    version,
  }), [recipes, drafts, bookmarkedIds, isLoading, addRecipe, updateRecipe, deleteRecipe, duplicateRecipe, branchRecipe, toggleBookmark, isBookmarked, refresh, version]);

  return (
    <RecipeContext.Provider value={value}>
      {children}
    </RecipeContext.Provider>
  );
};
