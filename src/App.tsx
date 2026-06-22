import { useState, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigation, Screen } from './hooks/useNavigation';
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
import { AuthScreen } from './screens/AuthScreen';
import { useRecipes } from './context/RecipeContext';
import { Recipe } from './types';

export default function App() {
  const auth = useAuth();
  const {
    currentScreen,
    selectedRecipe,
    currentStepIndex,
    setCurrentStepIndex,
    navigateTo: navTo,
    startCooking,
    setSelectedRecipe,
    editingRecipe,
    setEditingRecipe,
  } = useNavigation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const ctx = useRecipes();

  const navigateTo = useCallback((screen: Screen, recipe?: Recipe) => {
    if (screen === 'add' && recipe === undefined) {
      setEditingRecipe(null);
    }
    navTo(screen, recipe);
    setIsMenuOpen(false);
  }, [navTo, setEditingRecipe]);

  const openEditRecipe = useCallback(
    (recipe: Recipe) => {
      setEditingRecipe(recipe);
      navTo('add', recipe);
      setIsMenuOpen(false);
      window.scrollTo(0, 0);
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

  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant font-label uppercase tracking-widest text-sm">Loading…</p>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen bg-surface selection:bg-primary/20">
      <Header
        currentScreen={currentScreen}
        navigateTo={navigateTo}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
      />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {currentScreen === 'library' && (
            <LibraryScreen navigateTo={navigateTo} />
          )}

          {currentScreen === 'detail' && selectedRecipe && (
            <RecipeDetailScreen
              recipe={selectedRecipe}
              onBack={() => navigateTo('library')}
              onStartCooking={() => startCooking(selectedRecipe)}
              onEditRecipe={() => openEditRecipe(selectedRecipe)}
            />
          )}

          {currentScreen === 'cooking' && selectedRecipe && (
            <CookingModeScreen
              recipe={selectedRecipe}
              stepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              onExit={() => navigateTo('detail', selectedRecipe)}
              onRecipeSynced={handleCookingRecipeSynced}
            />
          )}

          {currentScreen === 'about' && (
            <SwipeBackWrapper onBack={() => navigateTo('library')}>
              <AboutScreen />
            </SwipeBackWrapper>
          )}

          {currentScreen === 'exports' && <ExportsScreen navigateTo={navigateTo} />}

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
    </div>
  );
}
