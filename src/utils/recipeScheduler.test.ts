import { describe, it, expect } from 'vitest';
import {
  buildCookPlan,
  parseStepSegment,
  formatPlanOffset,
  stepOrderPreserved,
  DEFAULT_ACTIVE_MINUTES,
} from './recipeScheduler';
import type { Recipe } from '../types';

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
    const plan = buildCookPlan([roast, salad], { startNow: true });

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

  it('preserves per-recipe step order', () => {
    const plan = buildCookPlan([roast, salad], { startNow: true });
    expect(stepOrderPreserved(plan.tasks)).toBe(true);

    for (const recipeId of ['roast', 'salad']) {
      const recipeTasks = plan.tasks
        .filter(t => t.recipeId === recipeId)
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
  });

  it('finishes all recipes at the same wall-clock end', () => {
    const plan = buildCookPlan([roast, salad], { startNow: true });
    const ends = ['roast', 'salad'].map(id => {
      const tasks = plan.tasks.filter(t => t.recipeId === id);
      const last = tasks.reduce((best, t) =>
        t.startOffsetMinutes + t.durationMinutes > best ? t.startOffsetMinutes + t.durationMinutes : best,
      0);
      return last;
    });
    expect(ends[0]).toBeCloseTo(ends[1], 5);
    expect(ends[0]).toBeCloseTo(plan.totalDurationMinutes, 5);
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
