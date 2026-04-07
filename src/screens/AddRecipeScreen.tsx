import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor, CapacitorException } from '@capacitor/core';
import { CookieRecipeIntelligence } from 'cookie-recipe-intelligence';
import type { ScanRecipeFromImageResult } from 'cookie-recipe-intelligence';
import { ChevronLeft, X, Plus, ImagePlus, ScanLine } from 'lucide-react';
import { Ingredient, Step, Recipe } from '../types';
import { addRecipe, updateRecipe } from '../services/recipeStore';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface AddRecipeScreenProps {
  onBack: () => void;
  editingRecipe?: Recipe | null;
  onSaved?: () => void;
}

export const AddRecipeScreen: React.FC<AddRecipeScreenProps> = ({ onBack, editingRecipe, onSaved }) => {
  const heroFileRef = useRef<HTMLInputElement>(null);
  const ingFileRef = useRef<HTMLInputElement>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [step, setStep] = useState(1);

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
  /** Ingredient indices to attach to the next added step */
  const [stepIngredientPick, setStepIngredientPick] = useState<number[]>([]);

  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanFromPhotoSupported =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

  const buildPayload = useCallback((): Omit<Recipe, 'id'> => {
    return {
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
    };
  }, [
    title,
    description,
    heroImage,
    difficulty,
    timeDisplay,
    prepTime,
    bakeTime,
    yields,
    category,
    tags,
    ingredients,
    steps,
    chefNote,
  ]);

  type PersistSnap = {
    editId: string | null;
    isHeirloom?: boolean;
    payload: Omit<Recipe, 'id'>;
  };
  const formSnapRef = useRef<PersistSnap>({
    editId: null,
    payload: {
      title: '',
      description: '',
      image: '',
      difficulty: 'Easy',
      time: '',
      prepTime: '',
      category: 'Uncategorized',
      ingredients: [],
      steps: [],
    },
  });
  formSnapRef.current = {
    editId: editingRecipe?.id ?? null,
    isHeirloom: editingRecipe?.isHeirloom,
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
    setStep(1);
    skipAutosaveUntil.current = Date.now() + 350;
  }, [editingRecipe]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    if (!editingRecipe?.id) return;
    if (!title.trim()) return;

    const id = editingRecipe.id;
    const isHeirloom = editingRecipe.isHeirloom;

    const timer = window.setTimeout(() => {
      if (Date.now() < skipAutosaveUntil.current) return;
      const snap = formSnapRef.current;
      if (!snap.editId || snap.editId !== id) return;
      if (!snap.payload.title.trim()) return;
      updateRecipe({
        id,
        isHeirloom,
        ...snap.payload,
      });
      onSavedRef.current?.();
    }, 420);

    return () => clearTimeout(timer);
  }, [
    editingRecipe?.id,
    editingRecipe?.isHeirloom,
    title,
    description,
    prepTime,
    timeDisplay,
    bakeTime,
    yields,
    heroImage,
    difficulty,
    category,
    tags,
    chefNote,
    ingredients,
    steps,
  ]);

  const persistEditNow = useCallback(() => {
    if (!editingRecipe?.id || !title.trim()) return;
    updateRecipe({
      id: editingRecipe.id,
      isHeirloom: !!editingRecipe.isHeirloom,
      ...buildPayload(),
    });
    onSavedRef.current?.();
  }, [editingRecipe, title, buildPayload]);

  useEffect(() => {
    return () => {
      const { editId, isHeirloom, payload } = formSnapRef.current;
      if (!editId || !payload.title.trim()) return;
      updateRecipe({
        id: editId,
        isHeirloom,
        ...payload,
      });
      onSavedRef.current?.();
    };
  }, []);

  const handleHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setHeroImage(await fileToDataUrl(file));
  };

  const handleIngFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setIngImage(await fileToDataUrl(file));
  };

  const handleAddIngredient = () => {
    if (!ingName.trim() || !ingAmount.trim()) return;
    const row: Ingredient = { name: ingName.trim(), amount: ingAmount.trim() };
    const img = ingImage.trim();
    if (img) row.image = img;
    setIngredients([...ingredients, row]);
    setIngName('');
    setIngAmount('');
    setIngImage('');
  };

  const commitTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const norm = t.toLowerCase();
    if (tags.some(x => x.toLowerCase() === norm)) {
      setTagInput('');
      return;
    }
    setTags([...tags, t]);
    setTagInput('');
  };

  const toggleStepIngredientIndex = (idx: number) => {
    setStepIngredientPick(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  };

  const applyScanResult = useCallback((result: ScanRecipeFromImageResult) => {
    const r = result.recipe;
    if (r.title.trim()) setTitle(r.title.trim());
    const body = r.description.trim();
    const sum = result.summary.trim();
    if (body && sum) setDescription(`${sum}\n\n${body}`.trim());
    else setDescription(body || sum);
    if (r.prepTime.trim()) setPrepTime(r.prepTime.trim());
    if (r.timeDisplay.trim()) setTimeDisplay(r.timeDisplay.trim());
    else if (r.prepTime.trim()) setTimeDisplay(r.prepTime.trim());
    if (r.bakeTime.trim()) setBakeTime(r.bakeTime.trim());
    if (r.yields.trim()) setYields(r.yields.trim());
    if (r.category.trim()) setCategory(r.category.trim());
    if (r.tags.length > 0) {
      setTags(
        r.tags
          .map(t => t.trim())
          .filter(Boolean)
          .filter((t, i, a) => a.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i),
      );
    }
    const ingRows: Ingredient[] = r.ingredients
      .filter(i => i.name.trim() && i.amount.trim())
      .map(i => ({ name: i.name.trim(), amount: i.amount.trim() }));
    setIngredients(ingRows);
    const stepRows: Step[] = r.steps
      .filter(s => s.title.trim() && s.description.trim())
      .map(s => ({ title: s.title.trim(), description: s.description.trim() }));
    setSteps(stepRows);
    if (r.chefNote.trim()) setChefNote(r.chefNote.trim());
  }, []);

  const handleScanFromPhoto = async () => {
    setScanError(null);
    setScanBusy(true);
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
      });
      if (!photo.dataUrl) return;
      const out = await CookieRecipeIntelligence.scanRecipeFromImage({
        imageBase64: photo.dataUrl,
      });
      applyScanResult(out);
      setHeroImage(photo.dataUrl);
    } catch (e: unknown) {
      if (e instanceof CapacitorException) {
        const m = e.message ?? '';
        if (/cancel/i.test(m)) return;
        setScanError(m || 'Scan failed.');
        return;
      }
      if (e instanceof Error && /cancel/i.test(e.message)) return;
      setScanError(e instanceof Error ? e.message : 'Scan failed.');
    } finally {
      setScanBusy(false);
    }
  };

  const handleAddStep = () => {
    if (!stepTitle.trim() || !stepDesc.trim()) return;
    const newStep: Step = { title: stepTitle.trim(), description: stepDesc.trim() };
    if (stepTimer && Number(stepTimer) > 0) {
      newStep.timer = Number(stepTimer) * 60;
    }
    if (stepIngredientPick.length > 0) {
      newStep.ingredientIndices = [...stepIngredientPick];
    }
    setSteps([...steps, newStep]);
    setStepTitle('');
    setStepDesc('');
    setStepTimer('');
    setStepIngredientPick([]);
  };

  const handleSubmit = () => {
    const payload = buildPayload();

    if (editingRecipe) {
      updateRecipe({
        id: editingRecipe.id,
        isHeirloom: editingRecipe.isHeirloom,
        ...payload,
      });
      onSavedRef.current?.();
    } else {
      addRecipe(payload);
      onSavedRef.current?.();
    }
    onBack();
  };

  const isEdit = Boolean(editingRecipe);

  const handleBack = () => {
    persistEditNow();
    onBack();
  };

  return (
    <SwipeBackWrapper onBack={handleBack}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-12"
    >
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center space-x-2 text-sm font-label uppercase tracking-widest hover:text-primary transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Back</span>
      </button>

      <div className="space-y-4">
        <h1 className="text-6xl font-headline italic">{isEdit ? 'Edit Recipe' : 'Submit a Recipe'}</h1>
        <p className="text-on-surface-variant text-lg">
          {isEdit
            ? 'Changes are saved automatically as you edit — no need to reach the last step.'
            : 'Share your culinary secrets with COOKIE.'}
        </p>
      </div>

      <p className="text-[10px] font-label uppercase tracking-widest opacity-50">Step {step} of 4</p>

      {step === 1 && (
        <motion.form
          key="step1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8 bg-surface-container p-10 rounded-2xl border border-outline-variant/30"
        >
          {scanFromPhotoSupported ? (
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-6 space-y-4">
              <div>
                <p className="text-[10px] font-label uppercase tracking-widest opacity-70">Scan recipe</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Take or choose a photo of a recipe. On-device Apple Intelligence reads the text and fills this form—your
                  image stays on the device.
                </p>
              </div>
              {scanError ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {scanError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={scanBusy}
                onClick={() => void handleScanFromPhoto()}
                className="inline-flex items-center gap-2 border border-primary/40 rounded-full px-5 py-3 font-label uppercase tracking-widest text-[10px] hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <ScanLine size={18} aria-hidden />
                {scanBusy ? 'Scanning…' : 'Scan from photo'}
              </button>
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs font-label uppercase tracking-widest opacity-50">Recipe Title</label>
            <input
              type="text"
              className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Grandma's Famous Shortbread"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-label uppercase tracking-widest opacity-50">Description</label>
            <textarea
              className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 h-32"
              placeholder="Tell us the story behind this dish..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Prep Time</label>
              <input
                type="text"
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="20 mins"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Difficulty</label>
              <select
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 appearance-none"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Recipe['difficulty'])}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Advanced</option>
                <option>Expert</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Total Time (card)</label>
              <input
                type="text"
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 45 mins"
                value={timeDisplay}
                onChange={(e) => setTimeDisplay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Bake Time (optional)</label>
              <input
                type="text"
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 10 mins"
                value={bakeTime}
                onChange={(e) => setBakeTime(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-label uppercase tracking-widest opacity-50">Yields (optional)</label>
            <input
              type="text"
              className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. 24 cookies"
              value={yields}
              onChange={(e) => setYields(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-label uppercase tracking-widest opacity-50">Hero image</label>
            <input
              type="url"
              className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
              placeholder="Image URL, or use upload below"
              value={heroImage.startsWith('data:') ? '' : heroImage}
              onChange={(e) => setHeroImage(e.target.value)}
            />
            <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroFile} />
            <button
              type="button"
              onClick={() => heroFileRef.current?.click()}
              className="inline-flex items-center gap-2 border border-outline-variant rounded-full px-5 py-3 font-label uppercase tracking-widest text-[10px] hover:bg-surface transition-colors"
            >
              <ImagePlus size={16} />
              <span>Upload photo</span>
            </button>
            {heroImage ? (
              <div className="relative w-40 aspect-[4/5] rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container">
                <img src={heroImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={() => setHeroImage('')}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-surface/90 text-on-surface shadow-sm"
                  aria-label="Remove image"
                >
                  <X size={14} />
                </button>
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-label uppercase tracking-widest opacity-50">Category</label>
            <input
              type="text"
              className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Dessert, Bread, Main Course"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Tags</label>
              <p className="text-xs text-on-surface-variant mt-1">
                Helps discover this recipe in search — try <em className="not-italic">weeknight</em>,{' '}
                <em className="not-italic">vegan</em>, <em className="not-italic">gluten-free</em>, etc.
              </p>
            </div>
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {tags.map((t, i) => (
                  <li
                    key={`${t}-${i}`}
                    className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-primary/10 text-primary text-xs font-label uppercase tracking-wider"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                      className="p-1 rounded-full hover:bg-primary/20"
                      aria-label={`Remove tag ${t}`}
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="Add a tag, press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={commitTag}
                className="px-5 rounded-xl border border-outline-variant font-label uppercase tracking-widest text-[10px] hover:bg-surface transition-colors shrink-0"
              >
                Add
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-label uppercase tracking-widest opacity-50">Chef's Note (optional)</label>
            <textarea
              className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 h-24"
              placeholder="Any tips or secrets..."
              value={chefNote}
              onChange={(e) => setChefNote(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={!title.trim()}
            onClick={() => setStep(2)}
            className="w-full bg-primary text-on-primary py-5 rounded-full font-label uppercase tracking-widest text-sm font-bold hover:bg-primary-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue to Ingredients
          </button>
        </motion.form>
      )}

      {step === 2 && (
        <motion.div
          key="step2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8 bg-surface-container p-10 rounded-2xl border border-outline-variant/30"
        >
          <h2 className="text-4xl font-headline italic">Ingredients</h2>

          {ingredients.length > 0 && (
            <ul className="space-y-0">
              {ingredients.map((ing, i) => (
                <li key={i} className="flex items-center justify-between py-4 border-b border-outline-variant/20">
                  <div className="flex items-center space-x-4 min-w-0">
                    {ing.image ? (
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-container shrink-0">
                        <img src={ing.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    ) : null}
                    <span className="text-lg font-light truncate">{ing.name}</span>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <span className="font-headline italic text-primary">{ing.amount}</span>
                    <button
                      type="button"
                      onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}
                      className="text-on-surface-variant hover:text-secondary transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[140px] space-y-2">
                <label className="text-xs font-label uppercase tracking-widest opacity-50">Ingredient Name</label>
                <input
                  type="text"
                  className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. All-purpose Flour"
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[140px] space-y-2">
                <label className="text-xs font-label uppercase tracking-widest opacity-50">Amount</label>
                <input
                  type="text"
                  className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                  placeholder="e.g. 2 cups"
                  value={ingAmount}
                  onChange={(e) => setIngAmount(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="p-4 bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shrink-0"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-xs font-label uppercase tracking-widest opacity-50">Ingredient photo (optional)</label>
                <input
                  type="url"
                  className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                  placeholder="Image URL or upload"
                  value={ingImage.startsWith('data:') ? '' : ingImage}
                  onChange={(e) => setIngImage(e.target.value)}
                />
              </div>
              <input ref={ingFileRef} type="file" accept="image/*" className="hidden" onChange={handleIngFile} />
              <button
                type="button"
                onClick={() => ingFileRef.current?.click()}
                className="inline-flex items-center gap-2 border border-outline-variant rounded-xl px-4 py-3 font-label uppercase tracking-widest text-[10px] hover:bg-surface transition-colors shrink-0"
              >
                <ImagePlus size={16} />
                <span>Upload</span>
              </button>
            </div>
            {ingImage ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container">
                  <img src={ingImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <button
                  type="button"
                  onClick={() => setIngImage('')}
                  className="text-xs font-label uppercase tracking-widest text-secondary"
                >
                  Clear photo
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="border border-outline-variant rounded-full px-6 py-3 font-label uppercase tracking-widest text-xs"
            >
              Back
            </button>
            <button
              type="button"
              disabled={ingredients.length === 0}
              onClick={() => setStep(3)}
              className="flex-1 bg-primary text-on-primary py-5 rounded-full font-label uppercase tracking-widest text-sm font-bold hover:bg-primary-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue to Steps
            </button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8 bg-surface-container p-10 rounded-2xl border border-outline-variant/30"
        >
          <h2 className="text-4xl font-headline italic">Steps</h2>

          {steps.length > 0 && (
            <ul className="space-y-0">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start justify-between py-4 border-b border-outline-variant/20">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full border border-primary flex items-center justify-center text-primary font-headline italic text-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-headline italic text-lg">{s.title}</p>
                      <p className="text-on-surface-variant text-sm mt-1">{s.description}</p>
                      {s.ingredientIndices && s.ingredientIndices.length > 0 && (
                        <p className="text-[10px] font-label uppercase tracking-widest text-primary/80 mt-2">
                          Uses:{' '}
                          {s.ingredientIndices
                            .map(i => ingredients[i]?.name)
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      )}
                      {s.timer && (
                        <p className="text-xs text-secondary mt-1">{Math.floor(s.timer / 60)} min timer</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSteps(steps.filter((_, idx) => idx !== i))}
                    className="text-on-surface-variant hover:text-secondary transition-colors ml-4 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Step Title</label>
              <input
                type="text"
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Preheat and Prep"
                value={stepTitle}
                onChange={(e) => setStepTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Description</label>
              <textarea
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 h-24"
                placeholder="Describe what to do in this step..."
                value={stepDesc}
                onChange={(e) => setStepDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-label uppercase tracking-widest opacity-50">Timer (minutes, optional)</label>
              <input
                type="number"
                className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 10"
                value={stepTimer}
                onChange={(e) => setStepTimer(e.target.value)}
                min="0"
              />
            </div>
            {ingredients.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-label uppercase tracking-widest opacity-50">
                  Ingredients in this step (optional)
                </label>
                <ul className="flex flex-wrap gap-2">
                  {ingredients.map((ing, idx) => {
                    const on = stepIngredientPick.includes(idx);
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => toggleStepIngredientIndex(idx)}
                          className={`rounded-full px-3 py-1.5 text-xs font-label uppercase tracking-wider border transition-colors ${
                            on
                              ? 'bg-primary text-on-primary border-primary'
                              : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                          }`}
                        >
                          {ing.name}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleAddStep}
              className="flex items-center space-x-2 border border-outline-variant rounded-full px-6 py-3 font-label uppercase tracking-widest text-xs hover:bg-surface transition-colors"
            >
              <Plus size={14} />
              <span>Add Step</span>
            </button>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="border border-outline-variant rounded-full px-6 py-3 font-label uppercase tracking-widest text-xs"
            >
              Back
            </button>
            <button
              type="button"
              disabled={steps.length === 0}
              onClick={() => setStep(4)}
              className="flex-1 bg-primary text-on-primary py-5 rounded-full font-label uppercase tracking-widest text-sm font-bold hover:bg-primary-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Review Recipe
            </button>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          key="step4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8 bg-surface-container p-10 rounded-2xl border border-outline-variant/30"
        >
          <h2 className="text-4xl font-headline italic">Review Your Recipe</h2>

          <div className="space-y-6">
            {heroImage ? (
              <div className="w-full max-w-xs aspect-[4/5] rounded-xl overflow-hidden border border-outline-variant/30">
                <img src={heroImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : null}
            <div className="space-y-1">
              <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Title</span>
              <p className="text-2xl font-headline italic">{title}</p>
            </div>
            {description && (
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Description</span>
                <p className="text-on-surface-variant italic">{description}</p>
              </div>
            )}
            {tags.length > 0 ? (
              <div className="space-y-2">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span
                      key={`${t}-${i}`}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-label uppercase tracking-wider"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-8 py-4 border-y border-outline-variant/30">
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Category</span>
                <p className="font-headline italic text-lg">{category || 'Uncategorized'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Difficulty</span>
                <p className="font-headline italic text-lg">{difficulty}</p>
              </div>
              {prepTime && (
                <div className="space-y-1">
                  <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Prep Time</span>
                  <p className="font-headline italic text-lg">{prepTime}</p>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Ingredients</span>
                <p className="font-headline italic text-lg">{ingredients.length}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Steps</span>
                <p className="font-headline italic text-lg">{steps.length}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="border border-outline-variant rounded-full px-6 py-3 font-label uppercase tracking-widest text-xs"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-primary text-on-primary py-5 rounded-full font-label uppercase tracking-widest text-sm font-bold hover:bg-primary-container transition-all"
            >
              {isEdit ? 'Save changes' : 'Submit recipe'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
    </SwipeBackWrapper>
  );
};
