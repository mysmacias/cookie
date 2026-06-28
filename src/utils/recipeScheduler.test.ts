import { describe, it, expect } from 'vitest';
import {
  buildCookPlan,
  parseStepSegment,
  recipeTimingProfile,
  formatPlanOffset,
  stepOrderPreserved,
  DEFAULT_ACTIVE_MINUTES,
} from './recipeScheduler';
import type { Recipe } from '../types';

function recipeEnd(plan: { tasks: { recipeId: string; startOffsetMinutes: number; durationMinutes: number }[] }, id: string): number {
  return plan.tasks
    .filter(t => t.recipeId === id)
    .reduce((max, t) => Math.max(max, t.startOffsetMinutes + t.durationMinutes), 0);
}

function recipeStart(plan: { tasks: { recipeId: string; startOffsetMinutes: number }[] }, id: string): number {
  return plan.tasks
    .filter(t => t.recipeId === id)
    .reduce((min, t) => Math.min(min, t.startOffsetMinutes), Infinity);
}

function makeRecipe(
  id: string,
  title: string,
  steps: Recipe['steps'],
): Recipe {
  return {
    id,
    title,
    description: '',
    image: '',
    difficulty: 'Easy',
    time: '30m',
    prepTime: '10m',
    category: 'Main',
    ingredients: [],
    steps,
  };
}

describe('parseStepSegment', () => {
  it('treats steps with timer as passive', () => {
    const seg = parseStepSegment({ title: 'Bake', description: 'Wait', timer: 1200 });
    expect(seg.isPassive).toBe(true);
    expect(seg.durationMinutes).toBe(20);
    expect(seg.timerSeconds).toBe(1200);
  });

  it('defaults active steps to five minutes', () => {
    const seg = parseStepSegment({ title: 'Chop', description: 'Dice onions' });
    expect(seg.isPassive).toBe(false);
    expect(seg.durationMinutes).toBe(DEFAULT_ACTIVE_MINUTES);
  });
});

describe('buildCookPlan', () => {
  const roast = makeRecipe('roast', 'Sunday Roast', [
    { title: 'Prep veg', description: 'Chop potatoes' },
    { title: 'Roast', description: 'In the oven', timer: 1800 },
    { title: 'Rest', description: 'Let rest', timer: 600 },
    { title: 'Carve', description: 'Slice and serve' },
  ]);

  const salad = makeRecipe('salad', 'Garden Salad', [
    { title: 'Wash greens', description: 'Rinse lettuce' },
    { title: 'Chop veg', description: 'Tomato and cucumber' },
    { title: 'Dress', description: 'Toss with vinaigrette' },
  ]);

  it('interleaves active prep during passive windows from another recipe', () => {
    const plan = buildCookPlan([roast, salad], { serveMode: 'together' });

    expect(plan.tasks.length).toBeGreaterThanOrEqual(7);
    expect(stepOrderPreserved(plan.tasks)).toBe(true);

    const roastPassive = plan.tasks.filter(t => t.recipeId === 'roast' && t.isPassive);
    expect(roastPassive.length).toBe(2);

    const saladActiveDuringRoast = plan.tasks.filter(
      t =>
        t.recipeId === 'salad' &&
        !t.isPassive &&
        roastPassive.some(
          p =>
            t.startOffsetMinutes >= p.startOffsetMinutes &&
            t.startOffsetMinutes < p.startOffsetMinutes + p.durationMinutes,
        ),
    );
    expect(saladActiveDuringRoast.length).toBeGreaterThan(0);
  });

  it('back-schedules from a target ready time', () => {
    const target = new Date('2026-06-22T19:00:00');
    const plan = buildCookPlan([salad], { targetReadyAt: target });

    expect(plan.readyAt.getTime()).toBe(target.getTime());
    expect(plan.startAt.getTime()).toBe(
      target.getTime() - plan.totalDurationMinutes * 60_000,
    );
    expect(plan.totalDurationMinutes).toBe(DEFAULT_ACTIVE_MINUTES * 3);
  });

  it('preserves per-recipe step order in both serve modes', () => {
    for (const serveMode of ['asap', 'together'] as const) {
      const plan = buildCookPlan([roast, salad], { serveMode });
      expect(stepOrderPreserved(plan.tasks)).toBe(true);

      for (const recipeId of ['roast', 'salad']) {
        const recipeTasks = plan.tasks
          .filter(t => t.recipeId === recipeId && t.stepIndex < (recipeId === 'roast' ? roast : salad).steps.length)
          .sort((a, b) => a.stepIndex - b.stepIndex);
        for (let i = 0; i < recipeTasks.length; i++) {
          expect(recipeTasks[i].stepIndex).toBe(i);
          if (i > 0) {
            const prev = recipeTasks[i - 1];
            expect(recipeTasks[i].startOffsetMinutes).toBeGreaterThanOrEqual(
              prev.startOffsetMinutes + prev.durationMinutes - 0.001,
            );
          }
        }
      }
    }
  });

  it('together mode finishes all recipes at the same wall-clock end', () => {
    const plan = buildCookPlan([roast, salad], { serveMode: 'together' });
    expect(recipeEnd(plan, 'roast')).toBeCloseTo(recipeEnd(plan, 'salad'), 5);
    expect(recipeEnd(plan, 'roast')).toBeCloseTo(plan.totalDurationMinutes, 5);
  });

  it('together mode delays the shorter dish instead of cooking it early', () => {
    const plan = buildCookPlan([roast, salad], { serveMode: 'together' });
    // The long dish (roast) anchors the timeline at offset 0; the salad is
    // pushed later so it stays fresh rather than being cooked-then-held.
    expect(recipeStart(plan, 'roast')).toBeCloseTo(0, 5);
    expect(recipeStart(plan, 'salad')).toBeGreaterThan(0);
  });

  it('asap mode starts every dish immediately and finishes them staggered', () => {
    const plan = buildCookPlan([roast, salad], { serveMode: 'asap' });
    // Nothing is held back: at least one dish kicks off at the very start.
    expect(Math.min(recipeStart(plan, 'roast'), recipeStart(plan, 'salad'))).toBeCloseTo(0, 5);
    // The salad finishes well before the roast (no synchronized hold added).
    expect(recipeEnd(plan, 'salad')).toBeLessThan(recipeEnd(plan, 'roast'));
    expect(plan.tasks.some(t => t.title === 'Hold for synchronized serve')).toBe(false);
  });
});

describe('recipeTimingProfile', () => {
  it('summarizes active and passive time and windows', () => {
    const recipe = makeRecipe('r', 'Test', [
      { title: 'Chop', description: '' },
      { title: 'Simmer', description: '', timer: 1200 },
      { title: 'Rest', description: '', timer: 600 },
    ]);
    const profile = recipeTimingProfile(recipe);
    expect(profile.activeMinutes).toBe(DEFAULT_ACTIVE_MINUTES);
    expect(profile.passiveMinutes).toBe(30);
    expect(profile.passiveWindows).toBe(2);
    expect(profile.longestPassiveMinutes).toBe(20);
    expect(profile.stepCount).toBe(3);
  });
});

describe('formatPlanOffset', () => {
  it('formats zero as Now', () => {
    expect(formatPlanOffset(0)).toBe('Now');
  });

  it('formats minutes', () => {
    expect(formatPlanOffset(10)).toBe('+10m');
  });
});
