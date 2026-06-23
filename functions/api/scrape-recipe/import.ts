import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { upsertUserRecipe } from '../../lib/db';
import { checkRateLimit } from '../../lib/rateLimit';
import { mapSchemaToCookieRecipe } from '../../lib/scrape-mapper';
import { isAllowedScrapeUrl, scrapeRecipeFromUrl, ScrapeError } from '../../lib/scraper';
import { error, json } from '../../lib/response';
import { parseRecipePayload } from '../../lib/validation';

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const rate = await checkRateLimit(env, `scrape-import:${userOrResponse.id}`, 20);
  if (!rate.ok) return error('Too many imports. Try again later.', 429, 'rate_limited');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('Invalid request body.');
  }

  const url = (body as { url?: unknown }).url;
  if (typeof url !== 'string' || !url.trim()) {
    return error('url is required.');
  }
  if (!isAllowedScrapeUrl(url)) {
    return error('Invalid or disallowed URL.', 400);
  }

  try {
    const { schema, finalUrl } = await scrapeRecipeFromUrl(url);
    const mapped = await mapSchemaToCookieRecipe(schema, finalUrl);

    const existing = await env.DB.prepare(
      'SELECT data FROM user_recipes WHERE user_id = ? AND id = ?',
    ).bind(userOrResponse.id, mapped.id).first<{ data: string }>();
    const prior = existing ? JSON.parse(existing.data) as { addedAt?: number } : null;

    const validated = parseRecipePayload(mapped);
    if (!validated) return error('Scraped recipe could not be validated.', 422);

    const recipe = {
      ...validated,
      id: mapped.id,
      sourceUrl: mapped.sourceUrl,
      addedAt: prior?.addedAt ?? mapped.addedAt ?? Date.now(),
    };

    await upsertUserRecipe(env, userOrResponse.id, recipe);
    return json({ recipe }, existing ? 200 : 201);
  } catch (e) {
    if (e instanceof ScrapeError) {
      return error(e.message, e.status >= 400 && e.status < 600 ? e.status : 422);
    }
    return error('Failed to import recipe from URL.', 502);
  }
};
