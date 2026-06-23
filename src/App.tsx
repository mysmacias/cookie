import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigation, Screen, isResetPasswordRoute } from './hooks/useNavigation';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LibraryScreen } from './screens/LibraryScreen';
import { RecipeDetailScreen } from './screens/RecipeDetailScreen';
import { CookingModeScreen } from './screens/CookingModeScreen';
import { AboutScreen } from './screens/AboutScreen';
import { SwipeBackWrapper } from './components/SwipeBackWrapper';
import { AddRecipeScreen } from './screens/AddRecipeScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { ExportsScreen } from './screens/ExportsScreen';
import { DiscoverRecipesScreen } from './screens/DiscoverRecipesScreen';
import { ShoppingListScreen } from './screens/ShoppingListScreen';
import { CollectionsScreen } from './screens/CollectionsScreen';
import { CollectionDetailScreen } from './screens/CollectionDetailScreen';
import { RecipeGraphScreen } from './screens/RecipeGraphScreen';
import { CookPlanScreen } from './screens/CookPlanScreen';
import { CookPlanModeScreen } from './screens/CookPlanModeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { MealPlanScreen } from './screens/MealPlanScreen';
import { ShareRecipeScreen } from './screens/ShareRecipeScreen';
import { ResetPasswordScreen } from './screens/ResetPasswordScreen';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingModal, useOnboarding } from './components/OnboardingModal';
import { RecipeCardSkeleton } from './components/RecipeCardSkeleton';
import { useRecipes } from './context/RecipeContext';
import { Recipe } from './types';

