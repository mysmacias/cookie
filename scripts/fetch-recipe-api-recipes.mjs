#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://recipeapi.io/api/v1';

const DEFAULTS = {
  cuisine: '',
  search: 'mediterranean,greek,italian,spanish,lebanese,turkish',
  limit: 12,
  perPage: 12,
  delayMs: 600,
  retries: 2,
  output: 'src/data/recipeApiSeeds.ts',
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, rawValue = ''] = arg.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key === 'limit' || key === 'perPage' || key === 'delayMs' || key === 'retries') {
      args[key] = Number.parseInt(rawValue, 10);
    } else if (key in args) {
      args[key] = rawValue;
    }
  }
  return args;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function recipeApiFetch(apiKey, route, params, args) {
  const url = new URL(`${BASE_URL}${route}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  let res;
  for (let attempt = 0; attempt <= args.retries; attempt += 1) {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.status !== 429 || attempt === args.retries) break;

    const retryAfter = Number.parseInt(res.headers.get('retry-after') ?? '', 10);
    const backoffMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : args.delayMs * (attempt + 2);
    await sleep(backoffMs);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message ?? `Recipe API request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json();
}

function formatMinutes(mins) {
  if (!mins || mins <= 0) return '';
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return minutes > 0 ? `${hours} hr ${minutes} mins` : `${hours} hr`;
}

function mapDifficulty(difficulty) {
  const value = String(difficulty ?? '').toLowerCase();
  if (value === 'easy') return 'Easy';
  if (value === 'medium') return 'Medium';
  if (value === 'hard' || value === 'advanced') return 'Advanced';
  return 'Expert';
}

function formatTitle(value, fallback) {
  if (!value) return fallback;
  return String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatIngredientAmount(quantity, unit) {
  if (quantity === undefined || quantity === null || quantity === '') return String(unit ?? '').trim();
  const amount = Number.isInteger(quantity) ? String(quantity) : String(quantity);
  return unit ? `${amount} ${unit}` : amount;
}

function buildTags(recipe) {
  const tags = new Set();
  for (const value of [recipe.cuisine, recipe.meal_type, ...(recipe.dietary_tags ?? [])]) {
    if (value) tags.add(String(value).replace(/_/g, ' ').toLowerCase());
  }
  tags.add('mediterranean');
  tags.add('imported');
  return [...tags].sort();
}

function mapRecipeApiToCookie(recipe) {
  const prepTime = Number(recipe.prep_time ?? 0);
  const cookTime = Number(recipe.cook_time ?? 0);
  const totalMins = prepTime + cookTime;

  return {
    id: `api_${recipe.id}`,
    title: recipe.name,
    description: recipe.description || `A ${formatTitle(recipe.cuisine, 'Mediterranean')} recipe imported from recipeapi.io.`,
    image: '',
    difficulty: mapDifficulty(recipe.difficulty),
    time: formatMinutes(totalMins) || formatMinutes(cookTime) || '—',
    prepTime: formatMinutes(prepTime) || '—',
    ...(cookTime > 0 ? { bakeTime: formatMinutes(cookTime) } : {}),
    ...(recipe.servings ? { yields: `${recipe.servings} servings` } : {}),
    category: formatTitle(recipe.meal_type, 'Imported'),
    tags: buildTags(recipe),
    ingredients: (recipe.ingredients ?? []).map(ingredient => ({
      name: ingredient.name,
      amount: formatIngredientAmount(ingredient.quantity, ingredient.unit),
    })),
    steps: (recipe.instructions ?? []).map((text, index) => ({
      title: `Step ${index + 1}`,
      description: text,
    })),
    addedAt: Date.now(),
  };
}

async function collectRecipes(apiKey, args) {
  const recipes = new Map();
  const searches = String(args.search).split(',').map(value => value.trim()).filter(Boolean);
  const cuisines = String(args.cuisine).split(',').map(value => value.trim());
  const lastPageCap = 20;

  for (const search of searches) {
    for (const cuisine of cuisines.length > 0 ? cuisines : ['']) {
      let page = 1;

      while (recipes.size < args.limit && page <= lastPageCap) {
        await sleep(args.delayMs);
        const result = await recipeApiFetch(apiKey, '/recipes', {
          search,
          cuisine,
          page,
          per_page: args.perPage,
        }, args);

        for (const recipe of result.data ?? []) {
          if (recipe?.id) recipes.set(recipe.id, recipe);
          if (recipes.size >= args.limit) break;
        }

        const currentPage = Number(result.meta?.current_page ?? page);
        const lastPage = Number(result.meta?.last_page ?? currentPage);
        if (currentPage >= lastPage) break;
        page += 1;
      }

      if (recipes.size >= args.limit) break;
    }

    if (recipes.size >= args.limit) break;
  }

  const detailed = [];
  for (const id of [...recipes.keys()].slice(0, args.limit)) {
    await sleep(args.delayMs);
    const result = await recipeApiFetch(apiKey, `/recipes/${id}`, undefined, args);
    detailed.push(result.data ?? recipes.get(id));
  }

  return detailed.map(mapRecipeApiToCookie);
}

async function loadRecipeApiKey() {
  if (process.env.RECIPE_API_KEY) return process.env.RECIPE_API_KEY;

  const devVarsPath = path.resolve(process.cwd(), '.dev.vars');
  const contents = await readFile(devVarsPath, 'utf8').catch(() => '');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^RECIPE_API_KEY\s*=\s*(.*)$/.exec(trimmed);
    if (!match) continue;
    return match[1].replace(/^['"]|['"]$/g, '');
  }

  return '';
}

function renderSeedFile(recipes, args) {
  const generatedAt = new Date().toISOString();
  const json = JSON.stringify(recipes, null, 2);
  return `import type { Recipe } from '../types';

// Generated by scripts/fetch-recipe-api-recipes.mjs
// Source: recipeapi.io, cuisine=${args.cuisine || 'any'}, search=${args.search}, generatedAt=${generatedAt}
export const RECIPE_API_SEED_RECIPES = ${json} satisfies Recipe[];
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = await loadRecipeApiKey();

  if (!apiKey) {
    throw new Error('RECIPE_API_KEY is required. Add it to your shell environment or .dev.vars before running this script.');
  }

  if (!Number.isInteger(args.limit) || args.limit <= 0) {
    throw new Error('--limit must be a positive integer.');
  }

  const recipes = await collectRecipes(apiKey, args);
  const outputPath = path.resolve(process.cwd(), args.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderSeedFile(recipes, args), 'utf8');
  console.log(`Wrote ${recipes.length} ${args.cuisine} recipes to ${args.output}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
