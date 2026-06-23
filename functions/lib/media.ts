import type { Env } from './env';

const MEDIA_PREFIX = '/api/media/';

export function mediaKeyFromUrl(url: string): string | null {
  if (!url.startsWith(MEDIA_PREFIX)) return null;
  try {
    return decodeURIComponent(url.slice(MEDIA_PREFIX.length));
  } catch {
    return null;
  }
}

export function collectMediaKeysFromRecipe(recipe: Record<string, unknown>): string[] {
  const keys = new Set<string>();
  if (typeof recipe.image === 'string') {
    const k = mediaKeyFromUrl(recipe.image);
    if (k) keys.add(k);
  }
  const ingredients = recipe.ingredients;
  if (Array.isArray(ingredients)) {
    for (const ing of ingredients) {
      if (ing && typeof ing === 'object' && typeof (ing as { image?: string }).image === 'string') {
        const k = mediaKeyFromUrl((ing as { image: string }).image);
        if (k) keys.add(k);
      }
    }
  }
  const steps = recipe.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      if (step && typeof step === 'object' && typeof (step as { photo?: string }).photo === 'string') {
        const k = mediaKeyFromUrl((step as { photo: string }).photo);
        if (k) keys.add(k);
      }
    }
  }
  return [...keys];
}

export async function deleteMediaKeys(env: Env, keys: string[]): Promise<void> {
  if (!env.MEDIA_BUCKET || keys.length === 0) return;
  await Promise.all(keys.map(key => env.MEDIA_BUCKET!.delete(key).catch(() => undefined)));
}

export async function deleteUserMediaPrefix(env: Env, userId: string): Promise<void> {
  if (!env.MEDIA_BUCKET) return;
  const prefix = `users/${userId}/`;
  let cursor: string | undefined;
  do {
    const listed = await env.MEDIA_BUCKET.list({ prefix, cursor });
    const keys = (listed.objects ?? []).map(o => o.key);
    if (keys.length > 0) {
      await Promise.all(keys.map(key => env.MEDIA_BUCKET!.delete(key).catch(() => undefined)));
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}
