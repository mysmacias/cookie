import type { Recipe } from '../types';
import type { ExportOptions } from './types';
import { buildCombinedShoppingListLines, normalizeRecipeForExport } from './normalize';

function recipeBodyMarkdown(model: ReturnType<typeof normalizeRecipeForExport>): string {
  const lines: string[] = [];
  lines.push(`# ${model.title}`);
  lines.push('');
  const catLower = model.category.toLowerCase();
  if (model.isHeirloom && !catLower.includes('heirloom')) {
    lines.push(`*${model.category} · Heirloom*`);
  } else {
    lines.push(`*${model.category}*`);
  }
  lines.push('');
  lines.push(model.description);
  lines.push('');

  const meta: string[] = [];
  meta.push(`- **Prep:** ${model.prepTime}`);
  if (model.bakeTime) meta.push(`- **Bake:** ${model.bakeTime}`);
  meta.push(`- **Total / time:** ${model.time}`);
  meta.push(`- **Difficulty:** ${model.difficulty}`);
  if (model.yields) meta.push(`- **Yields:** ${model.yields}`);
  lines.push(...meta);
  lines.push('');

  if (model.tags?.length) {
    lines.push(`**Tags:** ${model.tags.join(', ')}`);
    lines.push('');
  }

  if (model.chefNote) {
    lines.push("## Chef's note");
    lines.push('');
    lines.push(`> ${model.chefNote}`);
    lines.push('');
  }

  lines.push('## Ingredients');
  lines.push('');
  for (const ing of model.ingredients) {
    lines.push(`- **${ing.name}** — ${ing.amount}`);
  }
  lines.push('');

  lines.push('## Preparation');
  lines.push('');
  for (const step of model.steps) {
    lines.push(`### ${step.index}. ${step.title}`);
    lines.push('');
    if (step.linkedIngredients.length) {
      const ingLi = step.linkedIngredients
        .map((i) => `*${i.name}* (${i.amount})`)
        .join(', ');
      lines.push(`*Uses: ${ingLi}*`);
      lines.push('');
    }
    lines.push(step.description);
    lines.push('');
    if (step.timerLabel) {
      lines.push(`*Timer: ${step.timerLabel}*`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function buildRecipeMarkdown(recipe: Recipe, options: ExportOptions): string {
  const model = normalizeRecipeForExport(recipe, options);
  return recipeBodyMarkdown(model);
}

export interface CookbookMarkdownMeta {
  exportedAt: Date;
  recipeCount: number;
}

export function buildCookbookMarkdown(
  recipes: Recipe[],
  options: ExportOptions,
  meta?: CookbookMarkdownMeta
): string {
  const m = meta ?? { exportedAt: new Date(), recipeCount: recipes.length };
  const header: string[] = [
    '# Cookie export',
    '',
    `- **Recipes:** ${m.recipeCount}`,
    `- **Exported:** ${m.exportedAt.toLocaleString()}`,
    '',
    '## Table of contents',
    '',
  ];
  recipes.forEach((r, i) => {
    header.push(`${i + 1}. ${r.title}`);
  });
  header.push('');
  header.push('---');
  header.push('');

  const bodies = recipes.map((r) => recipeBodyMarkdown(normalizeRecipeForExport(r, options)));

  let appendix = '';
  if (options.appendShoppingList && recipes.length > 1) {
    const list = buildCombinedShoppingListLines(recipes);
    appendix =
      '\n\n---\n\n# Combined shopping list\n\n' +
      list.map((line) => `- ${line}`).join('\n') +
      '\n';
  }

  return header.join('\n') + bodies.join('\n\n---\n\n') + appendix;
}
