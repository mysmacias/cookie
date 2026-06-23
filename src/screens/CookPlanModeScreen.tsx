import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, List, Timer } from 'lucide-react';
import { haptic } from '../utils/haptics';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useCookingTimer } from '../hooks/useCookingTimer';
import { useWakeLock } from '../hooks/useWakeLock';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { CookPlan, CookTask } from '../utils/recipeScheduler';
import { formatPlanOffset } from '../utils/recipeScheduler';

interface CookPlanModeScreenProps {
  plan: CookPlan;
  taskIndex: number;
  onTaskChange: (index: number) => void;
  onExit: () => void;
}

export const CookPlanModeScreen: React.FC<CookPlanModeScreenProps> = ({
  plan,
  taskIndex,
  onTaskChange,
  onExit,
}) => {
  const [showList, setShowList] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  useWakeLock(true);

  const tasks = plan.tasks;
  const task = tasks[taskIndex];
  const progress = tasks.length > 0 ? ((taskIndex + 1) / tasks.length) * 100 : 0;

  const timer = useCookingTimer(taskIndex, () => haptic('success'));
  const announceRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = task ? `${task.recipeTitle}: ${task.title} — COOKIE` : 'Cook plan — COOKIE';
    return () => { document.title = 'COOKIE'; };
  }, [task]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [taskIndex]);

  useEffect(() => {
    if (timer.isComplete && announceRef.current) {
      announceRef.current.textContent = `Timer complete for ${task?.title ?? 'step'}`;
    }
  }, [timer.isComplete, task?.title]);

  const handleTimerPress = useCallback(() => {
    if (!task?.timerSeconds) return;
    if (!timer.isStarted) void haptic('medium');
    timer.toggle(task.timerSeconds);
  }, [task?.timerSeconds, timer]);

  const confirmExit = useCallback(() => {
    setConfirmExitOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' && taskIndex < tasks.length - 1) {
        e.preventDefault();
        onTaskChange(taskIndex + 1);
      } else if (e.key === 'ArrowLeft' && taskIndex > 0) {
        e.preventDefault();
        onTaskChange(taskIndex - 1);
      } else if (e.key === ' ' && task?.timerSeconds) {
        e.preventDefault();
        handleTimerPress();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        confirmExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [taskIndex, tasks.length, task?.timerSeconds, onTaskChange, confirmExit, handleTimerPress]);

  const runningTimers = useMemo(
    () => tasks.filter(t => t.isPassive && t.timerSeconds),
    [tasks],
  );

  const stepMotion = reducedMotion
    ? {}
    : { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  if (!task) {
    return (
      <div className="text-center py-20">
        <p className="font-headline italic text-2xl">No tasks in plan</p>
        <button type="button" onClick={onExit} className="mt-4 text-primary text-sm font-label uppercase tracking-widest">
          Back
        </button>
      </div>
    );
  }

  return (
    <SwipeBackWrapper onBack={confirmExit} edgeOnly className="fixed inset-0 z-[60]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="h-full min-h-0 flex flex-col bg-surface"
      >
        <div ref={announceRef} className="sr-only" aria-live="assertive" aria-atomic="true" />

        <div className="shrink-0 safe-area-top safe-area-x">
          <div className="h-2 bg-surface-container">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary"
            />
          </div>
          <header className="px-4 sm:px-6 py-4 border-b border-outline-variant/30">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <button
                  type="button"
                  onClick={confirmExit}
                  className="p-2.5 hover:bg-surface-container rounded-full shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Exit synchronized cooking"
                >
                  <X size={22} />
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-label uppercase tracking-widest text-primary">
                    {task.recipeTitle}
                  </p>
                  <h2 className="text-lg font-headline italic leading-tight line-clamp-2">
                    Synchronized cook
                  </h2>
                  <p className="text-[10px] font-label uppercase tracking-widest opacity-50 mt-1">
                    Task {taskIndex + 1} of {tasks.length} · {formatPlanOffset(task.startOffsetMinutes)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowList(v => !v)}
                aria-expanded={showList}
                aria-label="Show all tasks"
                className="p-2.5 rounded-full border border-outline-variant/40 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              >
                <List size={20} />
              </button>
            </div>
          </header>
        </div>

        {runningTimers.length > 0 && (
          <div className="shrink-0 px-4 py-2 bg-secondary/8 border-b border-secondary/20 safe-area-x">
            <p className="text-[10px] font-label uppercase tracking-widest text-secondary flex items-center gap-2">
              <Timer size={12} />
              {runningTimers.length} passive timer{runningTimers.length === 1 ? '' : 's'} in this plan
            </p>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain safe-area-x"
        >
          <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-8 pb-10">
            {showList && (
              <div className="rounded-2xl border border-outline-variant/30 p-4 space-y-2">
                <p className="text-[10px] font-label uppercase tracking-widest opacity-50 mb-2">
                  All tasks (plain list)
                </p>
                {tasks.map((t, i) => (
                  <button
                    key={`${t.recipeId}-${t.stepIndex}-${i}`}
                    type="button"
                    onClick={() => { onTaskChange(i); setShowList(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                      i === taskIndex ? 'bg-primary/15 font-bold' : 'hover:bg-surface-container'
                    }`}
                  >
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant block">
                      {t.recipeTitle} · {formatPlanOffset(t.startOffsetMinutes)}
                    </span>
                    {t.title}
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={taskIndex} {...stepMotion} className="space-y-6 text-center">
                <h3 className="font-headline italic text-3xl sm:text-4xl md:text-5xl leading-tight">
                  {task.title}
                </h3>
                <p className="text-lg sm:text-xl text-on-surface-variant leading-relaxed font-light">
                  {task.description}
                </p>

                {task.isPassive && task.timerSeconds ? (
                  <div className="flex flex-col items-center space-y-4">
                    <p className="text-[10px] font-label uppercase tracking-widest text-secondary">
                      Passive wait — prep another dish while this runs
                    </p>
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
                        <circle
                          cx="50"
                          cy="50"
                          r={timer.ringRadius}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className={timer.isComplete ? 'text-secondary/30' : 'text-primary/20'}
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r={timer.ringRadius}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className={timer.isComplete ? 'text-secondary' : 'text-primary'}
                          strokeDasharray={timer.circumference}
                          strokeDashoffset={timer.dashOffset}
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <div className={`relative z-10 text-3xl font-headline italic ${timer.isComplete ? 'text-secondary' : 'text-primary'}`}>
                        {timer.display ?? timer.formatTime(task.timerSeconds)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTimerPress}
                      disabled={timer.isComplete}
                      className={`${timer.isComplete ? 'bg-secondary' : 'bg-primary'} text-on-primary px-8 py-3 rounded-full font-label uppercase tracking-widest text-xs font-bold min-h-[44px]`}
                    >
                      {timer.buttonLabel}
                    </button>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <footer className="px-4 pt-3 pb-6 border-t border-outline-variant/30 bg-surface-container-lowest safe-area-bottom safe-area-x">
          <div className="flex items-stretch justify-between gap-2 max-w-3xl mx-auto">
            <button
              type="button"
              disabled={taskIndex === 0}
              onClick={() => { void haptic('light'); onTaskChange(taskIndex - 1); }}
              className="px-4 py-3.5 rounded-full border border-outline-variant font-label uppercase tracking-widest text-[10px] font-bold disabled:opacity-30 min-h-[44px]"
            >
              Previous
            </button>
            {taskIndex === tasks.length - 1 ? (
              <button
                type="button"
                onClick={() => { void haptic('success'); onExit(); }}
                className="px-6 py-3.5 rounded-full bg-secondary text-on-primary font-label uppercase tracking-widest text-[10px] font-bold min-h-[44px]"
              >
                Finish
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { void haptic('light'); onTaskChange(taskIndex + 1); }}
                className="px-6 py-3.5 rounded-full bg-primary text-on-primary font-label uppercase tracking-widest text-[10px] font-bold min-h-[44px]"
              >
                Next
              </button>
            )}
          </div>
        </footer>
        <ConfirmDialog
          open={confirmExitOpen}
          title="Exit synchronized cooking?"
          message="You will leave the unified cook plan timeline."
          confirmLabel="Exit"
          onConfirm={() => { setConfirmExitOpen(false); onExit(); }}
          onCancel={() => setConfirmExitOpen(false)}
        />
      </motion.div>
    </SwipeBackWrapper>
  );
};
