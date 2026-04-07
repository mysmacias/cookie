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

export async function buildCookbookPdfBlob(
  recipes: Recipe[],
  options: ExportOptions,
  exportedAt = new Date()
): Promise<Blob> {
  const rawModels = recipes.map((r) => normalizeRecipeForExport(r, options));
  const models = await Promise.all(rawModels.map(resolveModelImages));
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
