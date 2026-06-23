import { apiFetch } from './apiClient';
import type { Recipe } from '../types';

export async function uploadDataUrlIfNeeded(url: string): Promise<string> {
  if (!url.startsWith('data:image/')) return url;
  try {
    const data = await apiFetch<{ url: string }>('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl: url }),
    });
    return data.url;
  } catch {
    return url;
  }
}

export async function prepareRecipeMedia(recipe: Recipe): Promise<Recipe> {
  const image = recipe.image ? await uploadDataUrlIfNeeded(recipe.image) : recipe.image;
  const steps = await Promise.all(
    recipe.steps.map(async (step) => {
      if (step.photo?.startsWith('data:image/')) {
        return { ...step, photo: await uploadDataUrlIfNeeded(step.photo) };
      }
      return step;
    }),
  );
  return { ...recipe, image, steps };
}