export default function App() {
  const auth = useAuth();
  const {
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
    navigateTo: navTo,
    navigateToCollection,
    navigateToCookPlan,
    startCookPlanMode,
    exitCookPlanMode,
    startCooking,
    setSelectedRecipe,
    editingRecipe,
    setEditingRecipe,
  } = useNavigation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const ctx = useRecipes();
  const { showOnboarding, dismissOnboarding } = useOnboarding();

  useEffect(() => {
    if (!routeRecipeId || ctx.recipes.length === 0) return;
    const recipe = ctx.recipes.find(r => r.id === routeRecipeId);
    if (!recipe) return;
    setSelectedRecipe(recipe);
    if (window.location.pathname.endsWith('/edit')) {
      setEditingRecipe(recipe);
    }
  }, [routeRecipeId, ctx.recipes, setSelectedRecipe, setEditingRecipe]);

  const navigateTo = useCallback((
    screen: Screen,
    recipe?: Recipe,
    cookPlanIds?: string[],
    options?: { collectionId?: string; shareToken?: string },
  ) => {
    if (screen === 'add' && recipe === undefined) {
      setEditingRecipe(null);
    }
    navTo(screen, recipe, cookPlanIds, options);
    setIsMenuOpen(false);
  }, [navTo, setEditingRecipe]);

  const openEditRecipe = useCallback(
    (recipe: Recipe) => {
      setEditingRecipe(recipe);
      navTo('add', recipe);
      setIsMenuOpen(false);
    },
    [navTo, setEditingRecipe],
  );

  const handleAddRecipeBack = useCallback(() => {
    const wasEditing = editingRecipe !== null;
    const recipeForDetail = selectedRecipe;
    setEditingRecipe(null);
    if (wasEditing && recipeForDetail) {
      const fresh = ctx.recipes.find(r => r.id === recipeForDetail.id);
      navTo('detail', fresh ?? recipeForDetail);
    } else {
      navTo('library');
    }
  }, [editingRecipe, selectedRecipe, navTo, setEditingRecipe, ctx.recipes]);

  const handleCookingRecipeSynced = useCallback(() => {
    setSelectedRecipe(prev => {
      if (!prev) return prev;
      const fresh = ctx.recipes.find(r => r.id === prev.id);
      return fresh ?? prev;
    });
  }, [setSelectedRecipe, ctx.recipes]);

  if (isResetPasswordRoute()) {
    return (
      <ResetPasswordScreen
        onDone={() => {
          window.history.replaceState(null, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  if (currentScreen === 'share' && shareToken && !auth.isAuthenticated) {
    return (
      <ShareRecipeScreen
        token={shareToken}
        onSignIn={() => {
          window.history.replaceState(null, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6" aria-busy="true">
        <main id="main" tabIndex={-1} className="outline-none w-full max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
            <RecipeCardSkeleton />
          </div>
        </main>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <AuthScreen />;
  }

  const needsRecipe =
    (currentScreen === 'detail' || currentScreen === 'cooking') && routeRecipeId;
  const recipeResolved = selectedRecipe ?? (routeRecipeId
    ? ctx.recipes.find(r => r.id === routeRecipeId) ?? null
    : null);

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:rounded-full focus:bg-primary focus:text-on-primary focus:text-sm focus:font-label focus:uppercase focus:tracking-widest"
      >
        Skip to main content
      </a>

      <Header
        currentScreen={currentScreen}
        navigateTo={navigateTo}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <main id="main" tabIndex={-1} className="max-w-7xl mx-auto px-6 py-12 outline-none">
        <AnimatePresence mode="wait">
          {currentScreen === 'library' && (
            <LibraryScreen
              navigateTo={navigateTo}
              startCooking={startCooking}
              onCookTogether={ids => navigateToCookPlan(ids)}
            />
          )}

          {currentScreen === 'discover' && (
            <DiscoverRecipesScreen navigateTo={navigateTo} />
          )}

          {currentScreen === 'detail' && recipeResolved && (
            <RecipeDetailScreen
              recipe={recipeResolved}
              onBack={() => navigateTo('library')}
              onStartCooking={() => startCooking(recipeResolved)}
              onEditRecipe={() => openEditRecipe(recipeResolved)}
              onFindSimilar={() => navigateTo('graph', recipeResolved)}
              navigateTo={navigateTo}
            />
          )}

          {currentScreen === 'detail' && needsRecipe && !recipeResolved && (
            <div className="text-center py-20 text-on-surface-variant">
              <p className="font-headline italic text-2xl mb-4">Recipe not found</p>
              <button
                type="button"
                onClick={() => navigateTo('library')}
                className="text-sm font-label uppercase tracking-widest text-primary"
              >
                Back to Library
              </button>
            </div>
          )}

          {currentScreen === 'cooking' && recipeResolved && (
            <CookingModeScreen
              recipe={recipeResolved}
              stepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              onExit={() => navigateTo('detail', recipeResolved)}
              onRecipeSynced={handleCookingRecipeSynced}
              navigateTo={navigateTo}
            />
          )}

          {currentScreen === 'about' && (
            <SwipeBackWrapper onBack={() => navigateTo('library')}>
              <AboutScreen />
            </SwipeBackWrapper>
          )}

          {currentScreen === 'exports' && <ExportsScreen navigateTo={navigateTo} />}

          {currentScreen === 'shopping' && <ShoppingListScreen navigateTo={navigateTo} />}

          {currentScreen === 'collections' && (
            <CollectionsScreen navigateTo={navigateTo} onOpenCollection={navigateToCollection} />
          )}

          {currentScreen === 'collection-detail' && collectionId && (
            <CollectionDetailScreen
              collectionId={collectionId}
              navigateTo={navigateTo}
              startCooking={startCooking}
              onCookTogether={ids => navigateToCookPlan(ids)}
            />
          )}

          {currentScreen === 'settings' && <SettingsScreen navigateTo={navigateTo} />}

          {currentScreen === 'meal-plan' && <MealPlanScreen navigateTo={navigateTo} />}

          {currentScreen === 'share' && shareToken && (
            <ShareRecipeScreen
              token={shareToken}
              onSignIn={() => navigateTo('library')}
            />
          )}

          {currentScreen === 'graph' && (
            <RecipeGraphScreen
              navigateTo={navigateTo}
              startCooking={startCooking}
              focusRecipeId={graphFocusId}
              onCookTogether={ids => navigateToCookPlan(ids)}
            />
          )}

          {currentScreen === 'cook-plan' && (
            <CookPlanScreen
              navigateTo={navigateTo}
              initialRecipeIds={cookPlanRecipeIds}
              onStartCookPlan={startCookPlanMode}
            />
          )}

          {currentScreen === 'cook-plan-mode' && activeCookPlan && (
            <CookPlanModeScreen
              plan={activeCookPlan}
              taskIndex={cookPlanTaskIndex}
              onTaskChange={setCookPlanTaskIndex}
              onExit={exitCookPlanMode}
            />
          )}

          {currentScreen === 'cook-plan-mode' && !activeCookPlan && (
            <div className="text-center py-20 text-on-surface-variant">
              <p className="font-headline italic text-2xl mb-4">No active cook plan</p>
              <button
                type="button"
                onClick={() => navigateToCookPlan(cookPlanRecipeIds)}
                className="text-sm font-label uppercase tracking-widest text-primary"
              >
                Build a plan
              </button>
            </div>
          )}

          {currentScreen === 'add' && (
            <AddRecipeScreen
              editingRecipe={editingRecipe}
              onBack={handleAddRecipeBack}
              onSaved={ctx.refreshRecipes}
            />
          )}

          {currentScreen === 'privacy' && (
            <PrivacyScreen onBack={() => navigateTo('library')} />
          )}
        </AnimatePresence>
      </main>

      <Footer navigateTo={navigateTo} />
      <OnboardingModal open={showOnboarding} onClose={dismissOnboarding} />
    </div>
  );
}
