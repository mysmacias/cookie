import React, { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UtensilsCrossed, ImagePlus, Trash2, Sun, List, ShoppingCart, GitBranch } from 'lucide-react';
import { haptic } from '../utils/haptics';
import { Recipe } from '../types';
import { Screen } from '../hooks/useNavigation';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BranchDialog } from '../components/BranchDialog';
import { saveRecipeNotes } from '../services/recipeNotesApi';
import { fetchShoppingList, saveShoppingList } from '../services/shoppingListApi';
import { buildShoppingItemsFromRecipes, mergeShoppingItems } from '../utils/shoppingList';
import { isIngredientCrossedOff, isIngredientActiveOnStep } from '../utils/cookingIngredientProgress';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useImagePicker } from '../hooks/useImagePicker';
import { HiddenFileInputs } from '../components/HiddenFileInputs';
import { useCookingTimer } from '../hooks/useCookingTimer';
import { useRecipes } from '../context/RecipeContext';
import { useWakeLock } from '../hooks/useWakeLock';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useToast } from '../components/ui/Toast';

interface CookingModeScreenProps {
  recipe: Recipe;
  stepIndex: number;
  onStepChange: (i: number) => void;
  onExit: () => void;
  /** Call after mutating recipe in store so parent state stays fresh */
  onRecipeSynced?: () => void;
  navigateTo?: (screen: Screen, recipe?: Recipe) => void;
}

