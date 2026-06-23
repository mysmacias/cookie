import { apiFetch } from './apiClient';

export interface MealPlanDay {
  date: string;
  recipeIds: string[];
}

export interface MealPlanData {
  days: MealPlanDay[];
}

export async function fetchMealPlan(): Promise<MealPlanData> {
  const data = await apiFetch<{ plan: MealPlanData }>('/api/meal-plan');
  return data.plan;
}

export async function saveMealPlan(plan: MealPlanData): Promise<void> {
  await apiFetch('/api/meal-plan', { method: 'PUT', body: JSON.stringify({ plan }) });
}
