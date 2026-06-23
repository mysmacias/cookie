import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UtensilsCrossed, ImagePlus, Trash2, Sun, List } from 'lucide-react';
import { haptic } from '../utils/haptics';
import { Recipe } from '../types';
import { isIngredientCrossedOff, isIngredientActiveOnStep } from '../utils/cookingIngredientProgress';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useImagePicker } from '../hooks/useImagePicker';
import { HiddenFileInputs } from '../components/HiddenFileInputs';
import { useCookingTimer } from '../hooks/useCookingTimer';
import { useRecipes } from '../context/RecipeContext';
import { useWakeLock } from '../hooks/useWakeLock';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface CookingModeScreenProps {
  recipe: Recipe;
  stepIndex: number;
  onStepChange: (i: number) => void;
  onExit: () => void;
  /** Call after mutating recipe in store so parent state stays fresh */
  onRecipeSynced?: () => void;
}

export const CookingModeScreen: React.FC<CookingModeScreenProps> = ({
  recipe,
  stepIndex,
  onStepChange,
  onExit,
  onRecipeSynced,
}) => {
  const ctx = useRecipes();
  const [kitchenMode, setKitchenMode] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const reducedMotion = useReducedMotion();
  useWakeLock(true);
  const step = recipe.steps[stepIndex];
  const progress = ((stepIndex + 1) / recipe.steps.length) * 100;

  const timer = useCookingTimer(stepIndex, () => haptic('success'));

  const persistStepPhoto = useCallback(
    (photoUrl: string | null) => {
      const nextSteps = recipe.steps.map((s, i) => {
        if (i !== stepIndex) return s;
        const next = { ...s };
        if (photoUrl) next.photo = photoUrl;
        else delete next.photo;
        return next;
      });
      void ctx.updateRecipe({ ...recipe, steps: nextSteps });
      onRecipeSynced?.();
      void haptic('light');
    },
    [recipe, stepIndex, onRecipeSynced]
  );

  const handlePhotoPicked = useCallback(
    (dataUrl: string) => persistStepPhoto(dataUrl),
    [persistStepPhoto],
  );

  const { galleryInputRef, cameraInputRef, handleFileChange, openLibrary, openCamera, supportsCamera } =
    useImagePicker(handlePhotoPicked);

  const handleTimerPress = useCallback(() => {
    if (!step.timer) return;
    if (!timer.isStarted) void haptic('medium');
    timer.toggle(step.timer);
  }, [step.timer, timer]);

  const ingredientCrossed = useMemo(
    () => recipe.ingredients.map((_, i) => isIngredientCrossedOff(recipe, i, stepIndex)),
    [recipe, stepIndex]
  );

  const ingredientActive = useMemo(
    () => recipe.ingredients.map((_, i) => isIngredientActiveOnStep(recipe, i, stepIndex)),
    [recipe, stepIndex]
  );

  const anyActiveUncrossed = useMemo(
    () =>
      recipe.ingredients.some(
        (_, i) =>
          isIngredientActiveOnStep(recipe, i, stepIndex) &&
          !isIngredientCrossedOff(recipe, i, stepIndex)
      ),
    [recipe, stepIndex]
  );

  const stepScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stepScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [stepIndex]);

  const confirmExit = useCallback(() => {
    if (window.confirm('Exit cooking mode?')) onExit();
  }, [onExit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' && stepIndex < recipe.steps.length - 1) {
        e.preventDefault();
        onStepChange(stepIndex + 1);
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        e.preventDefault();
        onStepChange(stepIndex - 1);
      } else if (e.key === ' ' && step.timer) {
        e.preventDefault();
        handleTimerPress();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        confirmExit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIndex, recipe.steps.length, step.timer, onStepChange, confirmExit, handleTimerPress]);

  const stepMotion = reducedMotion
    ? {}
    : { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 } };

  return (
    <SwipeBackWrapper onBack={confirmExit} edgeOnly className="fixed inset-0 z-[60]">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`h-full min-h-0 flex flex-col ${kitchenMode ? 'bg-on-surface text-surface' : 'bg-surface'}`}
    >
      <div className="shrink-0 safe-area-top safe-area-x">
        <div className="h-2 bg-surface-container">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary"
          />
        </div>

        <header className="px-4 sm:px-6 py-4 sm:py-6 border-b border-outline-variant/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={confirmExit}
              className="p-2.5 hover:bg-surface-container rounded-full transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Exit cooking mode"
            >
              <X size={22} />
            </button>
            <div className="min-w-0 pt-0.5">
              <h2 className={`text-lg sm:text-xl font-headline italic leading-tight line-clamp-2 ${kitchenMode ? 'text-surface' : ''}`}>{recipe.title}</h2>
              <p className="text-[10px] font-label uppercase tracking-widest opacity-50 mt-1">
                Step {stepIndex + 1} of {recipe.steps.length}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setKitchenMode(v => !v)}
              aria-pressed={kitchenMode}
              aria-label="Toggle kitchen display mode"
              className="p-2.5 rounded-full border border-outline-variant/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Sun size={20} />
            </button>
            <button
              type="button"
              onClick={() => setShowSteps(v => !v)}
              aria-expanded={showSteps}
              aria-label="Show all steps"
              className="p-2.5 rounded-full border border-outline-variant/40 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <List size={20} />
            </button>
          </div>
        </div>
        </header>
      </div>

      <div
        ref={stepScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain safe-area-x"
      >
        <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-8 sm:space-y-12 pb-10 sm:pb-12">
          {showSteps && (
            <div className="rounded-2xl border border-outline-variant/30 p-4 space-y-2 text-left">
              <p className="text-[10px] font-label uppercase tracking-widest opacity-50 mb-2">All steps</p>
              {recipe.steps.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onStepChange(i); setShowSteps(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    i === stepIndex ? 'bg-primary/15 font-bold' : 'hover:bg-surface-container'
                  }`}
                >
                  {i + 1}. {s.title}
                </button>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div 
              key={stepIndex}
              {...stepMotion}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.x < -100 && stepIndex < recipe.steps.length - 1) {
                  haptic('light');
                  onStepChange(stepIndex + 1);
                } else if (info.offset.x > 100 && stepIndex > 0) {
                  haptic('light');
                  onStepChange(stepIndex - 1);
                }
              }}
              className="space-y-6 sm:space-y-8 text-center"
            >
              <h3 className={`font-headline italic leading-tight ${
                kitchenMode ? 'text-4xl sm:text-5xl md:text-7xl text-surface' : 'text-3xl sm:text-4xl md:text-6xl'
              }`}>
                {step.title}
              </h3>
              <p className={`leading-relaxed font-light ${
                kitchenMode
                  ? 'text-2xl sm:text-3xl md:text-4xl text-surface/90'
                  : 'text-xl sm:text-2xl md:text-3xl text-on-surface-variant'
              }`}>
                {step.description}
              </p>

              <div className="w-full max-w-lg mx-auto space-y-3">
                <HiddenFileInputs galleryRef={galleryInputRef} cameraRef={cameraInputRef} onChange={handleFileChange} />

                {step.photo ? (
                  <div className="relative rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-low">
                    <img
                      src={step.photo}
                      alt=""
                      className="w-full max-h-64 sm:max-h-80 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-3 left-3 right-3 flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={openLibrary}
                        className="inline-flex items-center gap-2 rounded-full bg-surface/90 backdrop-blur px-4 py-2.5 text-[10px] font-label uppercase tracking-widest border border-outline-variant/40 shadow-sm min-h-[44px]"
                      >
                        <ImagePlus size={14} />
                        Replace
                      </button>
                      {supportsCamera ? (
                        <button
                          type="button"
                          onClick={openCamera}
                          className="inline-flex items-center gap-2 rounded-full bg-surface/90 backdrop-blur px-4 py-2.5 text-[10px] font-label uppercase tracking-widest border border-outline-variant/40 shadow-sm min-h-[44px]"
                        >
                          <ImagePlus size={14} />
                          Camera
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => persistStepPhoto(null)}
                        className="inline-flex items-center gap-2 rounded-full bg-surface/90 backdrop-blur px-4 py-2.5 text-[10px] font-label uppercase tracking-widest border border-secondary/30 text-secondary shadow-sm min-h-[44px]"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={openLibrary}
                      className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-[10px] font-label uppercase tracking-widest hover:bg-surface-container transition-colors min-h-[44px]"
                    >
                      <ImagePlus size={16} />
                      Add step photo
                    </button>
                    {supportsCamera ? (
                      <button
                        type="button"
                        onClick={openCamera}
                        className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-[10px] font-label uppercase tracking-widest hover:bg-surface-container transition-colors min-h-[44px]"
                      >
                        Take photo
                      </button>
                    ) : null}
                  </div>
                )}
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/70 text-center">
                  Saved on the recipe for next time you cook
                </p>
              </div>

              {recipe.ingredients.length > 0 ? (
                <div className="w-full max-w-lg mx-auto text-left rounded-2xl border border-outline-variant/30 bg-surface-container-low/60 px-4 py-5 sm:px-6 sm:py-6">
                  <div className="flex items-center gap-2 mb-4 text-[10px] font-label uppercase tracking-widest opacity-50">
                    <UtensilsCrossed size={14} className="opacity-70" aria-hidden />
                    <span>Ingredients</span>
                  </div>
                  <ul className="space-y-2 sm:space-y-3">
                    {recipe.ingredients.map((ing, i) => {
                      const crossed = ingredientCrossed[i];
                      const active = ingredientActive[i];
                      const dimOthers = anyActiveUncrossed && !active && !crossed;
                      return (
                        <motion.li
                          key={i}
                          initial={false}
                          animate={{ opacity: crossed ? 0.45 : dimOthers ? 0.55 : 1 }}
                          className={`flex items-start justify-between gap-4 text-base md:text-lg leading-snug rounded-xl px-3 py-2 -mx-1 transition-colors ${
                            active && !crossed
                              ? 'bg-primary/12 ring-2 ring-primary/35 border border-primary/20'
                              : ''
                          }`}
                        >
                          <span
                            className={`font-light text-on-surface ${crossed ? 'line-through decoration-on-surface/50' : ''}`}
                          >
                            {ing.name}
                          </span>
                          <span
                            className={`font-headline italic text-primary shrink-0 text-right tabular-nums ${crossed ? 'line-through decoration-primary/40 opacity-70' : ''}`}
                          >
                            {ing.amount}
                          </span>
                        </motion.li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              
              {step.timer && (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative flex h-32 w-32 items-center justify-center">
                    <svg
                      className="absolute inset-0 h-full w-full -rotate-90"
                      viewBox="0 0 100 100"
                      aria-hidden
                    >
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
                      {timer.display ?? timer.formatTime(step.timer)}
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
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <footer className="px-4 pt-3 pb-6 sm:p-6 border-t border-outline-variant/30 bg-surface-container-lowest safe-area-bottom safe-area-x">
        <div className="flex flex-col gap-3 w-full max-w-3xl mx-auto">
          <div
            className="flex flex-wrap justify-center gap-1.5 order-first sm:order-none py-1"
            aria-hidden
          >
            {recipe.steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === stepIndex ? 'w-8 sm:w-9 bg-primary' : 'w-2 bg-outline-variant'
                }`}
              />
            ))}
          </div>
          <div className="flex items-stretch justify-between gap-2 sm:gap-3 min-w-0">
            <button 
              type="button"
              disabled={stepIndex === 0}
              onClick={() => { void haptic('light'); onStepChange(stepIndex - 1); }}
              className="px-4 sm:px-6 py-3.5 rounded-full border border-outline-variant font-label uppercase tracking-widest text-[10px] sm:text-xs font-bold disabled:opacity-30 shrink-0 min-h-[44px] min-w-0"
            >
              Previous
            </button>
            {stepIndex === recipe.steps.length - 1 ? (
              <button 
                type="button"
                onClick={() => { void haptic('success'); onExit(); }}
                className="px-4 sm:px-8 py-3.5 rounded-full bg-secondary text-on-primary font-label uppercase tracking-widest text-[10px] sm:text-xs font-bold shrink-0 min-h-[44px]"
              >
                Finish Cooking
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => { void haptic('light'); onStepChange(stepIndex + 1); }}
                className="px-4 sm:px-8 py-3.5 rounded-full bg-primary text-on-primary font-label uppercase tracking-widest text-[10px] sm:text-xs font-bold shrink-0 min-h-[44px]"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </footer>
    </motion.div>
    </SwipeBackWrapper>
  );
};
