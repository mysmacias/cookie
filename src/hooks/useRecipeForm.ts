import { useState, useEffect, useRef, useCallback } from 'react';
import type { Ingredient, Step, Recipe } from '../types';
import { useRecipes } from '../context/RecipeContext';

type PersistSnap = {
  editId: string | null;
  isHeirloom?: boolean;
  // Lineage travels outside the form payload (like isHeirloom) so saving a
  // branch through the wizard never severs it from its parent.
  parentId?: string;
  branchName?: string;
  branchNote?: string;
  payload: Omit<Recipe, 'id'>;
};

export function useRecipeForm(editingRecipe: Recipe | null | undefined, onSaved?: () => void) {
  const ctx = useRecipes();
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [wizardStep, setWizardStep] = useState(1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [timeDisplay, setTimeDisplay] = useState('');
  const [bakeTime, setBakeTime] = useState('');
  const [yields, setYields] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>('Easy');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [chefNote, setChefNote] = useState('');

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingName, setIngName] = useState('');
  const [ingAmount, setIngAmount] = useState('');
  const [ingImage, setIngImage] = useState('');

  const [steps, setSteps] = useState<Step[]>([]);
  const [stepTitle, setStepTitle] = useState('');
  const [stepDesc, setStepDesc] = useState('');
  const [stepTimer, setStepTimer] = useState('');
  const [stepIngredientPick, setStepIngredientPick] = useState<number[]>([]);

  const buildPayload = useCallback((): Omit<Recipe, 'id'> => ({
    title: title.trim(),
    description: description.trim(),
    image: heroImage.trim(),
    difficulty,
    time: timeDisplay.trim() || prepTime.trim(),
    prepTime: prepTime.trim(),
    bakeTime: bakeTime.trim() || undefined,
    yields: yields.trim() || undefined,
    category: category.trim() || 'Uncategorized',
    tags: tags.length > 0 ? tags : undefined,
    ingredients,
    steps,
    chefNote: chefNote.trim() || undefined,
  }), [title, description, heroImage, difficulty, timeDisplay, prepTime, bakeTime, yields, category, tags, ingredients, steps, chefNote]);

  // Draft bookkeeping for the "new recipe" flow: the wizard auto-saves the
  // in-progress recipe as a draft (draft: true) so nothing is lost, then clears
  // the flag when the user finishes. draftIdRef holds the id once created.
  const draftIdRef = useRef<string | null>(null);
  const creatingDraftRef = useRef(false);
  // In-flight first draft creation; submit awaits it so publishing while the
  // draft POST is still pending updates that record instead of creating a
  // duplicate (which would also strand a stray draft in the library).
  const pendingCreateRef = useRef<Promise<void> | null>(null);
  const isDraftRef = useRef<boolean>(editingRecipe?.draft === true);
  const submittedRef = useRef(false);

  const formSnapRef = useRef<PersistSnap>({
    editId: null,
    payload: {
      title: '', description: '', image: '', difficulty: 'Easy',
      time: '', prepTime: '', category: 'Uncategorized',
      ingredients: [], steps: [],
    },
  });
  formSnapRef.current = {
    editId: editingRecipe?.id ?? null,
    isHeirloom: editingRecipe?.isHeirloom,
    parentId: editingRecipe?.parentId,
    branchName: editingRecipe?.branchName,
    branchNote: editingRecipe?.branchNote,
    payload: buildPayload(),
  };

  const skipAutosaveUntil = useRef(0);

  useEffect(() => {
    if (!editingRecipe) return;
    setTitle(editingRecipe.title);
    setDescription(editingRecipe.description);
    setPrepTime(editingRecipe.prepTime);
    setTimeDisplay(editingRecipe.time || editingRecipe.prepTime);
    setBakeTime(editingRecipe.bakeTime || '');
    setYields(editingRecipe.yields || '');
    setHeroImage(editingRecipe.image || '');
    setDifficulty(editingRecipe.difficulty);
    setCategory(editingRecipe.category);
    setTags(editingRecipe.tags ? [...editingRecipe.tags] : []);
    setTagInput('');
    setChefNote(editingRecipe.chefNote || '');
    setIngredients(editingRecipe.ingredients.map(i => ({ ...i })));
    setSteps(editingRecipe.steps.map(s => ({ ...s })));
    setWizardStep(1);
    isDraftRef.current = editingRecipe.draft === true;
    submittedRef.current = false;
    skipAutosaveUntil.current = Date.now() + 350;
  }, [editingRecipe]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [wizardStep]);

  // Persist the in-progress form. A new recipe is saved as a draft (draft: true)
  // the moment it has a title, then updated in place as the user keeps typing;
  // editing an existing recipe preserves its current draft status. Publishing
  // (submit) flips submittedRef so no trailing save can resurrect the draft.
  const performSave = useCallback(async () => {
    if (submittedRef.current) return;
    const snap = formSnapRef.current;
    if (!snap.payload.title.trim()) return;
    const keepDraft = isDraftRef.current;

    if (snap.editId) {
      await ctx.updateRecipe({
        id: snap.editId,
        isHeirloom: snap.isHeirloom,
        parentId: snap.parentId,
        branchName: snap.branchName,
        branchNote: snap.branchNote,
        ...snap.payload,
        draft: keepDraft ? true : undefined,
      });
      onSavedRef.current?.();
      return;
    }

    if (draftIdRef.current) {
      await ctx.updateRecipe({
        id: draftIdRef.current,
        ...snap.payload,
        draft: keepDraft ? true : undefined,
      });
      onSavedRef.current?.();
      return;
    }

    // First save of a brand-new recipe: create it as a draft. The guard stops a
    // concurrent unmount/back save from creating a second draft.
    if (creatingDraftRef.current) return;
    creatingDraftRef.current = true;
    const create = (async () => {
      try {
        const created = await ctx.addRecipe({ ...snap.payload, draft: true });
        draftIdRef.current = created.id;
        isDraftRef.current = true;
        onSavedRef.current?.();
      } finally {
        creatingDraftRef.current = false;
        pendingCreateRef.current = null;
      }
    })();
    pendingCreateRef.current = create;
    await create;
  }, [ctx]);

  // Call the latest performSave from effects/handlers that must not re-run when
  // the closure changes (unmount, debounce timer).
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;

  // Debounced autosave for both new (draft) and existing recipes.
  useEffect(() => {
    if (!title.trim()) return;
    const timer = window.setTimeout(() => {
      if (Date.now() < skipAutosaveUntil.current) return;
      void performSaveRef.current();
    }, 420);
    return () => clearTimeout(timer);
  }, [title, description, prepTime, timeDisplay, bakeTime, yields, heroImage, difficulty, category, tags, chefNote, ingredients, steps]);

  const persistNow = useCallback(() => {
    void performSaveRef.current();
  }, []);

  // Manual "save draft" button: same persistence path as autosave, but with
  // visible progress/confirmation so the cook can bank their work on demand.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedResetRef = useRef<number | null>(null);

  const saveDraft = useCallback(async () => {
    if (!formSnapRef.current.payload.title.trim()) return;
    if (savedResetRef.current) window.clearTimeout(savedResetRef.current);
    setSaveState('saving');
    try {
      await performSaveRef.current();
      setSaveState('saved');
      savedResetRef.current = window.setTimeout(() => setSaveState('idle'), 2000);
    } catch {
      setSaveState('error');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (savedResetRef.current) window.clearTimeout(savedResetRef.current);
    };
  }, []);

  // Persist on unmount (e.g. browser back / swipe) so drafts and edits survive.
  useEffect(() => {
    return () => {
      void performSaveRef.current();
    };
  }, []);

  const commitTag = useCallback(() => {
    const t = tagInput.trim();
    if (!t) return;
    const norm = t.toLowerCase();
    if (tags.some(x => x.toLowerCase() === norm)) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  }, [tagInput, tags]);

  const addIngredient = useCallback(() => {
    if (!ingName.trim()) return;
    const row: Ingredient = { name: ingName.trim(), amount: ingAmount.trim() };
    const img = ingImage.trim();
    if (img) row.image = img;
    setIngredients(prev => [...prev, row]);
    setIngName('');
    setIngAmount('');
    setIngImage('');
  }, [ingName, ingAmount, ingImage]);

  const addIngredientsBulk = useCallback((rows: Ingredient[]) => {
    const clean = rows.filter(r => r.name.trim());
    if (clean.length === 0) return;
    setIngredients(prev => [...prev, ...clean]);
  }, []);

  const removeIngredient = useCallback((idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Pop an existing row back into the entry fields so typos are fixable
  // without retyping the whole line.
  const editIngredient = useCallback((idx: number) => {
    const ing = ingredients[idx];
    if (!ing) return;
    setIngName(ing.name);
    setIngAmount(ing.amount);
    setIngImage(ing.image || '');
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  }, [ingredients]);

  const toggleStepIngredientIndex = useCallback((idx: number) => {
    setStepIngredientPick(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  }, []);

  const addStep = useCallback(() => {
    if (!stepDesc.trim()) return;
    const timer = stepTimer && Number(stepTimer) > 0 ? Number(stepTimer) * 60 : undefined;
    const picks = stepIngredientPick.length > 0 ? [...stepIngredientPick] : undefined;
    setSteps(prev => {
      // Untitled steps get a friendly default so the title field never blocks flow.
      const newStep: Step = {
        title: stepTitle.trim() || `Step ${prev.length + 1}`,
        description: stepDesc.trim(),
      };
      if (timer) newStep.timer = timer;
      if (picks) newStep.ingredientIndices = picks;
      return [...prev, newStep];
    });
    setStepTitle('');
    setStepDesc('');
    setStepTimer('');
    setStepIngredientPick([]);
  }, [stepTitle, stepDesc, stepTimer, stepIngredientPick]);

  const removeStep = useCallback((idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const moveStep = useCallback((idx: number, dir: -1 | 1) => {
    setSteps(prev => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }, []);

  const editStep = useCallback((idx: number) => {
    const s = steps[idx];
    if (!s) return;
    setStepTitle(s.title);
    setStepDesc(s.description);
    setStepTimer(s.timer ? String(Math.round(s.timer / 60)) : '');
    setStepIngredientPick(s.ingredientIndices ? [...s.ingredientIndices] : []);
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }, [steps]);

  // Clear everything for a fresh recipe after "Add another" — including the
  // draft bookkeeping, so the next autosave creates a brand-new draft instead
  // of touching the recipe that was just published.
  const resetForNew = useCallback(() => {
    setTitle('');
    setDescription('');
    setPrepTime('');
    setTimeDisplay('');
    setBakeTime('');
    setYields('');
    setHeroImage('');
    setDifficulty('Easy');
    setCategory('');
    setTags([]);
    setTagInput('');
    setChefNote('');
    setIngredients([]);
    setIngName('');
    setIngAmount('');
    setIngImage('');
    setSteps([]);
    setStepTitle('');
    setStepDesc('');
    setStepTimer('');
    setStepIngredientPick([]);
    setWizardStep(1);
    draftIdRef.current = null;
    isDraftRef.current = false;
    submittedRef.current = false;
    skipAutosaveUntil.current = Date.now() + 350;
  }, []);

  const submit = useCallback(async (onBack: () => void) => {
    // Publishing: stop autosave from re-drafting and clear the draft flag.
    const wasDraft = isDraftRef.current;
    submittedRef.current = true;
    isDraftRef.current = false;
    try {
      // If the very first draft save is still in flight, wait for it so we
      // publish into that record instead of POSTing a duplicate. Its failure
      // is fine — we fall through to creating the recipe directly.
      if (pendingCreateRef.current) {
        await pendingCreateRef.current.catch(() => {});
      }
      const payload = buildPayload();
      if (editingRecipe) {
        await ctx.updateRecipe({
          id: editingRecipe.id,
          isHeirloom: editingRecipe.isHeirloom,
          parentId: editingRecipe.parentId,
          branchName: editingRecipe.branchName,
          branchNote: editingRecipe.branchNote,
          ...payload,
        });
      } else if (draftIdRef.current) {
        await ctx.updateRecipe({ id: draftIdRef.current, ...payload });
      } else {
        const created = await ctx.addRecipe(payload);
        draftIdRef.current = created.id;
      }
      onSavedRef.current?.();
      onBack();
    } catch (err) {
      // Publish failed: re-arm autosave and keep the work as a draft so
      // nothing is lost, then let the screen surface the error.
      submittedRef.current = false;
      isDraftRef.current = wasDraft || !editingRecipe;
      void performSaveRef.current();
      throw err;
    }
  }, [editingRecipe, buildPayload, ctx]);

  return {
    wizardStep, setWizardStep,
    title, setTitle, description, setDescription,
    prepTime, setPrepTime, timeDisplay, setTimeDisplay,
    bakeTime, setBakeTime, yields, setYields,
    heroImage, setHeroImage, difficulty, setDifficulty,
    category, setCategory, tags, setTags,
    tagInput, setTagInput, chefNote, setChefNote,
    ingredients, setIngredients,
    ingName, setIngName, ingAmount, setIngAmount,
    ingImage, setIngImage,
    steps, setSteps,
    stepTitle, setStepTitle, stepDesc, setStepDesc,
    stepTimer, setStepTimer,
    stepIngredientPick, setStepIngredientPick,
    buildPayload, persistNow, resetForNew,
    saveDraft, saveState,
    commitTag, addIngredient, addIngredientsBulk, removeIngredient, editIngredient,
    toggleStepIngredientIndex, addStep, removeStep, moveStep, editStep,
    submit,
    isEdit: Boolean(editingRecipe),
  };
}
