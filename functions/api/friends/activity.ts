import type { Env } from '../../lib/env';
import { requireUser } from '../../lib/auth';
import { getAcceptedFriendIds } from '../../lib/friends';
import { isUserOwnedRecipeId } from '../../lib/db';
import { mediaKeyFromUrl } from '../../lib/media';
import { json } from '../../lib/response';

const EVENTS_PER_KIND = 40;
const FEED_LIMIT = 30;
// D1 allows at most 100 bound parameters per query.
const FRIENDS_PER_QUERY = 90;
// Recipe photos can be stored as compressed data URLs; only pass through
// thumbnail-sized ones so the feed response stays small.
const MAX_IMAGE_CHARS = 20_000;

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

// Columns extracted from the recipe JSON in SQL, so full data blobs (which can
// embed large photos) never leave the database.
const RECIPE_INFO_COLUMNS = `
  json_extract(data, '$.title') AS title,
  CASE WHEN length(json_extract(data, '$.image')) <= ${MAX_IMAGE_CHARS}
       THEN json_extract(data, '$.image') END AS image,
  COALESCE(json_extract(data, '$.draft'), 0) AS draft`;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Owner-scoped /api/media URLs return 403 for anyone but the uploader, so
// they would render broken in a friend's feed — share only public URLs and
// small data URLs.
function shareableImage(image: string | null): string | null {
  if (!image || mediaKeyFromUrl(image)) return null;
  return image;
}

function toRecipeInfo(row: { title: string | null; image: string | null; draft: number }): RecipeInfo {
  return {
    title: typeof row.title === 'string' ? row.title : '',
    image: shareableImage(row.image),
    draft: row.draft === 1,
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const friendIds = await getAcceptedFriendIds(env, userOrResponse.id);
  if (friendIds.length === 0) return json({ events: [] });

  const friendChunks = chunk(friendIds, FRIENDS_PER_QUERY);
  const marks = (ids: string[]) => ids.map(() => '?').join(',');

  const [nameChunks, cookedChunks, addedChunks] = await Promise.all([
    Promise.all(friendChunks.map(ids =>
      env.DB.prepare(`SELECT id, name, email FROM users WHERE id IN (${marks(ids)})`)
        .bind(...ids)
        .all<{ id: string; name: string; email: string }>(),
    )),
    Promise.all(friendChunks.map(ids =>
      env.DB.prepare(
        `SELECT user_id, recipe_id, last_cooked_at FROM recipe_notes
         WHERE user_id IN (${marks(ids)}) AND last_cooked_at IS NOT NULL
         ORDER BY last_cooked_at DESC LIMIT ${EVENTS_PER_KIND}`,
      ).bind(...ids).all<{ user_id: string; recipe_id: string; last_cooked_at: number }>(),
    )),
    // "Added" events use the recipe's addedAt, not updated_at — editing an old
    // recipe must not re-announce it. Drafts are excluded here, before the
    // LIMIT, so work in progress can't crowd real events out of the window.
    Promise.all(friendChunks.map(ids =>
      env.DB.prepare(
        `SELECT user_id, id, ${RECIPE_INFO_COLUMNS},
                COALESCE(json_extract(data, '$.addedAt'), updated_at) AS added_at
         FROM user_recipes
         WHERE user_id IN (${marks(ids)}) AND COALESCE(json_extract(data, '$.draft'), 0) != 1
         ORDER BY added_at DESC LIMIT ${EVENTS_PER_KIND}`,
      ).bind(...ids).all<{ user_id: string; id: string; title: string | null; image: string | null; draft: number; added_at: number }>(),
    )),
  ]);

  const friendNames = new Map<string, string>();
  for (const result of nameChunks) {
    for (const row of result.results ?? []) {
      friendNames.set(row.id, row.name || row.email.split('@')[0]);
    }
  }

  const cooked = cookedChunks
    .flatMap(result => result.results ?? [])
    .sort((a, b) => b.last_cooked_at - a.last_cooked_at)
    .slice(0, EVENTS_PER_KIND);
  const added = addedChunks
    .flatMap(result => result.results ?? [])
    .sort((a, b) => b.added_at - a.added_at)
    .slice(0, EVENTS_PER_KIND);

  // Titles for cooked recipes: the friend's own copies first, then the shared
  // catalog for bundled/discover ids.
  const recipeInfo = new Map<string, RecipeInfo>(); // key: `${userId}:${recipeId}`
  const catalogInfo = new Map<string, RecipeInfo>();

  for (const row of added) {
    recipeInfo.set(`${row.user_id}:${row.id}`, toRecipeInfo(row));
  }

  const missingOwned = cooked.filter(
    r => isUserOwnedRecipeId(r.recipe_id) && !recipeInfo.has(`${r.user_id}:${r.recipe_id}`),
  );
  const catalogIds = [...new Set(cooked.filter(r => !isUserOwnedRecipeId(r.recipe_id)).map(r => r.recipe_id))];

  await Promise.all([
    (async () => {
      if (missingOwned.length === 0) return;
      const pairMarks = missingOwned.map(() => '(?, ?)').join(',');
      const binds = missingOwned.flatMap(r => [r.user_id, r.recipe_id]);
      const rows = await env.DB.prepare(
        `SELECT user_id, id, ${RECIPE_INFO_COLUMNS}
         FROM user_recipes WHERE (user_id, id) IN (VALUES ${pairMarks})`,
      ).bind(...binds).all<{ user_id: string; id: string; title: string | null; image: string | null; draft: number }>();
      for (const row of rows.results ?? []) {
        recipeInfo.set(`${row.user_id}:${row.id}`, toRecipeInfo(row));
      }
    })(),
    (async () => {
      if (catalogIds.length === 0) return;
      const rows = await env.DB.prepare(
        `SELECT id, title, image FROM recipes WHERE id IN (${marks(catalogIds)})`,
      ).bind(...catalogIds).all<{ id: string; title: string; image: string | null }>();
      for (const row of rows.results ?? []) {
        const image = row.image && row.image.length <= MAX_IMAGE_CHARS ? row.image : null;
        catalogInfo.set(row.id, { title: row.title, image: shareableImage(image), draft: false });
      }
    })(),
  ]);

  const events: ActivityEvent[] = [];

  for (const row of cooked) {
    const info = isUserOwnedRecipeId(row.recipe_id)
      ? recipeInfo.get(`${row.user_id}:${row.recipe_id}`)
      : catalogInfo.get(row.recipe_id);
    // Drafts are unpublished work in progress — keep them private.
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

  for (const row of added) {
    const info = recipeInfo.get(`${row.user_id}:${row.id}`);
    if (!info) continue;
    events.push({
      type: 'added',
      friendId: row.user_id,
      friendName: friendNames.get(row.user_id) ?? 'A friend',
      recipeId: row.id,
      recipeTitle: info.title || 'a recipe',
      recipeImage: info.image,
      at: Number(row.added_at),
    });
  }

  events.sort((a, b) => b.at - a.at);
  return json({ events: events.slice(0, FEED_LIMIT) });
};
