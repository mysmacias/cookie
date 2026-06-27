#!/usr/bin/env node
/**
 * Bulk recipe-database crawler.
 *
 * Discovers recipe URLs from publishers' XML sitemaps, scrapes the schema.org
 * Recipe data (with image URLs) from each page, and accumulates them into an
 * on-disk JSON database at data/recipes.json. Resumable: re-running continues
 * from where it left off until the target count is reached.
 *
 * Usage:
 *   node scripts/build-recipe-db.mjs                 # target 1000
 *   node scripts/build-recipe-db.mjs --target=1000 --concurrency=6 --delay=300
 *   node scripts/build-recipe-db.mjs --refresh-sitemaps   # re-fetch URL pool
 *
 * Politeness: requests are interleaved round-robin across domains and spaced by
 * --delay (ms) per worker, so no single site is hammered.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scrapeRecipe,
  fetchSitemapUrls,
  extractSitemapLocs,
  FETCH_HEADERS,
  sleep,
} from './lib/scrape-core.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'recipes.json');
const STATE_PATH = path.join(DATA_DIR, 'scrape-state.json');

// Recipe publishers whose sitemap-indexed posts embed schema.org/Recipe JSON-LD.
const SOURCES = [
  { domain: 'www.recipetineats.com', sitemapIndex: 'https://www.recipetineats.com/sitemap_index.xml' },
  { domain: 'www.loveandlemons.com', sitemapIndex: 'https://www.loveandlemons.com/sitemap.xml' },
  { domain: 'www.budgetbytes.com', sitemapIndex: 'https://www.budgetbytes.com/sitemap_index.xml' },
  { domain: 'sallysbakingaddiction.com', sitemapIndex: 'https://sallysbakingaddiction.com/sitemap_index.xml' },
];

// Obvious non-recipe post paths to skip before fetching (saves wasted requests).
const SKIP_PATH = /\/(category|tag|author|page|about|contact|shop|web-stories|privacy|recipes-cookbook|recipe-index|gift|product)\b|\.(jpg|jpeg|png|webp|gif|pdf)$/i;

function parseArgs(argv) {
  const opts = { target: 1000, concurrency: 6, delayMs: 300, refreshSitemaps: false };
  for (const arg of argv) {
    if (arg === '--refresh-sitemaps') opts.refreshSitemaps = true;
    else if (arg.startsWith('--target=')) opts.target = parseInt(arg.slice(9), 10) || opts.target;
    else if (arg.startsWith('--concurrency=')) opts.concurrency = parseInt(arg.slice(14), 10) || opts.concurrency;
    else if (arg.startsWith('--delay=')) opts.delayMs = parseInt(arg.slice(8), 10) || 0;
  }
  return opts;
}

async function loadJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveDb(recipes) {
  await writeFile(DB_PATH, JSON.stringify(recipes, null, 2), 'utf8');
}

async function saveState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

function slugId(url) {
  try {
    const u = new URL(url);
    const slug = u.pathname.replace(/\/+$/, '').split('/').pop() || u.hostname;
    return `${u.hostname.replace(/^www\./, '').split('.')[0]}_${slug}`.slice(0, 80);
  } catch {
    return url.slice(0, 80);
  }
}

// Expand a sitemap index into a flat list of post URLs for one domain.
async function discoverDomainUrls(source) {
  const locs = await fetchSitemapUrls(source.sitemapIndex);
  const postSitemaps = locs.filter(l => /post-sitemap\d*\.xml$/i.test(l));
  const targets = postSitemaps.length > 0 ? postSitemaps : locs.filter(l => /\.xml$/i.test(l));
  const urls = new Set();
  for (const sm of targets) {
    try {
      const res = await fetch(sm, { headers: FETCH_HEADERS, redirect: 'follow' });
      if (!res.ok) continue;
      for (const u of extractSitemapLocs(await res.text())) {
        if (u.includes(source.domain) && !SKIP_PATH.test(u)) urls.add(u.split('#')[0]);
      }
    } catch {
      // skip unreadable sitemap
    }
    await sleep(200);
  }
  return [...urls];
}

// Interleave per-domain URL lists round-robin so consecutive items hit
// different domains — keeps per-site request spacing wide.
function interleave(listsByDomain) {
  const lists = Object.values(listsByDomain);
  const out = [];
  let added = true;
  let i = 0;
  while (added) {
    added = false;
    for (const list of lists) {
      if (i < list.length) {
        out.push(list[i]);
        added = true;
      }
    }
    i += 1;
  }
  return out;
}

async function buildUrlPool(opts, state) {
  if (!opts.refreshSitemaps && state.pool && state.pool.length > 0) {
    return state.pool;
  }
  console.log('Discovering recipe URLs from sitemaps…');
  const byDomain = {};
  for (const source of SOURCES) {
    try {
      const urls = await discoverDomainUrls(source);
      byDomain[source.domain] = urls;
      console.log(`  ${source.domain}: ${urls.length} candidate URLs`);
    } catch (e) {
      console.warn(`  ${source.domain}: sitemap failed (${e.message})`);
      byDomain[source.domain] = [];
    }
  }
  const pool = interleave(byDomain);
  console.log(`Total candidate URLs: ${pool.length}`);
  return pool;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  await mkdir(DATA_DIR, { recursive: true });

  const recipes = await loadJson(DB_PATH, []);
  const state = await loadJson(STATE_PATH, { seen: [], pool: [] });
  const seen = new Set(state.seen);
  const haveSources = new Set(recipes.map(r => r.sourceUrl));

  console.log(`Starting with ${recipes.length} recipes; target ${opts.target}.`);
  if (recipes.length >= opts.target) {
    console.log('Target already reached. Nothing to do.');
    return;
  }

  state.pool = await buildUrlPool(opts, state);
  await saveState({ ...state, seen: [...seen] });

  // Queue = pool minus already-attempted URLs.
  const queue = state.pool.filter(u => !seen.has(u) && !haveSources.has(u));
  console.log(`${queue.length} URLs left to try.\n`);

  let cursor = 0;
  let added = 0;
  let attempted = 0;
  let sinceSave = 0;
  const startCount = recipes.length;

  async function persist() {
    await saveDb(recipes);
    await saveState({ ...state, seen: [...seen] });
    sinceSave = 0;
  }

  async function worker() {
    while (recipes.length < opts.target && cursor < queue.length) {
      const url = queue[cursor++];
      if (seen.has(url)) continue;
      seen.add(url);
      attempted += 1;
      try {
        const recipe = await scrapeRecipe(url);
        if (!recipe.image) throw new Error('no image');
        // Two sitemap entries can redirect to the same canonical page.
        if (haveSources.has(recipe.sourceUrl)) continue;
        haveSources.add(recipe.sourceUrl);
        recipes.push({ id: slugId(url), ...recipe, scrapedAt: Date.now() });
        added += 1;
        sinceSave += 1;
        if (added % 10 === 0 || recipes.length === opts.target) {
          console.log(`  +${added} new (${recipes.length}/${opts.target}) · ${attempted} tried · last: ${recipe.title.slice(0, 50)}`);
        }
        if (sinceSave >= 25) await persist();
      } catch {
        // non-recipe / incomplete / fetch error — skip silently
      }
      await sleep(opts.delayMs);
    }
  }

  const workers = Array.from({ length: opts.concurrency }, () => worker());
  await Promise.all(workers);
  await persist();

  console.log(`\nDone this pass: +${added} recipes (${startCount} → ${recipes.length}). Attempted ${attempted} URLs.`);
  if (recipes.length < opts.target) {
    console.log(`Pool ${cursor >= queue.length ? 'exhausted' : 'paused'}. Re-run to continue` +
      (cursor >= queue.length ? ' with --refresh-sitemaps or more SOURCES.' : '.'));
    process.exitCode = cursor >= queue.length ? 2 : 0;
  } else {
    console.log('Target reached. 🎉');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
