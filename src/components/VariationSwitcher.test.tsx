/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { VariationSwitcher } from './VariationSwitcher';
import type { Recipe } from '../types';

function makeRecipe(overrides: Partial<Recipe> & Pick<Recipe, 'id' | 'title'>): Recipe {
  return {
    description: '',
    image: '',
    difficulty: 'Easy',
    time: '30 min',
    prepTime: '30 min',
    category: 'Dessert',
    ingredients: [],
    steps: [],
    ...overrides,
  };
}

const root = makeRecipe({ id: 'r1', title: "Abuela's flan", addedAt: 100 });
const branch = makeRecipe({ id: 'r2', title: "Abuela's flan", parentId: 'r1', branchName: 'Less sugar', addedAt: 200 });
const draft = makeRecipe({ id: 'r3', title: "Abuela's flan", parentId: 'r1', branchName: 'Coconut', draft: true, addedAt: 300 });
const all = [root, branch, draft];

describe('VariationSwitcher', () => {
  afterEach(cleanup);

  it('renders one chip per family member with the current one disabled', () => {
    const { getByRole } = render(
      <VariationSwitcher recipe={branch} allRecipes={all} onOpenRecipe={vi.fn()} onOpenDraft={vi.fn()} />,
    );
    expect(getByRole('button', { name: 'Original' })).toBeTruthy();
    const current = getByRole('button', { name: 'Less sugar' });
    expect(current.hasAttribute('disabled')).toBe(true);
    expect(current.getAttribute('aria-current')).toBe('true');
  });

  it('opens published versions and resumes drafts', () => {
    const onOpenRecipe = vi.fn();
    const onOpenDraft = vi.fn();
    const { getByRole } = render(
      <VariationSwitcher recipe={branch} allRecipes={all} onOpenRecipe={onOpenRecipe} onOpenDraft={onOpenDraft} />,
    );
    fireEvent.click(getByRole('button', { name: 'Original' }));
    expect(onOpenRecipe).toHaveBeenCalledWith(root);
    fireEvent.click(getByRole('button', { name: /Coconut/ }));
    expect(onOpenDraft).toHaveBeenCalledWith(draft);
  });

  it('renders nothing for a recipe without relatives', () => {
    const solo = makeRecipe({ id: 's1', title: 'Salad' });
    const { container } = render(
      <VariationSwitcher recipe={solo} allRecipes={[solo, root]} onOpenRecipe={vi.fn()} onOpenDraft={vi.fn()} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
