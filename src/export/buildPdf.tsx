import type { ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { Recipe } from '../types';
import type { ExportOptions } from './types';
import { buildCombinedShoppingListLines, normalizeRecipeForExport } from './normalize';
import { resolveModelImages, stripImagesFromModel } from './imageResolver';
import { SingleRecipePdfDocument } from './pdf/SingleRecipePdfDocument';
import { CookbookPdfDocument } from './pdf/CookbookPdfDocument';

async function tryPdfBlob(doc: ReactElement): Promise<Blob> {
  const instance = pdf(doc);
  return instance.toBlob();
}

export async function buildSingleRecipePdfBlob(
  recipe: Recipe,
  options: ExportOptions,
  exportedAt = new Date()
): Promise<Blob> {
  const raw = normalizeRecipeForExport(recipe, options);
  const model = await resolveModelImages(raw);
  try {
    return await tryPdfBlob(<SingleRecipePdfDocument model={model} exportedAt={exportedAt} />);
  } catch (e) {
    console.warn('[Cookie export] PDF render failed; retrying without images', e);
    const stripped = stripImagesFromModel(model);
    return tryPdfBlob(<SingleRecipePdfDocument model={stripped} exportedAt={exportedAt} />);
  }
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function buildCookbookPdfBlob(
  recipes: Recipe[],
  options: ExportOptions,
  exportedAt = new Date()
): Promise<Blob> {
  const rawModels = recipes.map((r) => normalizeRecipeForExport(r, options));
  const models = await mapConcurrent(rawModels, 4, resolveModelImages);
  const shoppingListLines =
    options.appendShoppingList && recipes.length > 1
      ? buildCombinedShoppingListLines(recipes)
      : [];
  const docProps = { models, shoppingListLines, exportedAt } as const;
  try {
    return await tryPdfBlob(<CookbookPdfDocument {...docProps} />);
  } catch (e) {
    console.warn('[Cookie export] Cookbook PDF failed; retrying without images', e);
    const stripped = models.map(stripImagesFromModel);
    return tryPdfBlob(
      <CookbookPdfDocument models={stripped} shoppingListLines={shoppingListLines} exportedAt={exportedAt} />
    );
  }
}
