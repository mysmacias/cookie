import { describe, it, expect } from 'vitest';
import {
  computeSimilarity,
  buildRecipeGraph,
  getSimilarRecipes,
  normalizeIngredientName,
} from './recipeSimilarity';
import type { Recipe } from '../types';

function makeRecipe(overrides: Partial<Recipe> & Pick<Recipe, 'id' | 'title'>): Recipe {
  return {
    description: '',
    image: '',
    difficulty: 'Easy',
    time: '30m',
    prepTime: '10m',
    category: 'Main',
    ingredients: [],
    steps: [{ title: 'Step', description: 'Do it' }],
    ...overrides,
  };
}

const pastaA = makeRecipe({
  id: 'pasta-a',
  title: 'Tomato Pasta',
  category: 'Main',
  tags: ['italian', 'vegetarian', 'main'],
  ingredients: [
    { name: 'Pasta', amount: '200g' },
    { name: 'Tomato', amount: '2' },
    { name: 'Olive oil', amount: '2 tbsp' },
    { name: 'Garlic', amount: '2 cloves' },
  ],
});

const pastaB = makeRecipe({
  id: 'pasta-b',
  title: 'Garlic Pasta',
  category: 'Main',
  tags: ['italian', 'quick'],
  ingredients: [
    { name: 'pasta', amount: '250g' },
    { name: 'Garlic', amount: '4 cloves' },
    { name: 'Olive Oil', amount: '3 tbsp' },
    { name: 'Parsley', amount: 'handful' },
  ],
});

const salad = makeRecipe({
  id: 'salad',
  title: 'Greek Salad',
  category: 'Side',
  tags: ['greek', 'mediterranean', 'vegetarian'],
  ingredients: [
    { name: 'Cucumber', amount: '1' },
    { name: 'Tomato', amount: '3' },
    { name: 'Feta cheese', amount: '100g' },
    { name: 'Olive oil', amount: '2 tbsp' },
  ],
});

const dessert = makeRecipe({
  id: 'dessert',
  title: 'Chocolate Cake',
  category: 'Dessert',
  tags: ['baking', 'sweet'],
  ingredients: [
    { name: 'Flour', amount: '2 cups' },
    { name: 'Sugar', amount: '1 cup' },
    { name: 'Cocoa', amount: '0.5 cup' },
  ],
});

describe('normalizeIngredientName', () => {
  it('lowercases and trims names', () => {
    expect(normalizeIngredientName('  Olive Oil  ')).toBe('olive oil');
  });

  it('strips common prep prefixes', () => {
    expect(normalizeIngredientName('Chopped Parsley')).toBe('parsley');
  });
});

describe('computeSimilarity', () => {
  it('returns score 1 for identical recipe ids', () => {
    const result = computeSimilarity(pastaA, pastaA);
    expect(result.score).toBe(1);
  });

  it('scores pasta recipes higher than unrelated dessert', () => {
    const pastaPair = computeSimilarity(pastaA, pastaB);
    const pastaSalad = computeSimilarity(pastaA, salad);
    const pastaDessert = computeSimilarity(pastaA, dessert);

    expect(pastaPair.score).toBeGreaterThan(pastaSalad.score);
    expect(pastaSalad.score).toBeGreaterThan(pastaDessert.score);
    expect(pastaPair.sharedIngredients).toContain('pasta');
    expect(pastaPair.sharedIngredients).toContain('garlic');
    expect(pastaPair.sameCategory).toBe(true);
    expect(pastaPair.cuisineMatch).toBe(true);
  });

  it('detects shared ingredients case-insensitively', () => {
    const result = computeSimilarity(pastaA, pastaB);
    expect(result.ingredientJaccard).toBeGreaterThan(0.3);
    expect(result.sharedIngredients).toEqual(
      expect.arrayContaining(['pasta', 'garlic', 'olive oil']),
    );
  });

  it('flags different categories', () => {
    const result = computeSimilarity(pastaA, salad);
    expect(result.sameCategory).toBe(false);
    expect(result.cuisineMatch).toBe(false);
  });
});

describe('buildRecipeGraph', () => {
  const recipes = [pastaA, pastaB, salad, dessert];

  it('creates edges above threshold', () => {
    const graph = buildRecipeGraph(recipes, { threshold: 0.2 });
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    for (const edge of graph.edges) {
      expect(edge.weight).toBeGreaterThanOrEqual(0.2);
    }
  });

  it('filters by category', () => {
    const graph = buildRecipeGraph(recipes, { threshold: 0.1, categoryFilter: 'Dessert' });
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe('dessert');
    expect(graph.edges).toHaveLength(0);
  });

  it('respects maxEdgesPerNode', () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      makeRecipe({
        id: `r${i}`,
        title: `Pasta ${i}`,
        category: 'Main',
        tags: ['italian'],
        ingredients: [
          { name: 'Pasta', amount: '1' },
          { name: 'Tomato', amount: '1' },
          { name: `Herb ${i}`, amount: '1' },
        ],
      }),
    );
    const graph = buildRecipeGraph(many, { threshold: 0.15, maxEdgesPerNode: 2 });
    const counts = new Map<string, number>();
    for (const edge of graph.edges) {
      counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
      counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });
});

describe('getSimilarRecipes', () => {
  it('returns ranked similar recipes excluding self', () => {
    const results = getSimilarRecipes('pasta-a', [pastaA, pastaB, salad, dessert], 3);
    expect(results).toHaveLength(2);
    expect(results.every(r => r.recipe.id !== 'pasta-a')).toBe(true);
    expect(results[0].recipe.id).toBe('pasta-b');
    expect(results[0].breakdown.score).toBeGreaterThan(results[1].breakdown.score);
  });

  it('returns empty array for unknown id', () => {
    expect(getSimilarRecipes('missing', [pastaA])).toEqual([]);
  });
});
