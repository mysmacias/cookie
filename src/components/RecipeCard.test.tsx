/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RecipeCard } from './RecipeCard';
import type { Recipe } from '../types';

vi.mock('../context/RecipeContext', () => ({
  useRecipes: () => ({
    updateRecipe: vi.fn(),
  }),
}));

vi.mock('../hooks/useImagePicker', () => ({
  useImagePicker: () => ({
    galleryInputRef: { current: null },
    cameraInputRef: { current: null },
    handleFileChange: vi.fn(),
    openLibrary: vi.fn(),
    openCamera: vi.fn(),
  }),
}));

const recipe: Recipe = {
  id: 'r1',
  title: 'Test Soup',
  description: 'Warm and cozy',
  image: '',
  difficulty: 'Easy',
  time: '30m',
  prepTime: '10m',
  category: 'Soup',
  ingredients: [],
  steps: [],
};

describe('RecipeCard', () => {
  it('opens recipe on Enter key', () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <RecipeCard
        recipe={recipe}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
        onRecipeImageChanged={vi.fn()}
        onClick={onClick}
      />,
    );
    const card = getByRole('link', { name: 'Open Test Soup' });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  it('has link role and tab index', () => {
    const { getByRole } = render(
      <RecipeCard
        recipe={recipe}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
        onRecipeImageChanged={vi.fn()}
        onClick={vi.fn()}
      />,
    );
    const card = getByRole('link', { name: 'Open Test Soup' });
    expect(card.getAttribute('tabindex')).toBe('0');
  });
});
