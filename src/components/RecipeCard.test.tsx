/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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
  afterEach(cleanup);

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

  it('opens the variations sheet without opening the recipe', () => {
    const onClick = vi.fn();
    const onOpenVariations = vi.fn();
    const { getByRole } = render(
      <RecipeCard
        recipe={recipe}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
        onRecipeImageChanged={vi.fn()}
        onClick={onClick}
        variationCount={2}
        onOpenVariations={onOpenVariations}
      />,
    );
    const pill = getByRole('button', { name: 'Show 2 variations of Test Soup' });
    fireEvent.click(pill);
    expect(onOpenVariations).toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides the variations pill when there are no variations', () => {
    const { queryByRole } = render(
      <RecipeCard
        recipe={recipe}
        isBookmarked={false}
        onToggleBookmark={vi.fn()}
        onRecipeImageChanged={vi.fn()}
        onClick={vi.fn()}
        variationCount={0}
        onOpenVariations={vi.fn()}
      />,
    );
    expect(queryByRole('button', { name: /variation/i })).toBeNull();
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
