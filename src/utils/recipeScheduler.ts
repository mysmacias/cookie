import type { Recipe, Step } from '../types';

export const DEFAULT_ACTIVE_MINUTES = 5;

export interface CookTask {
  recipeId: string;
  recipeTitle: string;
  stepIndex: number;
  title: string;
  description: string;
  startOffsetMinutes: number;
  durationMinutes: number;
  isPassive: boolean;
  timerSeconds?: number;
}

export interface CookPlan {
  tasks: CookTask[];
  readyAt: Date;
  totalDurationMinutes: number;
  startAt: Date;
}

/**
 * How dishes that would otherwise finish at different times are reconciled:
 * - `asap`   — every dish starts as early as the cook is free; each finishes
 *              when it's done (no artificial waiting, dishes ready staggered).
 * - `together` — shorter dishes are delayed so all dishes are ready at the same
 *                moment; a keep-warm hold is only added when the cook physically
 *                cannot serialize two finishes (last resort, minimized).
 */
export type ServeMode = 'asap' | 'together';

export interface BuildCookPlanOptions {
  /** Defaults to `together` to preserve synchronized-serve behavior. */
  serveMode?: ServeMode;
  targetReadyAt?: Date;
  startNow?: boolean;
  /** Reference time for startNow (defaults to now). */
  now?: Date;
  defaultActiveMinutes?: number;
}

interface StepSegment {
  durationMinutes: number;
  isPassive: boolean;
  timerSeconds?: number;
}

/**
 * Timing fingerprint of a single recipe, used by the planner UI to show how
 * "stackable" a dish is (passive windows free the cook to work on other dishes).
 */
export interface RecipeTimingProfile {
  activeMinutes: number;
  passiveMinutes: number;
  totalMinutes: number;
  /** Number of hands-free (timer) steps. */
  passiveWindows: number;
  /** Longest single hands-free window, in minutes. */
  longestPassiveMinutes: number;
  stepCount: number;
}

export function recipeTimingProfile(
  recipe: Recipe,
  defaultActiveMinutes = DEFAULT_ACTIVE_MINUTES,
): RecipeTimingProfile {
  let activeMinutes = 0;
  let passiveMinutes = 0;
  let passiveWindows = 0;
  let longestPassiveMinutes = 0;
  for (const step of recipe.steps) {
    const seg = parseStepSegment(step, defaultActiveMinutes);
    if (seg.isPassive) {
      passiveMinutes += seg.durationMinutes;
      passiveWindows += 1;
      longestPassiveMinutes = Math.max(longestPassiveMinutes, seg.durationMinutes);
    } else {
      activeMinutes += seg.durationMinutes;
    }
  }
  return {
    activeMinutes,
    passiveMinutes,
    totalMinutes: activeMinutes + passiveMinutes,
    passiveWindows,
    longestPassiveMinutes,
    stepCount: recipe.steps.length,
  };
}

export function parseStepSegment(
  step: Step,
  defaultActiveMinutes = DEFAULT_ACTIVE_MINUTES,
): StepSegment {
  if (step.timer && step.timer > 0) {
    return {
      durationMinutes: step.timer / 60,
      isPassive: true,
      timerSeconds: step.timer,
    };
  }
  return { durationMinutes: defaultActiveMinutes, isPassive: false };
}

interface RecipeLane {
  recipe: Recipe;
  stepIndex: number;
  /** When the previous step finished (recipe lane free for next step). */
  readyAt: number;
}

function makeCookTask(
  recipe: Recipe,
  stepIndex: number,
  segment: StepSegment,
  startOffsetMinutes: number,
): CookTask {
  const step = recipe.steps[stepIndex];
  return {
    recipeId: recipe.id,
    recipeTitle: recipe.title,
    stepIndex,
    title: step.title,
    description: step.description,
    startOffsetMinutes,
    durationMinutes: segment.durationMinutes,
    isPassive: segment.isPassive,
    timerSeconds: segment.timerSeconds,
  };
}

interface ForwardSchedule {
  tasks: CookTask[];
  /** Wall-clock offset at which each recipe's last step finishes. */
  recipeEnds: Map<string, number>;
  makespan: number;
}

/**
 * Greedy single-cook scheduler. Passive (timer) steps run hands-free, so the
 * cook can advance another recipe's active step during those windows; active
 * steps serialize on the one cook. `releases` lets a recipe be held back from
 * starting before a given offset (used to delay short dishes in `together`
 * mode). Per-recipe step order is always preserved.
 */
