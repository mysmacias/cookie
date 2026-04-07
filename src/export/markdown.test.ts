import { describe, expect, it } from 'vitest';
import type { Recipe } from '../types';
import { DEFAULT_EXPORT_OPTIONS } from './types';
import { buildCookbookMarkdown, buildRecipeMarkdown } from './markdown';

const sample: Recipe = {
  id: 'm1',
  title: 'Muffins',
  description: 'Breakfast.',
  image: '',
  difficulty: 'Medium',
  time: '30 min',
  prepTime: '15 min',
  category: 'Bakery',
  tags: ['quick'],
  ingredients: [{ name: 'Oats', amount: '1 cup' }],
  steps: [{ title: 'Bake', description: 'Until golden.', timer: 600 }],
  chefNote: 'Best warm.',
};

describe('buildRecipeMarkdown', () => {
  it('includes title, metadata, ingredients, steps', () => {
    const md = buildRecipeMarkdown(sample, DEFAULT_EXPORT_OPTIONS);
    expect(md).toContain('# Muffins');
    expect(md).toContain('## Ingredients');
    expect(md).toContain('**Oats**');
    expect(md).toContain('## Preparation');
    expect(md).toContain('### 1. Bake');
    expect(md).toContain("*Timer: 10 min*");
  });
  it('omits chef note when disabled', () => {
    const md = buildRecipeMarkdown(sample, { ...DEFAULT_EXPORT_OPTIONS, includeChefNote: false });
    expect(md).not.toContain("Chef's note");
  });
});

describe('buildCookbookMarkdown', () => {
  const r2: Recipe = { ...sample, id: 'm2', title: 'Bread' };
  it('includes toc and separator between recipes', () => {
    const md = buildCookbookMarkdown([sample, r2], DEFAULT_EXPORT_OPTIONS, {
      exportedAt: new Date('2026-04-06T12:00:00Z'),
      recipeCount: 2,
    });
    expect(md).toContain('# Cookie export');
    expect(md).toContain('## Table of contents');
    expect(md).toContain('1. Muffins');
    expect(md).toContain('2. Bread');
    expect(md).toContain('\n---\n');
  });
  it('appends combined shopping list when multi and option on', () => {
    const md = buildCookbookMarkdown([sample, r2], DEFAULT_EXPORT_OPTIONS);
    expect(md).toContain('# Combined shopping list');
    expect(md).toContain('Oats');
  });
  it('skips shopping appendix when option off', () => {
    const md = buildCookbookMarkdown([sample, r2], {
      ...DEFAULT_EXPORT_OPTIONS,
      appendShoppingList: false,
    });
    expect(md).not.toContain('# Combined shopping list');
  });
});
