import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, ImagePlus, Pencil, ClipboardList } from 'lucide-react';
import type { Ingredient } from '../../types';
import { fileToDataUrl } from '../../utils/fileHelpers';
import { parseIngredientLines } from '../../utils/parseIngredientLines';
import { Input, Textarea } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';

interface RecipeFormIngredientsProps {
  ingredients: Ingredient[];
  ingName: string; setIngName: (v: string) => void;
  ingAmount: string; setIngAmount: (v: string) => void;
  ingImage: string; setIngImage: (v: string) => void;
  addIngredient: () => void;
  addIngredientsBulk: (rows: Ingredient[]) => void;
  removeIngredient: (idx: number) => void;
  editIngredient: (idx: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const RecipeFormIngredients: React.FC<RecipeFormIngredientsProps> = ({
  ingredients, ingName, setIngName, ingAmount, setIngAmount,
  ingImage, setIngImage, addIngredient, addIngredientsBulk,
  removeIngredient, editIngredient,
  onBack, onNext,
}) => {
  const ingFileRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleIngFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setIngImage(await fileToDataUrl(file));
  };

  // Enter anywhere in the row adds the ingredient and puts the cursor back on
  // the name field, so a whole list can be typed without touching the mouse.
  const addAndRefocus = () => {
    if (!ingName.trim()) return;
    addIngredient();
    nameInputRef.current?.focus();
  };
  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAndRefocus();
    }
  };

  const handlePasteAdd = () => {
    const rows = parseIngredientLines(pasteText);
    if (rows.length === 0) return;
    addIngredientsBulk(rows);
    setPasteText('');
    setPasteOpen(false);
  };

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 bg-surface-container p-6 sm:p-10 rounded-2xl border border-outline-variant/30"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-4xl font-headline italic">Ingredients</h2>
        {ingredients.length > 0 && (
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
            {ingredients.length} so far
          </span>
        )}
      </div>

      {ingredients.length > 0 && (
        <ul className="space-y-0">
          {ingredients.map((ing, i) => (
            <motion.li
              key={`${ing.name}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between py-4 border-b border-outline-variant/20"
            >
              <div className="flex items-center space-x-4 min-w-0">
                {ing.image ? (
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-surface-container shrink-0">
                    <img src={ing.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                ) : null}
                <span className="text-lg font-light truncate">{ing.name}</span>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                {ing.amount ? (
                  <span className="font-headline italic text-primary">{ing.amount}</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => { editIngredient(i); nameInputRef.current?.focus(); }}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  aria-label={`Edit ${ing.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="text-on-surface-variant hover:text-secondary transition-colors"
                  aria-label={`Remove ${ing.name}`}
                >
                  <X size={16} />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[140px] space-y-2">
            <Label as="label" htmlFor="ingredient-name">Ingredient Name</Label>
            <Input
              id="ingredient-name"
              ref={nameInputRef}
              placeholder="e.g. All-purpose Flour"
              value={ingName}
              onChange={e => setIngName(e.target.value)}
              onKeyDown={handleRowKeyDown}
            />
          </div>
          <div className="flex-1 min-w-[140px] space-y-2">
            <Label as="label" htmlFor="ingredient-amount">Amount (optional)</Label>
            <Input
              id="ingredient-amount"
              placeholder="e.g. 2 cups"
              value={ingAmount}
              onChange={e => setIngAmount(e.target.value)}
              onKeyDown={handleRowKeyDown}
            />
          </div>
          <button
            type="button"
            onClick={addAndRefocus}
            aria-label="Add ingredient"
            className="p-4 bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shrink-0"
          >
            <Plus size={20} />
          </button>
        </div>
        <p className="text-xs text-on-surface-variant">
          Tip: press <kbd className="rounded border border-outline-variant/50 px-1.5 py-0.5 text-[10px]">Enter</kbd> to
          add and keep typing.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] space-y-2">
            <Label as="label">Ingredient photo (optional)</Label>
            <Input
              type="url"
              placeholder="Image URL or upload"
              value={ingImage.startsWith('data:') ? '' : ingImage}
              onChange={e => setIngImage(e.target.value)}
            />
          </div>
          <input ref={ingFileRef} type="file" accept="image/*" className="hidden" onChange={handleIngFile} />
          <Button variant="outline" size="sm" pill={false} onClick={() => ingFileRef.current?.click()} icon={<ImagePlus size={16} />}>
            Upload
          </Button>
        </div>
        {ingImage ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container">
              <img src={ingImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <button type="button" onClick={() => setIngImage('')} className="text-xs font-label uppercase tracking-widest text-secondary">
              Clear photo
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-outline-variant/30 bg-surface p-5 space-y-3">
        {pasteOpen ? (
          <>
            <div>
              <Label className="opacity-70">Paste a list</Label>
              <p className="text-xs text-on-surface-variant mt-1">
                One ingredient per line — "2 cups flour", "1 tsp vanilla"… we'll sort amounts from names.
              </p>
            </div>
            <Textarea
              className="h-32 bg-surface-container-low"
              placeholder={'2 cups flour\n1 tsp vanilla\nSalt to taste'}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-3">
              <Button variant="primary" size="sm" onClick={handlePasteAdd} disabled={!pasteText.trim()}>
                Add all
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setPasteOpen(false); setPasteText(''); }}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPasteOpen(true)}
            className="flex w-full items-center gap-3 text-left"
          >
            <ClipboardList size={18} aria-hidden className="text-primary shrink-0" />
            <span className="text-sm text-on-surface-variant">
              Have the list written down already?{' '}
              <span className="text-primary underline underline-offset-2">Paste it all at once</span>
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button variant="primary" size="lg" disabled={ingredients.length === 0} onClick={onNext} className="flex-1">
          Continue to Steps
        </Button>
      </div>
    </motion.div>
  );
};
