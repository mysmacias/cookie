import { useCallback, useEffect, useMemo, useState } from 'react';
import { Recipe } from '../types';
import {
  clearActiveCookPlan,
  loadActiveCookPlan,
  saveActiveCookPlan,
  type CookPlan,
} from '../utils/recipeScheduler';

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
  | 'collections'
  | 'collection-detail'
  | 'graph'
  | 'cook-plan'
  | 'cook-plan-mode'
  | 'settings'
  | 'meal-plan'
  | 'share';

interface RouteState {
  screen: Screen;
  recipeId: string | null;
  graphFocusId: string | null;
  cookPlanRecipeIds: string[];
  collectionId: string | null;
  shareToken: string | null;
  editing: boolean;
}

const SCREEN_TITLES: Record<Screen, string> = {
  library: 'The Library',
  discover: 'Discover',
  detail: 'Recipe',
  cooking: 'Cooking',
  add: 'Add Recipe',
  about: 'About',
  privacy: 'Privacy',
  exports: 'My books',
  shopping: 'Shopping list',
  collections: 'Collections',
  'collection-detail': 'Collection',
  graph: 'Recipe graph',
  'cook-plan': 'Cook plan',
  'cook-plan-mode': 'Cook plan',
  settings: 'Settings',
  'meal-plan': 'Meal plan',
  share: 'Shared recipe',
};