function scheduleForward(
  recipes: Recipe[],
  releases: Map<string, number>,
  defaultActive: number,
): ForwardSchedule {
  const lanes: RecipeLane[] = recipes.map(recipe => ({
    recipe,
    stepIndex: 0,
    readyAt: releases.get(recipe.id) ?? 0,
  }));

  const tasks: CookTask[] = [];
  let cookAt = 0;

  const laneDone = (lane: RecipeLane) => lane.stepIndex >= lane.recipe.steps.length;

  const startPassiveIfReady = () => {
    let started = false;
    for (const lane of lanes) {
      if (laneDone(lane)) continue;
      const step = lane.recipe.steps[lane.stepIndex];
      const segment = parseStepSegment(step, defaultActive);
      if (!segment.isPassive || lane.readyAt > cookAt) continue;

      tasks.push(makeCookTask(lane.recipe, lane.stepIndex, segment, lane.readyAt));
      lane.readyAt += segment.durationMinutes;
      lane.stepIndex += 1;
      started = true;
    }
    return started;
  };

  while (!lanes.every(laneDone)) {
    startPassiveIfReady();

    const activeCandidates = lanes.filter(lane => {
      if (laneDone(lane)) return false;
      const step = lane.recipe.steps[lane.stepIndex];
      const segment = parseStepSegment(step, defaultActive);
      return !segment.isPassive && lane.readyAt <= cookAt;
    });

    if (activeCandidates.length > 0) {
      const lane = activeCandidates.sort(
        (a, b) => parseStepSegment(b.recipe.steps[b.stepIndex], defaultActive).durationMinutes
          - parseStepSegment(a.recipe.steps[a.stepIndex], defaultActive).durationMinutes,
      )[0];
      const step = lane.recipe.steps[lane.stepIndex];
      const segment = parseStepSegment(step, defaultActive);
      const start = Math.max(cookAt, lane.readyAt);
      tasks.push(makeCookTask(lane.recipe, lane.stepIndex, segment, start));
      lane.readyAt = start + segment.durationMinutes;
      cookAt = lane.readyAt;
      lane.stepIndex += 1;
      continue;
    }

    if (startPassiveIfReady()) continue;

    // Cook is idle: jump to the next moment a lane frees up (or is released).
    const pending = lanes.filter(l => !laneDone(l));
    const nextTimes = pending
      .map(l => l.readyAt)
      .filter(t => t > cookAt);
    if (nextTimes.length === 0) {
      const canPassive = pending.some(l => {
        const seg = parseStepSegment(l.recipe.steps[l.stepIndex], defaultActive);
        return seg.isPassive && l.readyAt <= cookAt;
      });
      if (!canPassive) break;
      continue;
    }
    cookAt = Math.min(...nextTimes);
  }

  const recipeEnds = new Map<string, number>();
  for (const lane of lanes) {
    const id = lane.recipe.id;
    const laneTasks = tasks.filter(t => t.recipeId === id);
    const end = laneTasks.reduce(
      (max, t) => Math.max(max, t.startOffsetMinutes + t.durationMinutes),
      lane.readyAt,
    );
    recipeEnds.set(id, end);
  }

  const makespan = Math.max(0, ...recipeEnds.values());
  return { tasks, recipeEnds, makespan };
}

/** Append "keep warm" tasks so every dish spans up to `serveAt`. */
function addHoldTasks(schedule: ForwardSchedule, recipes: Recipe[], serveAt: number): void {
  for (const recipe of recipes) {
    const end = schedule.recipeEnds.get(recipe.id) ?? 0;
    if (end < serveAt - 0.001) {
      schedule.tasks.push({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        stepIndex: recipe.steps.length,
        title: 'Hold for synchronized serve',
        description: 'Keep warm until all dishes are ready to serve together.',
        startOffsetMinutes: end,
        durationMinutes: serveAt - end,
        isPassive: true,
      });
    }
  }
}

/**
 * Build a unified cook timeline for several recipes sharing one cook.
 *
 * `asap` schedules everything as early as possible — dishes finish staggered.
 * `together` first finds the as-soon-as-possible finish of each dish, then
 * delays the shorter ones so they finish alongside the longest dish (delaying
 * the start beats cooking early then keeping warm). A keep-warm hold is only
 * added for the residual gap when the cook cannot serialize two finishes.
 */
