import type { Env } from '../lib/env';
import { requireUser } from '../lib/auth';
import { error, json } from '../lib/response';

export interface MealPlanDay {
  date: string;
  recipeIds: string[];
}

export interface MealPlanData {
  days: MealPlanDay[];
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  const row = await env.DB.prepare(
    'SELECT data FROM meal_plans WHERE user_id = ?',
  ).bind(userOrResponse.id).first<{ data: string }>();

  if (!row) return json({ plan: { days: [] } });
  return json({ plan: JSON.parse(row.data) as MealPlanData });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const userOrResponse = await requireUser(env, request);
  if (userOrResponse instanceof Response) return userOrResponse;

  let body: { plan?: MealPlanData };
  try {
    body = await request.json() as { plan?: MealPlanData };
  } catch {
    return error('Invalid request body.');
  }

  if (!body.plan || !Array.isArray(body.plan.days)) {
    return error('Invalid meal plan.');
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO meal_plans (user_id, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).bind(userOrResponse.id, JSON.stringify(body.plan), now).run();

  return json({ ok: true, updatedAt: now });
};
