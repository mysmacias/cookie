import { useCallback, useEffect, useMemo, useState } from 'react';
import { Recipe } from '../types';

export type Screen =
  | 'library'
  | 'discover'
  | 'detail'
  | 'cooking'
  | 'add'
  | 'about'
  | 'privacy'
  | 'exports'
  | 'shopping'
  | 'collections';

interface RouteState {
  screen: Screen;
  recipeId: string | null;
  editing: boolean;
}

function routeFromPath(pathname: string): RouteState {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { screen: 'library', recipeId: null, editing: false };
  if (parts[0] === 'discover') return { screen: 'discover', recipeId: null, editing: false };
  if (parts[0] === 'books') return { screen: 'exports', recipeId: null, editing: false };
  if (parts[0] === 'shopping') return { screen: 'shopping', recipeId: null, editing: false };
  if (parts[0] === 'collections') return { screen: 'collections', recipeId: null, editing: false };
  if (parts[0] === 'about') return { screen: 'about', recipeId: null, editing: false };
  if (parts[0] === 'privacy') return { screen: 'privacy', recipeId: null, editing: false };
  if (parts[0] === 'add') return { screen: 'add', recipeId: null, editing: false };
  if (parts[0] === 'recipe' && parts[1]) {
    if (parts[2] === 'cook') return { screen: 'cooking', recipeId: parts[1], editing: false };
    if (parts[2] === 'edit') return { screen: 'add', recipeId: parts[1], editing: true };
    return { screen: 'detail', recipeId: parts[1], editing: false };
  }
  return { screen: 'library', recipeId: null, editing: false };
}

function pathFor(screen: Screen, recipe?: Recipe | null): string {
  switch (screen) {
    case 'library': return '/';
    case 'discover': return '/discover';
    case 'exports': return '/books';
    case 'shopping': return '/shopping';
    case 'collections': return '/collections';
    case 'about': return '/about';
    case 'privacy': return '/privacy';
    case 'add': return recipe ? `/recipe/${encodeURIComponent(recipe.id)}/edit` : '/add';
    case 'detail': return recipe ? `/recipe/${encodeURIComponent(recipe.id)}` : '/';
    case 'cooking': return recipe ? `/recipe/${encodeURIComponent(recipe.id)}/cook` : '/';
    default: return '/';
  }
}

export function useNavigation() {
  const initialRoute = useMemo(() => routeFromPath(window.location.pathname), []);
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialRoute.screen);
  const [routeRecipeId, setRouteRecipeId] = useState<string | null>(initialRoute.recipeId);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const onPopState = () => {
      const next = routeFromPath(window.location.pathname);
      setCurrentScreen(next.screen);
      setRouteRecipeId(next.recipeId);
      if (!next.recipeId) {
        setSelectedRecipe(null);
        setEditingRecipe(null);
      }
      if (next.screen === 'cooking') setCurrentStepIndex(0);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = useCallback((screen: Screen, recipe?: Recipe) => {
    if (recipe) setSelectedRecipe(recipe);
    setRouteRecipeId(recipe?.id ?? null);
    setCurrentScreen(screen);
    window.history.pushState(null, '', pathFor(screen, recipe));
    window.scrollTo(0, 0);
  }, []);

  const startCooking = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRouteRecipeId(recipe.id);
    setCurrentStepIndex(0);
    setCurrentScreen('cooking');
    window.history.pushState(null, '', pathFor('cooking', recipe));
    window.scrollTo(0, 0);
  }, []);

  return {
    currentScreen,
    routeRecipeId,
    selectedRecipe,
    currentStepIndex,
    setCurrentStepIndex,
    navigateTo,
    setSelectedRecipe,
    startCooking,
    editingRecipe,
    setEditingRecipe,
  };
}
