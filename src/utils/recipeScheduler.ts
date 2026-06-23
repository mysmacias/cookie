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

export interface BuildCookPlanOptions {
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

function recipeSequentialMinutes(recipe: Recipe, defaultActive: number): number {
  return recipe.steps.reduce(
    (sum, step) => sum + parseStepSegment(step, defaultActive).durationMinutes,
    0,
  );
}

/**
 * Greedy forward scheduler: passive steps free the cook while the recipe lane
 * advances; active steps from other recipes fill those windows when possible.
 * Shorter recipes start later so every dish finishes together.
 */
export function buildCookPlan(recipes: Recipe[], options: BuildCookPlanOptions = {}): CookPlan {
  if (recipes.length === 0) {
    const now = options.now ?? new Date();
    return { tasks: [], readyAt: now, totalDurationMinutes: 0, startAt: now };
  }

  const defaultActive = options.defaultActiveMinutes ?? DEFAULT_ACTIVE_MINUTES;
  const durations = recipes.map(r => recipeSequentialMinutes(r, defaultActive));
  const syncDuration = Math.max(...durations);

  const lanes: RecipeLane[] = recipes.map(recipe => ({
    recipe,
    stepIndex: 0,
    readyAt: 0,
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

  const preSyncEnd = Math.max(syncDuration, ...recipeEnds.values());

  for (const lane of lanes) {
    const id = lane.recipe.id;
    const end = recipeEnds.get(id) ?? 0;
    if (end < preSyncEnd - 0.001) {
      tasks.push({
        recipeId: id,
        recipeTitle: lane.recipe.title,
        stepIndex: lane.recipe.steps.length,
        title: 'Hold for synchronized serve',
        description: 'Keep warm until all dishes are ready to serve together.',
        startOffsetMinutes: end,
        durationMinutes: preSyncEnd - end,
        isPassive: true,
      });
    }
  }

  tasks.sort((a, b) => {
    if (a.startOffsetMinutes !== b.startOffsetMinutes) {
      return a.startOffsetMinutes - b.startOffsetMinutes;
    }
    if (a.recipeId !== b.recipeId) return a.recipeId.localeCompare(b.recipeId);
    return a.stepIndex - b.stepIndex;
  });

  const totalDurationMinutes = Math.max(
    preSyncEnd,
    ...tasks.map(t => t.startOffsetMinutes + t.durationMinutes),
  );

  const now = options.now ?? new Date();
  let startAt: Date;
  let readyAt: Date;

  if (options.targetReadyAt) {
    readyAt = options.targetReadyAt;
    startAt = new Date(readyAt.getTime() - totalDurationMinutes * 60_000);
  } else {
    startAt = options.startNow !== false ? now : now;
    readyAt = new Date(startAt.getTime() + totalDurationMinutes * 60_000);
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