export function buildCookPlan(recipes: Recipe[], options: BuildCookPlanOptions = {}): CookPlan {
  if (recipes.length === 0) {
    const now = options.now ?? new Date();
    return { tasks: [], readyAt: now, totalDurationMinutes: 0, startAt: now };
  }

  const defaultActive = options.defaultActiveMinutes ?? DEFAULT_ACTIVE_MINUTES;
  const serveMode: ServeMode = options.serveMode ?? 'together';
  const noReleases = new Map<string, number>();

  // Pass 1: as-soon-as-possible — every dish starts at offset 0.
  const asap = scheduleForward(recipes, noReleases, defaultActive);

  let schedule = asap;
  let serveAt = asap.makespan;

  if (serveMode === 'together' && recipes.length > 1) {
    // Delay each dish by its slack so its finish lines up with the latest dish.
    const releases = new Map<string, number>();
    for (const recipe of recipes) {
      const end = asap.recipeEnds.get(recipe.id) ?? 0;
      releases.set(recipe.id, Math.max(0, asap.makespan - end));
    }
    schedule = scheduleForward(recipes, releases, defaultActive);
    // Contention between two late finishes can push the makespan out; serve
    // everyone at the new latest finish and keep-warm only the residual gap.
    serveAt = schedule.makespan;
    addHoldTasks(schedule, recipes, serveAt);
  }

  const tasks = schedule.tasks;
  tasks.sort((a, b) => {
    if (a.startOffsetMinutes !== b.startOffsetMinutes) {
      return a.startOffsetMinutes - b.startOffsetMinutes;
    }
    if (a.recipeId !== b.recipeId) return a.recipeId.localeCompare(b.recipeId);
    return a.stepIndex - b.stepIndex;
  });

  const totalDurationMinutes = Math.max(
    serveAt,
    ...tasks.map(t => t.startOffsetMinutes + t.durationMinutes),
  );

  const now = options.now ?? new Date();
  let startAt: Date;
  let readyAt: Date;

  if (options.targetReadyAt) {
    readyAt = options.targetReadyAt;
    startAt = new Date(readyAt.getTime() - totalDurationMinutes * 60_000);
  } else {
    startAt = now;
    readyAt = new Date(now.getTime() + totalDurationMinutes * 60_000);
  }

  return { tasks, readyAt, totalDurationMinutes, startAt };
}

/** Format offset as "+10m" or "Now" for timeline labels. */
export function formatPlanOffset(minutes: number): string {
  if (minutes <= 0) return 'Now';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h > 0 && m > 0) return `+${h}h ${m}m`;
  if (h > 0) return `+${h}h`;
  return `+${m}m`;
}

/** Absolute clock label from plan start. */
export function formatPlanClock(startAt: Date, offsetMinutes: number): string {
  const t = new Date(startAt.getTime() + offsetMinutes * 60_000);
  return t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** Verify step order is preserved per recipe in the merged plan. */
export function stepOrderPreserved(tasks: CookTask[]): boolean {
  const lastEnd = new Map<string, { stepIndex: number; end: number }>();
  for (const task of [...tasks].sort((a, b) => a.startOffsetMinutes - b.startOffsetMinutes)) {
    const prev = lastEnd.get(task.recipeId);
    if (prev) {
      if (task.stepIndex <= prev.stepIndex) return false;
      if (task.startOffsetMinutes < prev.end - 0.001) return false;
    }
    lastEnd.set(task.recipeId, {
      stepIndex: task.stepIndex,
      end: task.startOffsetMinutes + task.durationMinutes,
    });
  }
  return true;
}

const ACTIVE_PLAN_KEY = 'cookie_active_cook_plan';

interface StoredCookPlan {
  recipeIds: string[];
  readyAt: string;
  startAt: string;
  totalDurationMinutes: number;
  tasks: CookTask[];
}

export function saveActiveCookPlan(plan: CookPlan, recipeIds: string[]): void {
  try {
    const payload: StoredCookPlan = {
      recipeIds,
      readyAt: plan.readyAt.toISOString(),
      startAt: plan.startAt.toISOString(),
      totalDurationMinutes: plan.totalDurationMinutes,
      tasks: plan.tasks,
    };
    sessionStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(payload));
  } catch { /* ignore */ }
}

export function loadActiveCookPlan(): { plan: CookPlan; recipeIds: string[] } | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_PLAN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as StoredCookPlan;
    return {
      recipeIds: data.recipeIds,
      plan: {
        tasks: data.tasks,
        totalDurationMinutes: data.totalDurationMinutes,
        readyAt: new Date(data.readyAt),
        startAt: new Date(data.startAt),
      },
    };
  } catch {
    return null;
  }
}

export function clearActiveCookPlan(): void {
  try {
    sessionStorage.removeItem(ACTIVE_PLAN_KEY);
  } catch { /* ignore */ }
}
