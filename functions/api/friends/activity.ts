import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { getAcceptedFriendIds } from '../../lib/friends';
import { isUserOwnedRecipeId } from '../../lib/db';
import { json } from '../../lib/response';

const EVENTS_PER_KIND = 40;
const FEED_LIMIT = 30;
// Recipe photos can be stored as compressed data URLs; skip anything bulky so
// the feed response stays small.
const MAX_IMAGE_CHARS = 100_000;

interface ActivityEvent {
  type: 'cooked' | 'added';
  friendId: string;
  friendName: string;
  recipeId: string;
  recipeTitle: string;
  recipeImage: string | null;
  at: number;
}

interface RecipeInfo {
  title: string;
  image: string | null;
  draft: boolean;
}

function parseRecipeInfo(data: string): RecipeInfo | null {
  try {
    const recipe = JSON.parse(data) as { title?: unknown; image?: unknown; draft?: unknown };
    const title = typeof recipe.title === 'string' ? recipe.title : '';
    const rawImage = typeof recipe.image === 'string' ? recipe.image : null;
    const image = rawImage && rawImage.length <= MAX_IMAGE_CHARS ? rawImage : null;
    return { title, image, draft: recipe.draft === true };
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const friendIds = await getAcceptedFriendIds(env, userOrResponse.id);
  if (friendIds.length === 0) return json({ events: [] });

  const friendMarks = friendIds.map(() => '?').join(',');

  const [nameRows, cookedRows, addedRows] = await Promise.all([
    env.DB.prepare(`SELECT id, name, email FROM users WHERE id IN (${friendMarks})`)
      .bind(...friendIds)
      .all<{ id: string; name: string; email: string }>(),
    env.DB.prepare(
      `SELECT user_id, recipe_id, last_cooked_at FROM recipe_notes
       WHERE user_id IN (${friendMarks}) AND last_cooked_at IS NOT NULL
       ORDER BY last_cooked_at DESC LIMIT ${EVENTS_PER_KIND}`,
    ).bind(...friendIds).all<{ user_id: string; recipe_id: string; last_cooked_at: number }>(),
    env.DB.prepare(
      `SELECT user_id, id, data, updated_at FROM user_recipes
       WHERE user_id IN (${friendMarks})
       ORDER BY updated_at DESC LIMIT ${EVENTS_PER_KIND}`,
    ).bind(...friendIds).all<{ user_id: string; id: string; data: string; updated_at: number }>(),
  ]);

  const friendNames = new Map<string, string>();
  for (const row of nameRows.results ?? []) {
    friendNames.set(row.id, row.name || row.email.split('@')[0]);
  }

  // Titles for cooked recipes: the friend's own copies first, then the shared
  // catalog for bundled/discover ids.
  const recipeInfo = new Map<string, RecipeInfo>(); // key: `${userId}:${recipeId}`
  const catalogInfo = new Map<string, RecipeInfo>();

  for (const row of addedRows.results ?? []) {
    const info = parseRecipeInfo(row.data);
    if (info) recipeInfo.set(`${row.user_id}:${row.id}`, info);
  }

  const cooked = cookedRows.results ?? [];
  const missingOwned = cooked.filter(
    r => isUserOwnedRecipeId(r.recipe_id) && !recipeInfo.has(`${r.user_id}:${r.recipe_id}`),
  );
  if (missingOwned.length > 0) {
    const marks = missingOwned.map(() => '(?, ?)').join(',');
    const binds = missingOwned.flatMap(r => [r.user_id, r.recipe_id]);
    const rows = await env.DB.prepare(
      `SELECT user_id, id, data FROM user_recipes WHERE (user_id, id) IN (VALUES ${marks})`,
    ).bind(...binds).all<{ user_id: string; id: string; data: string }>();
    for (const row of rows.results ?? []) {
      const info = parseRecipeInfo(row.data);
      if (info) recipeInfo.set(`${row.user_id}:${row.id}`, info);
    }
  }

  const catalogIds = [...new Set(cooked.filter(r => !isUserOwnedRecipeId(r.recipe_id)).map(r => r.recipe_id))];
  if (catalogIds.length > 0) {
    const marks = catalogIds.map(() => '?').join(',');
    const rows = await env.DB.prepare(
      `SELECT id, title, image FROM recipes WHERE id IN (${marks})`,
    ).bind(...catalogIds).all<{ id: string; title: string; image: string | null }>();
    for (const row of rows.results ?? []) {
      const image = row.image && row.image.length <= MAX_IMAGE_CHARS ? row.image : null;
      catalogInfo.set(row.id, { title: row.title, image, draft: false });
    }
  }

  const events: ActivityEvent[] = [];

  for (const row of cooked) {
    const info = isUserOwnedRecipeId(row.recipe_id)
      ? recipeInfo.get(`${row.user_id}:${row.recipe_id}`)
      : catalogInfo.get(row.recipe_id);
    if (info?.draft) continue;
    events.push({
      type: 'cooked',
      friendId: row.user_id,
      friendName: friendNames.get(row.user_id) ?? 'A friend',
      recipeId: row.recipe_id,
      recipeTitle: info?.title || 'a recipe',
      recipeImage: info?.image ?? null,
      at: row.last_cooked_at,
    });
  }

  for (const row of addedRows.results ?? []) {
    const info = recipeInfo.get(`${row.user_id}:${row.id}`);
    // Drafts are unpublished work in progress — keep them private.
    if (!info || info.draft) continue;
    events.push({
      type: 'added',
      friendId: row.user_id,
      friendName: friendNames.get(row.user_id) ?? 'A friend',
      recipeId: row.id,
      recipeTitle: info.title || 'a recipe',
      recipeImage: info.image,
      at: row.updated_at,
    });
  }

  events.sort((a, b) => b.at - a.at);
  return json({ events: events.slice(0, FEED_LIMIT) });
};
