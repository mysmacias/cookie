import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Clock, Play, ChefHat, Timer, List, Search, X, Flame, UtensilsCrossed, Check, Zap,
} from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { useRecipes } from '../context/RecipeContext';
import type { Recipe } from '../types';
import {
  buildCookPlan,
  recipeTimingProfile,
  formatPlanClock,
  formatPlanOffset,
  type CookPlan,
  type CookTask,
  type RecipeTimingProfile,
  type ServeMode,
} from '../utils/recipeScheduler';

const MIN_RECIPES = 2;
const MAX_RECIPES = 4;
/** Cap rows rendered at once so large libraries stay responsive; search narrows. */
const MAX_VISIBLE_ROWS = 40;

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

function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

/** Higher = more hands-free windows for other dishes to slot into. */
function stackScore(p: RecipeTimingProfile): number {
  return p.passiveWindows * 1000 + p.longestPassiveMinutes;
}

const StackHint: React.FC<{ profile: RecipeTimingProfile }> = ({ profile }) => {
  if (profile.passiveWindows > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
        <Timer size={11} />
        {profile.passiveWindows} hands-free
        {profile.longestPassiveMinutes > 0 ? ` · up to ${formatMinutes(profile.longestPassiveMinutes)}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-label uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
      <Zap size={11} />
      Hands-on
    </span>
  );
};

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
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'library' | 'stack'>('library');
  const [serveMode, setServeMode] = useState<ServeMode>('together');
  const [useTarget, setUseTarget] = useState(false);
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

  const profiles = useMemo(() => {
    const map = new Map<string, RecipeTimingProfile>();
    for (const r of recipes) map.set(r.id, recipeTimingProfile(r));
    return map;
  }, [recipes]);

  const selectedRecipes = useMemo(
    () => recipes.filter(r => selectedIds[r.id]),
    [recipes, selectedIds],
  );
  const selectedCount = selectedRecipes.length;
  const atMax = selectedCount >= MAX_RECIPES;

  const visibleRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? recipes.filter(r => r.title.toLowerCase().includes(q))
      : recipes;
    if (sortBy === 'stack') {
      list = [...list].sort((a, b) => {
        const pa = profiles.get(a.id);
        const pb = profiles.get(b.id);
        return (pb ? stackScore(pb) : 0) - (pa ? stackScore(pa) : 0);
      });
    }
    return list;
  }, [recipes, search, sortBy, profiles]);

  const shownRecipes = useMemo(
    () => visibleRecipes.slice(0, MAX_VISIBLE_ROWS),
    [visibleRecipes],
  );
  const hiddenCount = visibleRecipes.length - shownRecipes.length;

  const toggleRecipe = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const count = Object.values(prev).filter(Boolean).length;
      if (count >= MAX_RECIPES) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const plan = useMemo(() => {
    if (selectedRecipes.length < MIN_RECIPES) return null;
    const target = serveMode === 'together' && useTarget ? new Date(readyAtInput) : undefined;
    if (target && Number.isNaN(target.getTime())) return null;
    return buildCookPlan(selectedRecipes, { serveMode, targetReadyAt: target });
  }, [selectedRecipes, serveMode, useTarget, readyAtInput]);

  const runningPassive = useMemo(
    () => plan?.tasks.filter(t => t.isPassive && t.timerSeconds) ?? [],
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

  /** Per-dish finish offset — meaningful in "start now" mode where they stagger. */
  const dishFinishes = useMemo(() => {
    if (!plan) return [];
    const map = new Map<string, { id: string; title: string; end: number }>();
    for (const t of plan.tasks) {
      const end = t.startOffsetMinutes + t.durationMinutes;
      const cur = map.get(t.recipeId);
      if (!cur || end > cur.end) map.set(t.recipeId, { id: t.recipeId, title: t.recipeTitle, end });
    }
    return [...map.values()].sort((a, b) => a.end - b.end);
  }, [plan]);

  const staggered = dishFinishes.length > 1
    && dishFinishes[dishFinishes.length - 1].end - dishFinishes[0].end > 0.5;

  const canPlan = selectedCount >= MIN_RECIPES && selectedCount <= MAX_RECIPES;

  const selectionHint =
    selectedCount < MIN_RECIPES
      ? `Pick ${MIN_RECIPES - selectedCount} more recipe${MIN_RECIPES - selectedCount === 1 ? '' : 's'}`
      : `${selectedCount} of ${MAX_RECIPES} selected`;

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

        {/* Selected chips — stay visible while searching/scrolling the list. */}
        {selectedRecipes.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Selected recipes">
            {selectedRecipes.map(recipe => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => toggleRecipe(recipe.id)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary/12 border border-primary/30 pl-3 pr-2 py-1.5 text-sm font-headline italic hover:bg-primary/20 transition-colors"
                >
                  <span className="truncate max-w-[10rem]">{recipe.title}</span>
                  <X size={14} className="text-primary shrink-0" aria-label={`Remove ${recipe.title}`} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Search + sort controls. */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[12rem]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search recipes…"
              aria-label="Search recipes"
              className="w-full rounded-full border border-outline-variant bg-surface pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div className="flex rounded-full border border-outline-variant overflow-hidden text-[10px] font-label uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setSortBy('library')}
              aria-pressed={sortBy === 'library'}
              className={`px-3 py-2.5 transition-colors ${sortBy === 'library' ? 'bg-primary text-on-primary font-bold' : 'hover:bg-surface-container'}`}
            >
              A–Z
            </button>
            <button
              type="button"
              onClick={() => setSortBy('stack')}
              aria-pressed={sortBy === 'stack'}
              className={`px-3 py-2.5 flex items-center gap-1 transition-colors ${sortBy === 'stack' ? 'bg-primary text-on-primary font-bold' : 'hover:bg-surface-container'}`}
            >
              <Timer size={12} />
              Best to stack
            </button>
          </div>
        </div>

        <ul className="space-y-2 max-h-[26rem] overflow-y-auto rounded-2xl border border-outline-variant/30 p-2">
          {recipes.length === 0 ? (
            <li className="text-center py-8 text-on-surface-variant text-sm">No recipes in your library yet.</li>
          ) : shownRecipes.length === 0 ? (
            <li className="text-center py-8 text-on-surface-variant text-sm">No recipes match “{search.trim()}”.</li>
          ) : (
            shownRecipes.map(recipe => {
              const checked = !!selectedIds[recipe.id];
              const disabled = !checked && atMax;
              const profile = profiles.get(recipe.id);
              return (
                <li key={recipe.id}>
                  <button
                    type="button"
                    onClick={() => toggleRecipe(recipe.id)}
                    disabled={disabled}
                    aria-pressed={checked}
                    className={`flex w-full items-center gap-3 rounded-xl p-2 pr-3 text-left transition-colors ${
                      checked ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface-container border border-transparent'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-container">
                      {recipe.image ? (
                        <img
                          src={recipe.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UtensilsCrossed size={20} className="text-outline-variant" />
                        </div>
                      )}
                      {checked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/55">
                          <Check size={22} strokeWidth={3} className="text-on-primary" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-headline italic text-lg truncate leading-tight">{recipe.title}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                        <span className="flex items-center gap-1"><Clock size={11} />{recipe.time}</span>
                        <span className="flex items-center gap-1"><Flame size={11} />{recipe.difficulty}</span>
                        {profile && <span>{profile.stepCount} steps</span>}
                      </div>
                      {profile && <StackHint profile={profile} />}
                    </div>
                  </button>
                </li>
              );
            })
          )}
          {hiddenCount > 0 && (
            <li className="text-center py-3 text-[11px] font-label uppercase tracking-widest text-on-surface-variant">
              +{hiddenCount} more — refine your search
            </li>
          )}
        </ul>
      </section>

      <section className="space-y-4" aria-labelledby="timing-heading">
        <h2 id="timing-heading" className="text-2xl font-headline italic">
          When do you serve?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setServeMode('asap')}
            aria-pressed={serveMode === 'asap'}
            className={`text-left rounded-2xl border p-4 transition-colors ${
              serveMode === 'asap' ? 'border-primary bg-primary/8' : 'border-outline-variant hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-label uppercase tracking-widest font-bold">
              <Zap size={15} className={serveMode === 'asap' ? 'text-primary' : ''} />
              Start now
            </span>
            <span className="block text-xs text-on-surface-variant mt-1.5">
              Every dish begins immediately. Each is ready as soon as it’s done.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setServeMode('together')}
            aria-pressed={serveMode === 'together'}
            className={`text-left rounded-2xl border p-4 transition-colors ${
              serveMode === 'together' ? 'border-primary bg-primary/8' : 'border-outline-variant hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-label uppercase tracking-widest font-bold">
              <Clock size={15} className={serveMode === 'together' ? 'text-primary' : ''} />
              Finish together
            </span>
            <span className="block text-xs text-on-surface-variant mt-1.5">
              Shorter dishes start later so everything is ready at the same moment.
            </span>
          </button>
        </div>

        {serveMode === 'together' && (
          <div className="space-y-3 rounded-2xl border border-outline-variant/30 p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useTarget}
                onChange={e => setUseTarget(e.target.checked)}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-sm">Aim for a specific serve time</span>
            </label>
            {useTarget && (
              <label className="block space-y-2 pl-7">
                <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                  Ready by
                </span>
                <input
                  type="datetime-local"
                  value={readyAtInput}
                  onChange={e => setReadyAtInput(e.target.value)}
                  className="w-full max-w-xs rounded-full border border-outline-variant bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
                />
              </label>
            )}
          </div>
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
                {formatMinutes(plan.totalDurationMinutes)} total
                {' · '}
                {serveMode === 'together' ? 'All ready' : 'Last dish'} {plan.readyAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
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

          {/* Per-dish ready times — most useful when "start now" staggers them. */}
          {dishFinishes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {dishFinishes.map(d => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-low/50 px-3 py-1.5 text-xs"
                >
                  <span className="font-headline italic truncate max-w-[10rem]">{d.title}</span>
                  <span className="font-label uppercase tracking-widest text-[10px] text-primary">
                    {formatPlanClock(plan.startAt, d.end)}
                  </span>
                </span>
              ))}
            </div>
          )}

          {serveMode === 'asap' && staggered && (
            <p className="text-xs text-on-surface-variant">
              Dishes finish at different times. Switch to <span className="font-bold">Finish together</span> to serve them all at once.
            </p>
          )}

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
                          {task.isPassive && task.timerSeconds && (
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

      {!canPlan && selectedCount > 0 && (
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
