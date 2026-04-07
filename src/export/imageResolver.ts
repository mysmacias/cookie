import type { ExportRecipeModel } from './types';

const FETCH_TIMEOUT_MS = 12_000;
const MAX_EXPORT_IMAGE_PX = 1600;
const JPEG_QUALITY = 0.88;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Re-encode as JPEG so PDFKit always gets a format it supports (WebP/AVIF from
 * Unsplash `auto=format` often breaks client-side PDF generation).
 */
async function blobToPdfSafeDataUrl(blob: Blob): Promise<string | undefined> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    try {
      return await blobToDataUrl(blob);
    } catch {
      return undefined;
    }
  }

  let bmp: ImageBitmap | undefined;
  try {
    bmp = await createImageBitmap(blob);
    let w = bmp.width;
    let h = bmp.height;
    if (w <= 0 || h <= 0) return undefined;
    if (w > MAX_EXPORT_IMAGE_PX || h > MAX_EXPORT_IMAGE_PX) {
      const s = MAX_EXPORT_IMAGE_PX / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(bmp, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    try {
      return await blobToDataUrl(blob);
    } catch {
      return undefined;
    }
  } finally {
    bmp?.close();
  }
}

async function fetchBlobForPdf(src: string): Promise<Blob | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(src, {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    });
    if (!res.ok) return undefined;
    return await res.blob();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAsDataUrl(src: string): Promise<string | undefined> {
  if (!src.trim()) return undefined;
  const blob = await fetchBlobForPdf(src);
  if (!blob) return undefined;
  return blobToPdfSafeDataUrl(blob);
}

/** Drop all embedded images (after failed PDF render retry). */
export function stripImagesFromModel(model: ExportRecipeModel): ExportRecipeModel {
  return {
    ...model,
    image: undefined,
    ingredients: model.ingredients.map((ing) => ({ ...ing, image: undefined })),
    steps: model.steps.map((step) => ({ ...step, photo: undefined })),
  };
}

/**
 * Pre-fetches every image URL in a recipe export model and replaces them
 * with JPEG data URLs. Images that fail (CORS, decode, timeout, etc.) are set
 * to `undefined` so PDF layout can skip them.
 */
export async function resolveModelImages(model: ExportRecipeModel): Promise<ExportRecipeModel> {
  const heroPromise = model.image ? fetchAsDataUrl(model.image) : Promise.resolve(undefined);

  const ingredientPromises = model.ingredients.map(async (ing) => ({
    ...ing,
    image: ing.image ? await fetchAsDataUrl(ing.image) : undefined,
  }));

  const stepPromises = model.steps.map(async (step) => ({
    ...step,
    photo: step.photo ? await fetchAsDataUrl(step.photo) : undefined,
  }));

  const [heroImage, ingredients, steps] = await Promise.all([
    heroPromise,
    Promise.all(ingredientPromises),
    Promise.all(stepPromises),
  ]);

  return {
    ...model,
    image: heroImage,
    ingredients,
    steps,
  };
}
