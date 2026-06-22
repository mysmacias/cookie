import React from 'react';
import { motion } from 'motion/react';
import { X, Plus } from 'lucide-react';
import type { Ingredient, Step } from '../../types';
import { Input, Textarea } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';

interface RecipeFormStepsProps {
  steps: Step[];
  ingredients: Ingredient[];
  stepTitle: string; setStepTitle: (v: string) => void;
  stepDesc: string; setStepDesc: (v: string) => void;
  stepTimer: string; setStepTimer: (v: string) => void;
  stepIngredientPick: number[];
  toggleStepIngredientIndex: (idx: number) => void;
  addStep: () => void;
  removeStep: (idx: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const RecipeFormSteps: React.FC<RecipeFormStepsProps> = ({
  steps, ingredients,
  stepTitle, setStepTitle, stepDesc, setStepDesc,
  stepTimer, setStepTimer, stepIngredientPick,
  toggleStepIngredientIndex, addStep, removeStep,
  onBack, onNext,
}) => (
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
                    Uses: {s.ingredientIndices.map(idx => ingredients[idx]?.name).filter(Boolean).join(', ')}
                  </p>
                )}
                {s.timer && (
                  <p className="text-xs text-secondary mt-1">{Math.floor(s.timer / 60)} min timer</p>
                )}
              </div>
            </div>
            <button type="button" onClick={() => removeStep(i)} className="text-on-surface-variant hover:text-secondary transition-colors ml-4 flex-shrink-0">
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
    )}

    <div className="space-y-4">
      <div className="space-y-2">
        <Label as="label">Step Title</Label>
        <Input placeholder="e.g. Preheat and Prep" value={stepTitle} onChange={e => setStepTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label as="label">Description</Label>
        <Textarea className="h-24" placeholder="Describe what to do in this step..." value={stepDesc} onChange={e => setStepDesc(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label as="label">Timer (minutes, optional)</Label>
        <Input type="number" placeholder="e.g. 10" value={stepTimer} onChange={e => setStepTimer(e.target.value)} min="0" />
      </div>
      {ingredients.length > 0 ? (
        <div className="space-y-2">
          <Label as="label">Ingredients in this step (optional)</Label>
          <ul className="flex flex-wrap gap-2">
            {ingredients.map((ing, idx) => {
              const on = stepIngredientPick.includes(idx);
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => toggleStepIngredientIndex(idx)}
                    className={`rounded-full px-3 py-1.5 text-xs font-label uppercase tracking-wider border transition-colors ${
                      on ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
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
      <Button variant="outline" onClick={addStep} icon={<Plus size={14} />}>Add Step</Button>
    </div>

    <div className="flex items-center gap-4 pt-4">
      <Button variant="outline" onClick={onBack}>Back</Button>
      <Button variant="primary" size="lg" disabled={steps.length === 0} onClick={onNext} className="flex-1">
        Review Recipe
      </Button>
    </div>
  </motion.div>
);
