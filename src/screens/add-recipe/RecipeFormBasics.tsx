import React, { useCallback, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { scanRecipeFromImage, RecipeScanError } from '../../services/recipeScan';
import type { ScanRecipeFromImageResult } from '../../services/recipeScan';
import { X, ImagePlus, ScanLine } from 'lucide-react';
import type { Ingredient, Step, Recipe } from '../../types';
import { fileToDataUrl } from '../../utils/fileHelpers';
import { Input, Textarea } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';

interface RecipeFormBasicsProps {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  prepTime: string; setPrepTime: (v: string) => void;
  timeDisplay: string; setTimeDisplay: (v: string) => void;
  bakeTime: string; setBakeTime: (v: string) => void;
  yields: string; setYields: (v: string) => void;
  heroImage: string; setHeroImage: (v: string) => void;
  difficulty: Recipe['difficulty']; setDifficulty: (v: Recipe['difficulty']) => void;
  category: string; setCategory: (v: string) => void;
  tags: string[]; setTags: (v: string[]) => void;
  tagInput: string; setTagInput: (v: string) => void;
  chefNote: string; setChefNote: (v: string) => void;
  setIngredients: (v: Ingredient[]) => void;
  setSteps: (v: Step[]) => void;
  commitTag: () => void;
  onNext: () => void;
}

export const RecipeFormBasics: React.FC<RecipeFormBasicsProps> = ({
  title, setTitle, description, setDescription,
  prepTime, setPrepTime, timeDisplay, setTimeDisplay,
  bakeTime, setBakeTime, yields, setYields,
  heroImage, setHeroImage, difficulty, setDifficulty,
  category, setCategory, tags, setTags,
  tagInput, setTagInput, chefNote, setChefNote,
  setIngredients, setSteps, commitTag, onNext,
}) => {
  const heroFileRef = useRef<HTMLInputElement>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

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
        r.tags.map(t => t.trim()).filter(Boolean)
          .filter((t, i, a) => a.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i),
      );
    }
    setIngredients(
      r.ingredients.filter(i => i.name.trim() && i.amount.trim())
        .map(i => ({ name: i.name.trim(), amount: i.amount.trim() })),
    );
    setSteps(
      r.steps.filter(s => s.title.trim() && s.description.trim())
        .map(s => ({ title: s.title.trim(), description: s.description.trim() })),
    );
    if (r.chefNote.trim()) setChefNote(r.chefNote.trim());
  }, [setTitle, setDescription, setPrepTime, setTimeDisplay, setBakeTime, setYields, setCategory, setTags, setIngredients, setSteps, setChefNote]);

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setScanError(null);
    setScanBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const out = await scanRecipeFromImage(dataUrl);
      applyScanResult(out);
      setHeroImage(dataUrl);
    } catch (err: unknown) {
      if (err instanceof RecipeScanError) setScanError(err.message);
      else setScanError(err instanceof Error ? err.message : 'Scan failed.');
    } finally {
      setScanBusy(false);
    }
  };

  const handleHeroFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setHeroImage(await fileToDataUrl(file));
  };

  return (
    <motion.form
      key="step1"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 bg-surface-container p-10 rounded-2xl border border-outline-variant/30"
    >
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-6 space-y-4">
        <div>
          <Label className="opacity-70">Scan recipe</Label>
          <p className="text-sm text-on-surface-variant mt-1">
            Snap or upload a photo of a recipe and we'll read the text and fill this form for you.
          </p>
        </div>
        {scanError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{scanError}</p>
        ) : null}
        <input
          ref={scanFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleScanFile}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={scanBusy}
          onClick={() => scanFileRef.current?.click()}
          icon={<ScanLine size={18} aria-hidden />}
          className="border-primary/40 hover:bg-primary/10"
        >
          {scanBusy ? 'Scanning…' : 'Scan from photo'}
        </Button>
      </div>

      <div className="space-y-2">
        <Label as="label">Recipe Title</Label>
        <Input placeholder="e.g. Grandma's Famous Shortbread" value={title} onChange={e => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label as="label">Description</Label>
        <Textarea className="h-32" placeholder="Tell us the story behind this dish..." value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-2">
          <Label as="label">Prep Time</Label>
          <Input placeholder="20 mins" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label as="label">Difficulty</Label>
          <select
            className="w-full bg-surface border-none p-4 rounded-xl focus:ring-2 focus:ring-primary/20 appearance-none"
            value={difficulty}
            onChange={e => setDifficulty(e.target.value as Recipe['difficulty'])}
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
          <Label as="label">Total Time (card)</Label>
          <Input placeholder="e.g. 45 mins" value={timeDisplay} onChange={e => setTimeDisplay(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label as="label">Bake Time (optional)</Label>
          <Input placeholder="e.g. 10 mins" value={bakeTime} onChange={e => setBakeTime(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label as="label">Yields (optional)</Label>
        <Input placeholder="e.g. 24 cookies" value={yields} onChange={e => setYields(e.target.value)} />
      </div>
      <div className="space-y-3">
        <Label as="label">Hero image</Label>
        <Input
          type="url"
          placeholder="Image URL, or use upload below"
          value={heroImage.startsWith('data:') ? '' : heroImage}
          onChange={e => setHeroImage(e.target.value)}
        />
        <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroFile} />
        <Button variant="outline" size="sm" onClick={() => heroFileRef.current?.click()} icon={<ImagePlus size={16} />}>
          Upload photo
        </Button>
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
        <Label as="label">Category</Label>
        <Input placeholder="e.g. Dessert, Bread, Main Course" value={category} onChange={e => setCategory(e.target.value)} />
      </div>
      <div className="space-y-3">
        <div>
          <Label as="label">Tags</Label>
          <p className="text-xs text-on-surface-variant mt-1">
            Helps discover this recipe in search — try <em className="not-italic">weeknight</em>,{' '}
            <em className="not-italic">vegan</em>, <em className="not-italic">gluten-free</em>, etc.
          </p>
        </div>
        {tags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <li key={`${t}-${i}`} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-primary/10 text-primary text-xs font-label uppercase tracking-wider">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((_, idx) => idx !== i))} className="p-1 rounded-full hover:bg-primary/20" aria-label={`Remove tag ${t}`}>
                  <X size={12} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex gap-3">
          <Input
            className="flex-1"
            placeholder="Add a tag, press Enter"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitTag(); } }}
          />
          <Button variant="outline" size="sm" pill={false} onClick={commitTag}>Add</Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label as="label">Chef's Note (optional)</Label>
        <Textarea className="h-24" placeholder="Any tips or secrets..." value={chefNote} onChange={e => setChefNote(e.target.value)} />
      </div>
      <Button variant="primary" size="lg" disabled={!title.trim()} onClick={onNext} className="w-full">
        Continue to Ingredients
      </Button>
    </motion.form>
  );
};
