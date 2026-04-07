import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UtensilsCrossed, ImagePlus, Trash2 } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Recipe } from '../types';
import { isIngredientCrossedOff, isIngredientActiveOnStep } from '../utils/cookingIngredientProgress';
import { updateRecipe } from '../services/recipeStore';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

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
  const step = recipe.steps[stepIndex];
  const progress = ((stepIndex + 1) / recipe.steps.length) * 100;

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const haptic = async (type: 'light' | 'medium' | 'success') => {
    if (!Capacitor.isNativePlatform()) return;
    if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      await Haptics.impact({ style: type === 'light' ? ImpactStyle.Light : ImpactStyle.Medium });
    }
  };

  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTotal, setTimerTotal] = useState(0);

  useEffect(() => {
    setTimerRemaining(null);
    setTimerRunning(false);
    setTimerTotal(0);
  }, [stepIndex]);

  useEffect(() => {
    if (!timerRunning || timerRemaining === null || timerRemaining <= 0) return;
    const id = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev === null || prev <= 1) {
          setTimerRunning(false);
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerRemaining === null]);

  useEffect(() => {
    if (timerRemaining === 0 && timerTotal > 0) {
      haptic('success');
    }
  }, [timerRemaining, timerTotal]);

  const persistStepPhoto = useCallback(
    (photoUrl: string | null) => {
      const nextSteps = recipe.steps.map((s, i) => {
        if (i !== stepIndex) return s;
        const next = { ...s };
        if (photoUrl) next.photo = photoUrl;
        else delete next.photo;
        return next;
      });
      updateRecipe({ ...recipe, steps: nextSteps });
      onRecipeSynced?.();
      void haptic('light');
    },
    [recipe, stepIndex, onRecipeSynced]
  );

  const onGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    persistStepPhoto(dataUrl);
  };

  const pickFromNativeLibrary = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 88,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      if (photo.dataUrl) persistStepPhoto(photo.dataUrl);
    } catch {
      /* cancelled */
    }
  };

  const pickFromNativeCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 88,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo.dataUrl) persistStepPhoto(photo.dataUrl);
    } catch {
      /* cancelled */
    }
  };

  const timerRingRadius = 46;
  const circumference = 2 * Math.PI * timerRingRadius;
  const timerComplete = timerRemaining === 0;
  const timerStarted = timerRemaining !== null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTimerPress = () => {
    if (!step.timer) return;
    if (!timerStarted) {
      setTimerTotal(step.timer);
      setTimerRemaining(step.timer);
      setTimerRunning(true);
      haptic('medium');
    } else if (timerRunning) {
      setTimerRunning(false);
    } else if (timerRemaining! > 0) {
      setTimerRunning(true);
    }
  };

  const timerButtonLabel = !timerStarted
    ? 'Start Timer'
    : timerRunning
      ? 'Pause'
      : timerComplete
        ? 'Timer Complete!'
        : 'Resume';

  const dashOffset = !timerStarted
    ? 0
    : timerComplete
      ? circumference
      : circumference * (1 - timerRemaining! / timerTotal);

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

  return (
    <SwipeBackWrapper onBack={onExit} edgeOnly className="fixed inset-0 z-[60]">
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full min-h-0 bg-surface flex flex-col"
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
              onClick={onExit}
              className="p-2.5 hover:bg-surface-container rounded-full transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Exit cooking mode"
            >
              <X size={22} />
            </button>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-lg sm:text-xl font-headline italic leading-tight line-clamp-2">{recipe.title}</h2>
              <p className="text-[10px] font-label uppercase tracking-widest opacity-50 mt-1">
                Step {stepIndex + 1} of {recipe.steps.length}
              </p>
            </div>
          </div>
        </div>
        </header>
      </div>

      <div
        ref={stepScrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain safe-area-x"
      >
        <div className="p-4 sm:p-6 max-w-3xl w-full mx-auto space-y-8 sm:space-y-12 pb-10 sm:pb-12">
          <AnimatePresence mode="wait">
            <motion.div 
              key={stepIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
              <h3 className="text-3xl sm:text-4xl md:text-6xl font-headline italic leading-tight">
                {step.title}
              </h3>
              <p className="text-xl sm:text-2xl md:text-3xl text-on-surface-variant leading-relaxed font-light">
                {step.description}
              </p>

              <div className="w-full max-w-lg mx-auto space-y-3">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onGalleryFile}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onGalleryFile}
                />

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
                        onClick={() => {
                          if (Capacitor.isNativePlatform()) void pickFromNativeLibrary();
                          else galleryInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-surface/90 backdrop-blur px-4 py-2.5 text-[10px] font-label uppercase tracking-widest border border-outline-variant/40 shadow-sm min-h-[44px]"
                      >
                        <ImagePlus size={14} />
                        Replace
                      </button>
                      {Capacitor.isNativePlatform() ? (
                        <button
                          type="button"
                          onClick={() => void pickFromNativeCamera()}
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
                      onClick={() => {
                        if (Capacitor.isNativePlatform()) void pickFromNativeLibrary();
                        else galleryInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-[10px] font-label uppercase tracking-widest hover:bg-surface-container transition-colors min-h-[44px]"
                    >
                      <ImagePlus size={16} />
                      Add step photo
                    </button>
                    {Capacitor.isNativePlatform() ? (
                      <button
                        type="button"
                        onClick={() => void pickFromNativeCamera()}
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
                          layout
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
                        r={timerRingRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className={timerComplete ? 'text-secondary/30' : 'text-primary/20'}
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={timerRingRadius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={timerComplete ? 'text-secondary' : 'text-primary'}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                      />
                    </svg>
                    <div className={`relative z-10 text-3xl font-headline italic ${timerComplete ? 'text-secondary' : 'text-primary'}`}>
                      {timerStarted ? formatTime(timerRemaining!) : formatTime(step.timer)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTimerPress}
                    disabled={timerComplete}
                    className={`${timerComplete ? 'bg-secondary' : 'bg-primary'} text-on-primary px-8 py-3 rounded-full font-label uppercase tracking-widest text-xs font-bold min-h-[44px]`}
                  >
                    {timerButtonLabel}
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
