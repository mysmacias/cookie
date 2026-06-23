import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, Play, ChefHat, Timer, List } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { useRecipes } from '../context/RecipeContext';
import type { Recipe } from '../types';
import {
  buildCookPlan,
  formatPlanClock,
  formatPlanOffset,
  type CookPlan,
  type CookTask,
} from '../utils/recipeScheduler';

const MIN_RECIPES = 2;
const MAX_RECIPES = 4;

interface CookPlanScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
  initialRecipeIds?: string[];
  onStartCookPlan: (plan: CookPlan, recipeIds: string[]) => void;
}

function parseRecipeIdsFromUrl(): string[] {
  const raw = new URLSearchParams(window.location.search).get('recipes');
  if (!raw?.trim()) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const CookPlanScreen: React.FC<CookPlanScreenProps> = ({
  navigateTo,
  initialRecipeIds = [],
  onStartCookPlan,
}) => {
  const { recipes } = useRecipes();
  const urlIds = useMemo(() => parseRecipeIdsFromUrl(), []);
  const seedIds = initialRecipeIds.length > 0 ? initialRecipeIds : urlIds;

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const id of seedIds) init[id] = true;
    return init;
  });
  const [timingMode, setTimingMode] = useState<'now' | 'ready'>('now');
  const [readyAtInput, setReadyAtInput] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toDatetimeLocalValue(d);
  });
  const [showListFallback, setShowListFallback] = useState(false);

  useEffect(() => {
    document.title = 'Cook plan — COOKIE';
    return () => { document.title = 'COOKIE'; };
  }, []);

  const selectedRecipes = useMemo(
    () => recipes.filter(r => selectedIds[r.id]),
    [recipes, selectedIds],
  );

  const toggleRecipe = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const count = Object.values(next).filter(Boolean).length;
      if (!next[id]) return next;
      if (count > MAX_RECIPES) return prev;
      return next;
    });
  }, []);

  const plan = useMemo(() => {
    if (selectedRecipes.length < MIN_RECIPES) return null;
    const readyAt = timingMode === 'ready' ? new Date(readyAtInput) : undefined;
    if (readyAt && Number.isNaN(readyAt.getTime())) return null;
    return buildCookPlan(selectedRecipes, {
      startNow: timingMode === 'now',
      targetReadyAt: readyAt,
    });
  }, [selectedRecipes, timingMode, readyAtInput]);

  const runningPassive = useMemo(
    () => plan?.tasks.filter(t => t.isPassive) ?? [],
    [plan],
  );

  const timelineGroups = useMemo(() => {
    if (!plan) return [];
    const map = new Map<number, CookTask[]>();
    for (const task of plan.tasks) {
      const key = Math.round(task.startOffsetMinutes * 100) / 100;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([offset, tasks]) => ({ offset, tasks }));
  }, [plan]);

  const canPlan = selectedRecipes.length >= MIN_RECIPES && selectedRecipes.length <= MAX_RECIPES;

  const selectionHint =
    selectedRecipes.length < MIN_RECIPES
      ? `Pick ${MIN_RECIPES - selectedRecipes.length} more recipe${MIN_RECIPES - selectedRecipes.length === 1 ? '' : 's'}`
      : `${selectedRecipes.length} of ${MAX_RECIPES} selected`;

  return (
    <ScreenShell onBack={() => navigateTo('library')} backLabel="Library">
      <header className="space-y-4">
        <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">
          Synchronized cooking
        </p>
        <h1 className="text-5xl md:text-6xl font-headline italic leading-none">Cook plan</h1>
        <p className="text-on-surface-variant max-w-xl text-lg">
          Combine {MIN_RECIPES}–{MAX_RECIPES} recipes into one timeline. Passive waits become prep windows for the other dishes.
        </p>
      </header>

      <section className="space-y-4" aria-labelledby="recipe-picker-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="recipe-picker-heading" className="text-2xl font-headline italic">
            Recipes
          </h2>
          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
            {selectionHint}
          </span>
        </div>
        <ul className="space-y-2 max-h-64 overflow-y-auto rounded-2xl border border-outline-variant/30 p-2">
          {recipes.length === 0 ? (
            <li className="text-center py-8 text-on-surface-variant text-sm">No recipes in your library yet.</li>
          ) : (
            recipes.map(recipe => {
              const checked = !!selectedIds[recipe.id];
              const atMax = !checked && selectedRecipes.length >= MAX_RECIPES;
              return (
                <li key={recipe.id}>
                  <label
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                      checked ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface-container border border-transparent'
                    } ${atMax ? 'opacity-45 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atMax}
                      onChange={() => toggleRecipe(recipe.id)}
                      className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
                    />
                    <span className="font-headline italic text-lg truncate flex-1">{recipe.title}</span>
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant shrink-0">
                      {recipe.steps.length} steps
                    </span>
                  </label>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="timing-heading">
        <h2 id="timing-heading" className="text-2xl font-headline italic">
          Timing
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTimingMode('now')}
            aria-pressed={timingMode === 'now'}
            className={`px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest ${
              timingMode === 'now' ? 'bg-primary text-on-primary font-bold' : 'border border-outline-variant'
            }`}
          >
            Start now
          </button>
          <button
            type="button"
            onClick={() => setTimingMode('ready')}
            aria-pressed={timingMode === 'ready'}
            className={`px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest flex items-center gap-2 ${
              timingMode === 'ready' ? 'bg-primary text-on-primary font-bold' : 'border border-outline-variant'
            }`}
          >
            <Clock size={14} />
            Ready at
          </button>
        </div>
        {timingMode === 'ready' && (
          <label className="block space-y-2">
            <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
              Target ready time
            </span>
            <input
              type="datetime-local"
              value={readyAtInput}
              onChange={e => setReadyAtInput(e.target.value)}
              className="w-full max-w-xs rounded-full border border-outline-variant bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
            />
          </label>
        )}
      </section>

      {plan && canPlan && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
          aria-labelledby="timeline-heading"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="timeline-heading" className="text-2xl font-headline italic">
                Unified timeline
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {plan.totalDurationMinutes < 60
                  ? `${Math.round(plan.totalDurationMinutes)} min total`
                  : `${Math.floor(plan.totalDurationMinutes / 60)}h ${Math.round(plan.totalDurationMinutes % 60)}m total`}
                {' · '}
                Ready {plan.readyAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowListFallback(v => !v)}
              aria-pressed={showListFallback}
              className="flex items-center gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary"
            >
              <List size={14} />
              {showListFallback ? 'Timeline view' : 'Plain list'}
            </button>
          </div>

          {runningPassive.length > 0 && (
            <div className="rounded-2xl border border-secondary/30 bg-secondary/8 px-4 py-3 flex items-start gap-3">
              <Timer size={18} className="text-secondary shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">
                  Passive timers in plan
                </p>
                <p className="text-sm text-on-surface-variant mt-1">
                  {runningPassive.length} wait step{runningPassive.length === 1 ? '' : 's'} — prep other dishes during these windows.
                </p>
              </div>
            </div>
          )}

          {showListFallback ? (
            <ol className="space-y-3" aria-label="Cook plan task list">
              {plan.tasks.map((task, i) => (
                <li
                  key={`${task.recipeId}-${task.stepIndex}-${i}`}
                  className="rounded-xl border border-outline-variant/30 px-4 py-3"
                >
                  <p className="text-[10px] font-label uppercase tracking-widest text-primary">
                    {task.recipeTitle} · {formatPlanOffset(task.startOffsetMinutes)}
                  </p>
                  <p className="font-headline italic text-lg">{task.title}</p>
                  <p className="text-sm text-on-surface-variant">{task.description}</p>
                </li>
              ))}
            </ol>
          ) : (
            <div className="relative space-y-0 border-l-2 border-primary/25 ml-3 pl-6">
              {timelineGroups.map(({ offset, tasks }, gi) => (
                <div key={offset} className="relative pb-8 last:pb-0">
                  <div
                    className="absolute -left-[calc(1.5rem+5px)] top-1 h-2.5 w-2.5 rounded-full bg-primary"
                    aria-hidden
                  />
                  <p className="text-[10px] font-label uppercase tracking-widest text-primary mb-3">
                    {formatPlanOffset(offset)}
                    <span className="text-on-surface-variant ml-2">
                      {formatPlanClock(plan.startAt, offset)}
                    </span>
                  </p>
                  <ul className="space-y-2">
                    {tasks.map((task, ti) => (
                      <li
                        key={`${task.recipeId}-${task.stepIndex}-${ti}`}
                        className={`rounded-xl border px-4 py-3 ${
                          gi === 0
                            ? 'border-primary bg-primary/8'
                            : task.isPassive
                              ? 'border-secondary/40 bg-secondary/5'
                              : 'border-outline-variant/30 bg-surface-container-low/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                            {task.recipeTitle}
                          </span>
                          {task.isPassive && (
                            <span className="text-[9px] font-label uppercase tracking-widest text-secondary">
                              Timer {Math.round(task.durationMinutes)}m
                            </span>
                          )}
                        </div>
                        <p className="font-headline italic">{task.title}</p>
                        {gi === 0 && (
                          <p className="text-xs text-primary font-label uppercase tracking-widest mt-1">
                            Start here
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={!canPlan}
            onClick={() => onStartCookPlan(plan, selectedRecipes.map(r => r.id))}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold hover:bg-primary-container disabled:opacity-45"
          >
            <Play size={16} fill="currentColor" />
            Start synchronized cook
          </button>
        </motion.section>
      )}

      {!canPlan && selectedRecipes.length > 0 && (
        <p className="text-sm text-on-surface-variant flex items-center gap-2">
          <ChefHat size={16} />
          Select at least {MIN_RECIPES} recipes to build a plan.
        </p>
      )}
    </ScreenShell>
  );
};

export function cookPlanRecipesPath(ids: string[]): string {
  if (ids.length === 0) return '/cook-plan';
  return `/cook-plan?recipes=${ids.map(encodeURIComponent).join(',')}`;
}
