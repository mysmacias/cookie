import { apiFetch } from './apiClient';
import type { Recipe } from '../types';
import { shrinkImageDataUrl } from '../utils/fileHelpers';

// Autosave persists the form on every change while the picked image stays in
// form state as a data URL, so without this cache each save would re-upload
// the same photo — orphaning R2 objects and burning the upload rate limit.
const uploadedUrls = new Map<string, string>();
const UPLOAD_CACHE_MAX = 20;

export async function uploadDataUrlIfNeeded(url: string): Promise<string> {
  if (!url.startsWith('data:image/')) return url;
  const cached = uploadedUrls.get(url);
  if (cached) return cached;
  try {
    const data = await apiFetch<{ url: string }>('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify({ dataUrl: url }),
    });
    if (uploadedUrls.size >= UPLOAD_CACHE_MAX) {
      uploadedUrls.delete(uploadedUrls.keys().next().value as string);
    }
    uploadedUrls.set(url, data.url);
    return data.url;
  } catch {
    // No media storage (guest mode, R2 unconfigured, rate limited): the image
    // stays embedded in the recipe JSON, which must fit in one D1 row (2 MB)
    // or the localStorage quota — shrink it so the save itself can't fail.
    return shrinkImageDataUrl(url);
  }
}

export async function prepareRecipeMedia(recipe: Recipe): Promise<Recipe> {
  const image = recipe.image ? await uploadDataUrlIfNeeded(recipe.image) : recipe.image;
  const ingredients = await Promise.all(
    recipe.ingredients.map(async (ing) => {
      if (ing.image?.startsWith('data:image/')) {
        return { ...ing, image: await uploadDataUrlIfNeeded(ing.image) };
      }
      return ing;
    }),
  );
  const steps = await Promise.all(
    recipe.steps.map(async (step) => {
      if (step.photo?.startsWith('data:image/')) {
        return { ...step, photo: await uploadDataUrlIfNeeded(step.photo) };
      }
      return step;
    }),
  );
  return { ...recipe, image, ingredients, steps };
}