function routeFromLocation(pathname: string, search: string): RouteState {
  const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(search);
  const focus = params.get('focus')?.trim() || null;
  const recipeIds = params.get('recipes')?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  if (parts.length === 0) return { screen: 'library', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'discover') return { screen: 'discover', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'books') return { screen: 'exports', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'shopping') return { screen: 'shopping', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'settings') return { screen: 'settings', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'meal-plan') return { screen: 'meal-plan', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'collections' && parts[1]) {
    return { screen: 'collection-detail', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: parts[1], shareToken: null, editing: false };
  }
  if (parts[0] === 'collections') return { screen: 'collections', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'share' && parts[1]) {
    return { screen: 'share', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: parts[1], editing: false };
  }
  if (parts[0] === 'graph') return { screen: 'graph', recipeId: null, graphFocusId: focus, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'cook-plan') {
    if (parts[1] === 'cook') {
      return { screen: 'cook-plan-mode', recipeId: null, graphFocusId: null, cookPlanRecipeIds: recipeIds, collectionId: null, shareToken: null, editing: false };
    }
    return { screen: 'cook-plan', recipeId: null, graphFocusId: null, cookPlanRecipeIds: recipeIds, collectionId: null, shareToken: null, editing: false };
  }
  if (parts[0] === 'about') return { screen: 'about', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'privacy') return { screen: 'privacy', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'add') return { screen: 'add', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  if (parts[0] === 'recipe' && parts[1]) {
    if (parts[2] === 'cook') return { screen: 'cooking', recipeId: parts[1], graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
    if (parts[2] === 'edit') return { screen: 'add', recipeId: parts[1], graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: true };
    return { screen: 'detail', recipeId: parts[1], graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
  }
  return { screen: 'library', recipeId: null, graphFocusId: null, cookPlanRecipeIds: [], collectionId: null, shareToken: null, editing: false };
}

function pathFor(
  screen: Screen,
  recipe?: Recipe | null,
  cookPlanRecipeIds?: string[],
  collectionId?: string | null,
  shareToken?: string | null,
): string {
  switch (screen) {
    case 'library': return '/';
    case 'discover': return '/discover';
    case 'exports': return '/books';
    case 'shopping': return '/shopping';
    case 'settings': return '/settings';
    case 'meal-plan': return '/meal-plan';
    case 'collections': return '/collections';
    case 'collection-detail':
      return collectionId ? `/collections/${encodeURIComponent(collectionId)}` : '/collections';
    case 'share':
      return shareToken ? `/share/${encodeURIComponent(shareToken)}` : '/';
    case 'graph':
      return recipe
        ? `/graph?focus=${encodeURIComponent(recipe.id)}`
        : '/graph';
    case 'cook-plan': {
      const ids = cookPlanRecipeIds?.filter(Boolean) ?? [];
      return ids.length > 0
        ? `/cook-plan?recipes=${ids.map(encodeURIComponent).join(',')}`
        : '/cook-plan';
    }
    case 'cook-plan-mode': {
      const ids = cookPlanRecipeIds?.filter(Boolean) ?? [];
      return ids.length > 0
        ? `/cook-plan/cook?recipes=${ids.map(encodeURIComponent).join(',')}`
        : '/cook-plan/cook';
    }
    case 'about': return '/about';
    case 'privacy': return '/privacy';
    case 'add': return recipe ? `/recipe/${encodeURIComponent(recipe.id)}/edit` : '/add';
    case 'detail': return recipe ? `/recipe/${encodeURIComponent(recipe.id)}` : '/';
    case 'cooking': return recipe ? `/recipe/${encodeURIComponent(recipe.id)}/cook` : '/';
    default: return '/';
  }
}

function focusMain(): void {
  requestAnimationFrame(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  });
}

export function useNavigation() {
  const initialRoute = useMemo(
    () => routeFromLocation(window.location.pathname, window.location.search),
    [],
  );
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialRoute.screen);
  const [routeRecipeId, setRouteRecipeId] = useState<string | null>(initialRoute.recipeId);
  const [graphFocusId, setGraphFocusId] = useState<string | null>(initialRoute.graphFocusId);
  const [collectionId, setCollectionId] = useState<string | null>(initialRoute.collectionId);
  const [shareToken, setShareToken] = useState<string | null>(initialRoute.shareToken);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cookPlanTaskIndex, setCookPlanTaskIndex] = useState(0);
  const [cookPlanRecipeIds, setCookPlanRecipeIds] = useState<string[]>(initialRoute.cookPlanRecipeIds);
  const [activeCookPlan, setActiveCookPlan] = useState<CookPlan | null>(() => loadActiveCookPlan()?.plan ?? null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const applyRoute = useCallback((next: RouteState) => {
    setCurrentScreen(next.screen);
    setRouteRecipeId(next.recipeId);
    setGraphFocusId(next.graphFocusId);
    setCookPlanRecipeIds(next.cookPlanRecipeIds);
    setCollectionId(next.collectionId);
    setShareToken(next.shareToken);
    if (!next.recipeId) {
      setSelectedRecipe(null);
      setEditingRecipe(null);
    }
    if (next.screen === 'cooking') setCurrentStepIndex(0);
    if (next.screen === 'cook-plan-mode') {
      setCookPlanTaskIndex(0);
      setActiveCookPlan(loadActiveCookPlan()?.plan ?? null);
    }
    document.title = `${SCREEN_TITLES[next.screen]} · COOKIE`;
    window.scrollTo(0, 0);
    focusMain();
  }, []);

  useEffect(() => {
    document.title = `${SCREEN_TITLES[initialRoute.screen]} · COOKIE`;
  }, [initialRoute.screen]);

  useEffect(() => {
    const onPopState = () => {
      applyRoute(routeFromLocation(window.location.pathname, window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [applyRoute]);

  const navigateTo = useCallback((
    screen: Screen,
    recipe?: Recipe,
    cookPlanIds?: string[],
    options?: { collectionId?: string; shareToken?: string },
  ) => {
    if (recipe) setSelectedRecipe(recipe);
    setRouteRecipeId(recipe?.id ?? null);
    setGraphFocusId(screen === 'graph' && recipe ? recipe.id : null);
    if (screen === 'cook-plan' || screen === 'cook-plan-mode') {
      setCookPlanRecipeIds(cookPlanIds ?? []);
    }
    if (options?.collectionId !== undefined) setCollectionId(options.collectionId);
    if (options?.shareToken !== undefined) setShareToken(options.shareToken);
    setCurrentScreen(screen);
    window.history.pushState(
      null,
      '',
      pathFor(screen, recipe, cookPlanIds, options?.collectionId ?? collectionId, options?.shareToken ?? shareToken),
    );
    document.title = `${SCREEN_TITLES[screen]} · COOKIE`;
    window.scrollTo(0, 0);
    focusMain();
  }, [collectionId, shareToken]);

  const navigateToCollection = useCallback((id: string) => {
    navigateTo('collection-detail', undefined, undefined, { collectionId: id });
  }, [navigateTo]);

  const navigateToCookPlan = useCallback((recipeIds?: string[]) => {
    navigateTo('cook-plan', undefined, recipeIds);
  }, [navigateTo]);

  const startCookPlanMode = useCallback((plan: CookPlan, recipeIds: string[]) => {
    saveActiveCookPlan(plan, recipeIds);
    setActiveCookPlan(plan);
    setCookPlanRecipeIds(recipeIds);
    setCookPlanTaskIndex(0);
    setCurrentScreen('cook-plan-mode');
    window.history.pushState(null, '', pathFor('cook-plan-mode', null, recipeIds));
    document.title = `${SCREEN_TITLES['cook-plan-mode']} · COOKIE`;
    window.scrollTo(0, 0);
    focusMain();
  }, []);

  const exitCookPlanMode = useCallback(() => {
    clearActiveCookPlan();
    setActiveCookPlan(null);
    navigateTo('cook-plan', undefined, cookPlanRecipeIds);
  }, [navigateTo, cookPlanRecipeIds]);

  const startCooking = useCallback((recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setRouteRecipeId(recipe.id);
    setCurrentStepIndex(0);
    setCurrentScreen('cooking');
    window.history.pushState(null, '', pathFor('cooking', recipe));
    document.title = `${SCREEN_TITLES.cooking} · COOKIE`;
    window.scrollTo(0, 0);
    focusMain();
  }, []);

  return {
    currentScreen,
    routeRecipeId,
    graphFocusId,
    collectionId,
    shareToken,
    cookPlanRecipeIds,
    activeCookPlan,
    cookPlanTaskIndex,
    setCookPlanTaskIndex,
    selectedRecipe,
    currentStepIndex,
    setCurrentStepIndex,
    navigateTo,
    navigateToCollection,
    navigateToCookPlan,
    startCookPlanMode,
    exitCookPlanMode,
    setSelectedRecipe,
    startCooking,
    editingRecipe,
    setEditingRecipe,
  };
}

export function isResetPasswordRoute(): boolean {
  return window.location.pathname === '/reset' || window.location.pathname === '/reset/';
}

export function isShareRoute(): { token: string } | null {
  const parts = window.location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'share' && parts[1]) return { token: decodeURIComponent(parts[1]) };
  return null;
}
