import { useState, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { useNavigation, Screen } from './hooks/useNavigation';
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
import { getAllRecipes } from './services/recipeStore';
import { Recipe } from './types';

export default function App() {
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
  const [recipeCatalogVersion, setRecipeCatalogVersion] = useState(0);

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
    [navTo, setEditingRecipe]
  );

  const handleAddRecipeBack = useCallback(() => {
    const wasEditing = editingRecipe !== null;
    const recipeForDetail = selectedRecipe;
    setEditingRecipe(null);
    if (wasEditing && recipeForDetail) {
      navTo('detail', recipeForDetail);
    } else {
      navTo('library');
    }
  }, [editingRecipe, selectedRecipe, navTo, setEditingRecipe]);

  const handleRecipesSaved = useCallback(() => {
    setRecipeCatalogVersion(v => v + 1);
    if (editingRecipe && selectedRecipe?.id === editingRecipe.id) {
      const fresh = getAllRecipes().find(r => r.id === editingRecipe.id);
      if (fresh) setSelectedRecipe(fresh);
    }
  }, [editingRecipe, selectedRecipe, setSelectedRecipe]);

  const handleCookingRecipeSynced = useCallback(() => {
    setSelectedRecipe(prev => {
      if (!prev) return prev;
      const fresh = getAllRecipes().find(r => r.id === prev.id);
      return fresh ?? prev;
    });
  }, [setSelectedRecipe]);

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
            <LibraryScreen navigateTo={navigateTo} recipeCatalogVersion={recipeCatalogVersion} />
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
              onSaved={handleRecipesSaved}
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
