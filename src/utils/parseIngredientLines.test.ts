import { describe, it, expect } from 'vitest';
import { parseIngredientLines } from './parseIngredientLines';

describe('parseIngredientLines', () => {
  it('splits quantity + unit from the name', () => {
    expect(parseIngredientLines('2 cups all-purpose flour')).toEqual([
      { name: 'all-purpose flour', amount: '2 cups' },
    ]);
  });

  it('handles fractions, mixed numbers, and unicode fractions', () => {
    expect(parseIngredientLines('1/2 tsp salt\n1 1/2 cups sugar\n½ cup butter\n1½ cups milk')).toEqual([
      { name: 'salt', amount: '1/2 tsp' },
      { name: 'sugar', amount: '1 1/2 cups' },
      { name: 'butter', amount: '½ cup' },
      { name: 'milk', amount: '1½ cups' },
    ]);
  });

  it('handles ranges and bare counts', () => {
    expect(parseIngredientLines('2-3 cloves garlic\n4 eggs')).toEqual([
      { name: 'garlic', amount: '2-3 cloves' },
      { name: 'eggs', amount: '4' },
    ]);
  });

  it('strips bullets and numbered-list markers without eating quantities', () => {
    expect(parseIngredientLines('- 2 cups flour\n* 1 tsp vanilla\n1. 3 tbsp honey\n1.5 l water')).toEqual([
      { name: 'flour', amount: '2 cups' },
      { name: 'vanilla', amount: '1 tsp' },
      { name: 'honey', amount: '3 tbsp' },
      { name: 'water', amount: '1.5 l' },
    ]);
  });

  it('drops "of" between amount and name', () => {
    expect(parseIngredientLines('1 pinch of saffron')).toEqual([
      { name: 'saffron', amount: '1 pinch' },
    ]);
  });

  it('keeps unparseable lines as name-only rows and skips blanks', () => {
    expect(parseIngredientLines('Salt to taste\n\nOlive oil')).toEqual([
      { name: 'Salt to taste', amount: '' },
      { name: 'Olive oil', amount: '' },
    ]);
  });
});
