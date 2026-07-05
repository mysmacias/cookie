/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecipeForm } from './useRecipeForm';
import type { Recipe } from '../types';

const addRecipe = vi.fn();
const updateRecipe = vi.fn();

vi.mock('../context/RecipeContext', () => ({
  useRecipes: () => ({
    addRecipe: (...args: unknown[]) => addRecipe(...args),
    updateRecipe: (...args: unknown[]) => updateRecipe(...args),
  }),
}));

let idCounter = 0;
function makeCreated(payload: Omit<Recipe, 'id'>): Recipe {
  idCounter += 1;
  return { ...payload, id: `user_test-${idCounter}` } as Recipe;
}

describe('useRecipeForm draft autosave and publish', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    idCounter = 0;
    addRecipe.mockReset().mockImplementation(async (p: Omit<Recipe, 'id'>) => makeCreated(p));
    updateRecipe.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flushAutosave() {
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
  }

  it('autosaves a new recipe as a draft once it has a title', async () => {
    const { result } = renderHook(() => useRecipeForm(null));
    act(() => result.current.setTitle('Lemon Tart'));
    await flushAutosave();

    expect(addRecipe).toHaveBeenCalledTimes(1);
    expect(addRecipe.mock.calls[0][0]).toMatchObject({ title: 'Lemon Tart', draft: true });
  });

  it('publishes into the existing draft record instead of creating a duplicate', async () => {
    const { result } = renderHook(() => useRecipeForm(null));
    act(() => result.current.setTitle('Lemon Tart'));
    await flushAutosave();

    const draftId = (await addRecipe.mock.results[0].value).id;
    const onBack = vi.fn();
    await act(async () => {
      await result.current.submit(onBack);
    });

    expect(addRecipe).toHaveBeenCalledTimes(1);
    expect(updateRecipe).toHaveBeenCalledTimes(1);
    expect(updateRecipe.mock.calls[0][0].id).toBe(draftId);
    expect(updateRecipe.mock.calls[0][0].draft).toBeFalsy();
    expect(onBack).toHaveBeenCalled();
  });

  it('waits for an in-flight draft creation so publishing never duplicates the recipe', async () => {
    let resolveCreate!: (r: Recipe) => void;
    addRecipe.mockImplementationOnce(
      (p: Omit<Recipe, 'id'>) => new Promise<Recipe>(res => { resolveCreate = () => res(makeCreated(p)); }),
    );

    const { result } = renderHook(() => useRecipeForm(null));
    act(() => result.current.setTitle('Lemon Tart'));
    // Debounce fires, draft POST is now in flight (unresolved).
    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    const onBack = vi.fn();
    const submitting = act(async () => {
      const p = result.current.submit(onBack);
      resolveCreate(undefined as never);
      await p;
    });
    await submitting;

    expect(addRecipe).toHaveBeenCalledTimes(1);
    expect(updateRecipe).toHaveBeenCalledTimes(1);
    expect(updateRecipe.mock.calls[0][0].id).toMatch(/^user_test-/);
    expect(onBack).toHaveBeenCalled();
  });

  it('saveDraft persists immediately and reports saved, then returns to idle', async () => {
    const { result } = renderHook(() => useRecipeForm(null));
    act(() => result.current.setTitle('Lemon Tart'));

    await act(async () => {
      await result.current.saveDraft();
    });

    expect(addRecipe).toHaveBeenCalledTimes(1);
    expect(addRecipe.mock.calls[0][0]).toMatchObject({ title: 'Lemon Tart', draft: true });
    expect(result.current.saveState).toBe('saved');

    await act(async () => {
      vi.advanceTimersByTime(2100);
      await Promise.resolve();
    });
    expect(result.current.saveState).toBe('idle');
  });

  it('saveDraft does nothing without a title', async () => {
    const { result } = renderHook(() => useRecipeForm(null));
    await act(async () => {
      await result.current.saveDraft();
    });
    expect(addRecipe).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('idle');
  });

  it('saveDraft reports an error when the save fails', async () => {
    addRecipe.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useRecipeForm(null));
    act(() => result.current.setTitle('Lemon Tart'));

    await act(async () => {
      await result.current.saveDraft();
    });
    expect(result.current.saveState).toBe('error');

    // A retry that succeeds recovers to "saved".
    await act(async () => {
      await result.current.saveDraft();
    });
    expect(result.current.saveState).toBe('saved');
  });

  it('keeps the draft and re-arms autosave when publishing fails', async () => {
    const { result } = renderHook(() => useRecipeForm(null));
    act(() => result.current.setTitle('Lemon Tart'));
    await flushAutosave();
    const draftId = (await addRecipe.mock.results[0].value).id;

    updateRecipe.mockRejectedValueOnce(new Error('network down'));
    const onBack = vi.fn();
    await act(async () => {
      await expect(result.current.submit(onBack)).rejects.toThrow('network down');
    });
    expect(onBack).not.toHaveBeenCalled();

    // The failure handler immediately re-saves the work as a draft…
    await act(async () => { await Promise.resolve(); });
    const rescue = updateRecipe.mock.calls.at(-1)![0];
    expect(rescue).toMatchObject({ id: draftId, draft: true });

    // …and later edits keep autosaving (submittedRef was reset).
    updateRecipe.mockClear();
    act(() => result.current.setDescription('Now with extra lemon'));
    await flushAutosave();
    expect(updateRecipe).toHaveBeenCalledTimes(1);
    expect(updateRecipe.mock.calls[0][0]).toMatchObject({ id: draftId, draft: true });
  });
});
