import { useState } from 'react';
import { Recipe } from '../types';

export type Screen =
  | 'library'
  | 'detail'
  | 'cooking'
  | 'add'
  | 'about'
  | 'privacy'
  | 'exports';

export function useNavigation() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('library');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  const navigateTo = (screen: Screen, recipe?: Recipe) => {
    if (recipe) setSelectedRecipe(recipe);
    setCurrentScreen(screen);
    window.scrollTo(0, 0);
  };

  const startCooking = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCurrentStepIndex(0);
    setCurrentScreen('cooking');
  };

  return {
    currentScreen,
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
