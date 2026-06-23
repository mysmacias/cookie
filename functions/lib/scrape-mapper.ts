import type { SchemaRecipe } from './scraper';
import {
  parseIngredientString,
  parseIsoDurationMinutes,
  parseSchemaInstructions,
  resolveSchemaImage,
  urlToScrapeId,
} from './scraper';

type CookieDifficulty = 'Easy' | 'Medium' | 'Advanced' | 'Expert';

export interface ScrapedCookieRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  difficulty: CookieDifficulty;
  time: string;
  prepTime: string;
  bakeTime?: string;
  yields?: string;
  category: string;
  tags?: string[];
  ingredients: { name: string; amount: string }[];
  steps: { title: string; description: string }[];
  sourceUrl: string;
  addedAt?: number;
}

function formatMinutes(mins: number): string {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} mins` : `${h} hr`;
}

function estimateDifficulty(ingredientCount: number, stepCount: number): CookieDifficulty {
  const score = ingredientCount + stepCount * 2;
  if (score <= 12) return 'Easy';
  if (score <= 22) return 'Medium';
  if (score <= 35) return 'Advanced';
  return 'Expert';
}

function formatYield(recipeYield: SchemaRecipe['recipeYield']): string | undefined {
  if (recipeYield == null) return undefined;
  if (typeof recipeYield === 'number') return `${recipeYield} servings`;
  if (Array.isArray(recipeYield)) return recipeYield.map(String).join(', ');
  return String(recipeYield).trim() || undefined;
}

function formatCategory(recipeCategory: SchemaRecipe['recipeCategory']): string {
  const raw = Array.isArray(recipeCategory) ? recipeCategory[0] : recipeCategory;
  if (!raw || typeof raw !== 'string') return 'Imported';
  return raw.trim() || 'Imported';
}

function buildTags(schema: SchemaRecipe, sourceUrl: string): string[] {
  const tags = new Set<string>(['imported', 'web']);
  const keywords = schema.keywords;
  if (typeof keywords === 'string') {
    keywords.split(/[,;]+/).forEach(k => {
      const t = k.trim();
      if (t) tags.add(t.toLowerCase());
    });
  } else if (Array.isArray(keywords)) {
    keywords.forEach(k => {
      if (typeof k === 'string' && k.trim()) tags.add(k.trim().toLowerCase());
    });
  }
  try {
    tags.add(new URL(sourceUrl).hostname.replace(/^www\./, ''));
  } catch {
    // ignore
  }
  return [...tags];
}

export async function mapSchemaToCookieRecipe(
  schema: SchemaRecipe,
  sourceUrl: string,
): Promise<ScrapedCookieRecipe> {
  const ingredients = (schema.recipeIngredient ?? [])
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map(parseIngredientString)
    .filter(i => i.name);

  const instructionTexts = parseSchemaInstructions(schema.recipeInstructions);
  const steps = instructionTexts.map((description, i) => ({
    title: `Step ${i + 1}`,
    description,
  }));

  const prepMins = parseIsoDurationMinutes(schema.prepTime);
  const cookMins = parseIsoDurationMinutes(schema.cookTime);
  const totalMins = parseIsoDurationMinutes(schema.totalTime) || prepMins + cookMins;

  const title = (schema.name ?? '').trim();
  const description = (typeof schema.description === 'string' ? schema.description : '').trim()
    || `Imported from ${sourceUrl}`;

  return {
    id: await urlToScrapeId(sourceUrl),
    title,
    description,
    image: resolveSchemaImage(schema.image),
    difficulty: estimateDifficulty(ingredients.length, steps.length),
    time: formatMinutes(totalMins) || '—',
    prepTime: formatMinutes(prepMins) || '—',
    bakeTime: cookMins > 0 ? formatMinutes(cookMins) : undefined,
    yields: formatYield(schema.recipeYield),
    category: formatCategory(schema.recipeCategory),
    tags: buildTags(schema, sourceUrl),
    ingredients: ingredients.length > 0 ? ingredients : [{ name: 'See source', amount: '' }],
    steps: steps.length > 0 ? steps : [{ title: 'Step 1', description: 'See the original page for instructions.' }],
    sourceUrl,
    addedAt: Date.now(),
  };
}
