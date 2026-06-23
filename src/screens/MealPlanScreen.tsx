import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, ShoppingCart } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { useRecipes } from '../context/RecipeContext';
import { fetchMealPlan, saveMealPlan, type MealPlanDay } from '../services/mealPlanApi';
import { fetchShoppingList, saveShoppingList } from '../services/shoppingListApi';
import { buildShoppingItemsFromRecipes, mergeShoppingItems } from '../utils/shoppingList';
import { useToast } from '../components/ui/Toast';
import type { Recipe } from '../types';

interface MealPlanScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
}

function weekDates(start: Date): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export const MealPlanScreen: React.FC<MealPlanScreenProps> = ({ navigateTo }) => {
  const ctx = useRecipes();
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<MealPlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const week = useMemo(() => weekDates(weekStart), [weekStart]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const plan = await fetchMealPlan();
      setDays(plan.days ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const dayMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of days) map.set(d.date, d.recipeIds);
    for (const date of week) {
      if (!map.has(date)) map.set(date, []);
    }
    return map;
  }, [days, week]);

  const persistDays = async (nextDays: MealPlanDay[]) => {
    setDays(nextDays);
    setSaving(true);
    try {
      await saveMealPlan({ days: nextDays });
    } catch {
      showToast('Could not save meal plan');
    } finally {
      setSaving(false);
    }
  };

  const setDayRecipes = (date: string, recipeIds: string[]) => {
    const next = [...days.filter(d => d.date !== date), { date, recipeIds }];
    void persistDays(next);
  };

  const addRecipeToDay = (date: string, recipeId: string) => {
    const current = dayMap.get(date) ?? [];
    if (current.includes(recipeId)) return;
    setDayRecipes(date, [...current, recipeId]);
  };

  const removeRecipeFromDay = (date: string, recipeId: string) => {
    const current = dayMap.get(date) ?? [];
    setDayRecipes(date, current.filter(id => id !== recipeId));
  };

  const generateShoppingList = async () => {
    const ids = new Set<string>();
    for (const date of week) {
      for (const id of dayMap.get(date) ?? []) ids.add(id);
    }
    const recipes = [...ids].map(id => ctx.recipes.find(r => r.id === id)).filter((r): r is Recipe => !!r);
    if (recipes.length === 0) {
      showToast('No recipes planned this week');
      return;
    }
    try {
      const generated = buildShoppingItemsFromRecipes(recipes);
      const existing = await fetchShoppingList();
      await saveShoppingList(mergeShoppingItems(existing, generated));
      showToast(`Added ${generated.length} items to shopping list`);
      navigateTo('shopping');
    } catch {
      showToast('Could not update shopping list');
    }
  };

  const shiftWeek = (delta: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  };

  return (
    <ScreenShell onBack={() => navigateTo('library')} backLabel="Back to Library">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Calendar className="text-primary" size={28} />
          <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Meal plan</h1>
        </div>
        <p className="text-on-surface-variant">Plan your week and generate a shopping list from scheduled recipes.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => shiftWeek(-1)} className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest">Previous week</button>
        <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest">This week</button>
        <button type="button" onClick={() => shiftWeek(1)} className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest">Next week</button>
        <button
          type="button"
          onClick={() => void generateShoppingList()}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold"
        >
          <ShoppingCart size={14} />
          Generate shopping list
        </button>
        {saving ? <span className="text-xs text-on-surface-variant">Saving…</span> : null}
      </div>

      {loading ? (
        <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
      ) : (
        <div className="space-y-6">
          {week.map(date => {
            const ids = dayMap.get(date) ?? [];
            const dayRecipes = ids.map(id => ctx.recipes.find(r => r.id === id)).filter((r): r is Recipe => !!r);
            return (
              <section key={date} className="rounded-2xl border border-outline-variant/30 p-5 space-y-4">
                <h2 className="font-headline italic text-2xl">{formatDayLabel(date)}</h2>
                {dayRecipes.length > 0 ? (
                  <ul className="space-y-2">
                    {dayRecipes.map(recipe => (
                      <li key={recipe.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low/60 px-4 py-3">
                        <button type="button" onClick={() => navigateTo('detail', recipe)} className="text-left font-light hover:text-primary">
                          {recipe.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRecipeFromDay(date, recipe.id)}
                          className="text-xs font-label uppercase tracking-widest text-secondary"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant">No meals planned</p>
                )}
                <select
                  aria-label={`Add recipe to ${formatDayLabel(date)}`}
                  className="w-full rounded-full border border-outline-variant px-4 py-2.5 text-sm bg-surface"
                  defaultValue=""
                  onChange={e => {
                    if (e.target.value) {
                      addRecipeToDay(date, e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Add a recipe…</option>
                  {ctx.recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </section>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
};