export const CookingModeScreen: React.FC<CookingModeScreenProps> = ({
  recipe,
  stepIndex,
  onStepChange,
  onExit,
  onRecipeSynced,
}) => {
  const ctx = useRecipes();
  const { showToast } = useToast();
  const [kitchenMode, setKitchenMode] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  // "I did this differently" observations, keyed by step index. They seed the
  // branch note in the finish dialog so deviations become a branch of the
  // recipe instead of being forgotten by dinner.
  const [stepChangeNotes, setStepChangeNotes] = useState<Record<number, string>>({});
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [finishSheetOpen, setFinishSheetOpen] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
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
    // Nothing to lose on the first step with no timer running — exit directly.
    if (stepIndex === 0 && !timer.isStarted) {
      onExit();
      return;
    }
    setConfirmExitOpen(true);
  }, [stepIndex, timer.isStarted, onExit]);

  useEffect(() => {
    setNoteEditorOpen(false);
  }, [stepIndex]);

  const openNoteEditor = useCallback(() => {
    setNoteDraft(stepChangeNotes[stepIndex] ?? '');
    setNoteEditorOpen(true);
  }, [stepChangeNotes, stepIndex]);

  const saveStepNote = useCallback(() => {
    const trimmed = noteDraft.trim();
    setStepChangeNotes(prev => {
      const next = { ...prev };
      if (trimmed) next[stepIndex] = trimmed;
      else delete next[stepIndex];
      return next;
    });
    setNoteEditorOpen(false);
    if (trimmed) void haptic('light');
  }, [noteDraft, stepIndex]);

  // One "Step title: note" line per captured deviation, seeding the branch note.
  const collectedChangeNotes = useMemo(() => {
    return Object.entries(stepChangeNotes)
      .map(([i, note]) => [Number(i), note] as const)
      .sort((a, b) => a[0] - b[0])
      .map(([i, note]) => `${recipe.steps[i]?.title ?? `Step ${i + 1}`}: ${note}`)
      .join('\n');
  }, [stepChangeNotes, recipe.steps]);

  const recordCook = useCallback(async () => {
    try {
      await saveRecipeNotes(recipe.id, { lastCookedAt: Date.now() });
    } catch { /* non-blocking */ }
  }, [recipe.id]);

  const finishAsWritten = useCallback(async () => {
    void haptic('success');
    setFinishSheetOpen(false);
    await recordCook();
    onExit();
  }, [recordCook, onExit]);

  const finishWithBranch = useCallback(async (branchName: string, branchNote: string) => {
    setSavingBranch(true);
    try {
      await ctx.branchRecipe(recipe, { branchName, branchNote: branchNote || undefined });
      void haptic('success');
      setFinishSheetOpen(false);
      showToast(`"${branchName}" saved as a draft branch`);
      await recordCook();
      onExit();
    } catch {
      showToast('Could not save branch');
    } finally {
      setSavingBranch(false);
    }
  }, [ctx, recipe, recordCook, onExit, showToast]);

  const addToShoppingList = useCallback(async () => {
    try {
      const incoming = buildShoppingItemsFromRecipes([recipe]);
      const existing = await fetchShoppingList();
      await saveShoppingList(mergeShoppingItems(existing, incoming));
      showToast('Ingredients added to shopping list');
    } catch {
      showToast('Could not update shopping list');
    }
  }, [recipe, showToast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The finish dialog owns the keyboard (its focus trap handles Escape).
      if (finishSheetOpen) return;
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
  }, [stepIndex, recipe.steps.length, step.timer, onStepChange, confirmExit, handleTimerPress, finishSheetOpen]);

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

              <div className="w-full max-w-lg mx-auto">
                {noteEditorOpen ? (
                  <div className="rounded-2xl border border-outline-variant/40 p-4 space-y-3 text-left">
                    <label
                      htmlFor="step-change-note"
                      className="block text-[10px] font-label uppercase tracking-widest opacity-60"
                    >
                      What did you do differently?
                    </label>
                    <textarea
                      id="step-change-note"
                      value={noteDraft}
                      onChange={e => setNoteDraft(e.target.value)}
                      rows={2}
                      placeholder="Browned the butter instead of just melting it…"
                      className="w-full rounded-xl border border-outline-variant bg-transparent px-3 py-2 text-sm text-inherit placeholder:opacity-50 focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setNoteEditorOpen(false)}
                        className="px-4 py-2 rounded-full border border-outline-variant text-[10px] font-label uppercase tracking-widest min-h-[40px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveStepNote}
                        className="px-4 py-2 rounded-full bg-primary text-on-primary text-[10px] font-label uppercase tracking-widest font-bold min-h-[40px]"
                      >
                        Save note
                      </button>
                    </div>
                  </div>
                ) : stepChangeNotes[stepIndex] ? (
                  <button
                    type="button"
                    onClick={openNoteEditor}
                    className="w-full flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-left"
                  >
                    <GitBranch size={16} className="text-primary shrink-0 mt-0.5" aria-hidden />
                    <span className="text-sm italic leading-snug min-w-0">{stepChangeNotes[stepIndex]}</span>
                    <span className="ml-auto shrink-0 text-[9px] font-label uppercase tracking-widest opacity-60 mt-1">
                      Edit
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={openNoteEditor}
                    className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-3 text-[10px] font-label uppercase tracking-widest hover:bg-surface-container transition-colors min-h-[44px]"
                  >
                    <GitBranch size={14} aria-hidden />
                    I did this differently
                  </button>
                )}
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
                  <div className="relative flex h-32 w-32 items-center justify-center" aria-live="polite" aria-atomic="true">
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
                  <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {timer.isStarted && timer.display ? `Timer: ${timer.display}` : ''}
                    {timer.isComplete ? 'Timer complete' : ''}
                  </div>
                  <button
                    type="button"
                    onClick={handleTimerPress}
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

      <footer className={`px-4 pt-3 pb-6 sm:p-6 border-t safe-area-bottom safe-area-x ${
        kitchenMode
          ? 'border-surface/15 bg-on-surface text-surface'
          : 'border-outline-variant/30 bg-surface-container-lowest'
      }`}>
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
              onClick={() => void addToShoppingList()}
              aria-label="Add ingredients to shopping list"
              className="p-3.5 rounded-full border border-outline-variant shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ShoppingCart size={18} />
            </button>
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
                onClick={() => { void haptic('light'); setFinishSheetOpen(true); }}
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
      <ConfirmDialog
        open={confirmExitOpen}
        title="Exit cooking mode?"
        message="Your progress on this session will not be saved."
        confirmLabel="Exit"
        onConfirm={() => { setConfirmExitOpen(false); onExit(); }}
        onCancel={() => setConfirmExitOpen(false)}
      />
      <BranchDialog
        open={finishSheetOpen}
        sourceTitle={recipe.title}
        heading="How did it go?"
        subheading={
          collectedChangeNotes
            ? 'You did some things differently — save them as a branch so this version isn’t lost.'
            : 'Cooked it your own way? Save your changes as a branch of this recipe.'
        }
        confirmLabel="Save as branch"
        skipLabel="Cooked as written"
        initialNote={collectedChangeNotes}
        busy={savingBranch}
        onConfirm={(name, note) => void finishWithBranch(name, note)}
        onSkip={() => void finishAsWritten()}
        onCancel={() => setFinishSheetOpen(false)}
      />
    </motion.div>
    </SwipeBackWrapper>
  );
};
