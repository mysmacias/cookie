import { describe, it, expect } from 'vitest';
import { scaleAmount } from './servingScale';

describe('scaleAmount', () => {
  it('returns unchanged for multiplier 1', () => {
    expect(scaleAmount('2 cups', 1)).toBe('2 cups');
  });

  it('scales simple numbers', () => {
    expect(scaleAmount('2 cups', 2)).toBe('4 cups');
  });

  it('scales fractions', () => {
    expect(scaleAmount('1/2 tsp', 2)).toBe('1 tsp');
  });

  it('annotates unparseable amounts', () => {
    expect(scaleAmount('pinch of salt', 2)).toBe('pinch of salt (×2)');
  });
});
