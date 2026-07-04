import type { Ingredient } from '../types';

const FRACTION = '[¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]';
const NUMBER = `(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+\\s*${FRACTION}|\\d+(?:[.,]\\d+)?|${FRACTION})`;
const QUANTITY = `${NUMBER}(?:\\s*(?:-|–|to)\\s*${NUMBER})?`;
const UNITS = [
  'cups?', 'tbsps?', 'tablespoons?', 'tsps?', 'teaspoons?',
  'grams?', 'g', 'kg', 'mg', 'ml', 'cl', 'dl', 'l', 'liters?', 'litres?',
  'oz', 'ounces?', 'lbs?', 'pounds?',
  'pinch(?:es)?', 'dash(?:es)?', 'cloves?', 'slices?', 'cans?', 'tins?', 'jars?',
  'sticks?', 'pieces?', 'sprigs?', 'bunch(?:es)?', 'handfuls?',
  'packets?', 'packages?', 'packs?', 'heads?', 'stalks?', 'ears?',
  'fillets?', 'knobs?', 'sheets?', 'strips?', 'drops?',
];
const AMOUNT_THEN_NAME = new RegExp(
  `^(${QUANTITY}(?:\\s*(?:${UNITS.join('|')})\\b\\.?)?)\\s+(?:of\\s+)?(.+)$`,
  'i',
);

/**
 * Turns a pasted block of text ("2 cups flour\n1 tsp vanilla…") into ingredient
 * rows. Lines without a recognizable leading quantity become a name-only row so
 * nothing the cook pasted is silently dropped.
 */
export function parseIngredientLines(text: string): Ingredient[] {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^\s*(?:[-*•·]\s*|\d+[.)]\s+)/, '').trim())
    .filter(Boolean)
    .map(line => {
      const m = AMOUNT_THEN_NAME.exec(line);
      if (m) return { name: m[2].trim(), amount: m[1].trim() };
      return { name: line, amount: '' };
    });
}
