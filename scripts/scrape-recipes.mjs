#!/usr/bin/env node
/**
 * Batch-import recipes from the web into a user's library via the scrape API.
 *
 * Usage:
 *   COOKIE_SESSION_TOKEN=... node scripts/scrape-recipes.mjs "chocolate cake" --limit=5
 *   node scripts/scrape-recipes.mjs --url=https://www.allrecipes.com/recipe/10813/...
 *
 * Requires BRAVE_SEARCH_API_KEY in env for search mode (or pass --url repeatedly).
 * Requires COOKIE_SESSION_TOKEN (session cookie value) and API_BASE (default http://localhost:8788).
 */

const args = process.argv.slice(2);
const queryParts = [];
let limit = 5;
let directUrls = [];

for (const arg of args) {
  if (arg.startsWith('--limit=')) {
    limit = Math.max(1, parseInt(arg.slice('--limit='.length), 10) || 5);
  } else if (arg.startsWith('--url=')) {
    directUrls.push(arg.slice('--url='.length));
  } else if (!arg.startsWith('--')) {
    queryParts.push(arg);
  }
}

const query = queryParts.join(' ').trim();
const apiBase = (process.env.API_BASE || 'http://localhost:8788').replace(/\/$/, '');
const sessionToken = process.env.COOKIE_SESSION_TOKEN;

if (!sessionToken) {
  console.error('Set COOKIE_SESSION_TOKEN to your session cookie value.');
  process.exit(1);
}

async function api(path, options = {}) {
  const res = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `session=${sessionToken}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text };
  }
  if (!res.ok) {
    throw new Error(body?.error || `HTTP ${res.status}`);
  }
  return body;
}

async function searchUrls(q, max) {
  const urls = [];
  let page = 1;
  while (urls.length < max) {
    const qs = new URLSearchParams({ q, page: String(page), per_page: String(Math.min(10, max - urls.length)) });
    const res = await api(`/api/scrape-recipe/search?${qs}`);
    for (const item of res.data ?? []) {
      urls.push(item.url);
      if (urls.length >= max) break;
    }
    if (!res.meta?.has_more || (res.data ?? []).length === 0) break;
    page += 1;
  }
  return urls;
}

async function importUrl(url) {
  const res = await api('/api/scrape-recipe/import', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  return res.recipe;
}

async function main() {
  let urls = [...directUrls];
  if (urls.length === 0) {
    if (!query) {
      console.error('Provide a search query or --url=...');
      process.exit(1);
    }
    console.log(`Searching for "${query}" (limit ${limit})…`);
    urls = await searchUrls(query, limit);
  }

  if (urls.length === 0) {
    console.log('No recipe URLs found.');
    return;
  }

  console.log(`Importing ${urls.length} recipe(s)…`);
  for (const url of urls) {
    try {
      const recipe = await importUrl(url);
      console.log(`✓ ${recipe.title} (${recipe.id})`);
      console.log(`  ${recipe.sourceUrl || url}`);
    } catch (e) {
      console.error(`✗ ${url}: ${e.message}`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
