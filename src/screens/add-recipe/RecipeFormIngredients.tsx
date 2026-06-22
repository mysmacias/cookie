import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { X, Plus, ImagePlus } from 'lucide-react';
import type { Ingredient } from '../../types';
import { fileToDataUrl } from '../../utils/fileHelpers';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';

interface RecipeFormIngredientsProps {
  ingredients: Ingredient[];
  ingName: string; setIngName: (v: string) => void;
  ingAmount: string; setIngAmount: (v: string) => void;
  ingImage: string; setIngImage: (v: string) => void;
  addIngredient: () => void;
  removeIngredient: (idx: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const RecipeFormIngredients: React.FC<RecipeFormIngredientsProps> = ({
  ingredients, ingName, setIngName, ingAmount, setIngAmount,
  ingImage, setIngImage, addIngredient, removeIngredient,
  onBack, onNext,
}) => {
  const ingFileRef = useRef<HTMLInputElement>(null);

  const handleIngFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) setIngImage(await fileToDataUrl(file));
  };

  return (
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
                <button type="button" onClick={() => removeIngredient(i)} className="text-on-surface-variant hover:text-secondary transition-colors">
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
            <Label as="label">Ingredient Name</Label>
            <Input placeholder="e.g. All-purpose Flour" value={ingName} onChange={e => setIngName(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[140px] space-y-2">
            <Label as="label">Amount</Label>
            <Input placeholder="e.g. 2 cups" value={ingAmount} onChange={e => setIngAmount(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="p-4 bg-primary text-on-primary rounded-xl hover:bg-primary-container transition-colors shrink-0"
          >
            <Plus size={20} />
          </button>
        </div>
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

      <div className="flex items-center gap-4 pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button variant="primary" size="lg" disabled={ingredients.length === 0} onClick={onNext} className="flex-1">
          Continue to Steps
        </Button>
      </div>
    </motion.div>
  );
};
