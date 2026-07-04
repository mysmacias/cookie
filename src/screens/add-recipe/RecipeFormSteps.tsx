import React from 'react';
import { motion } from 'motion/react';
import { X, Plus, Pencil, ChevronUp, ChevronDown } from 'lucide-react';
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
  moveStep: (idx: number, dir: -1 | 1) => void;
  editStep: (idx: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const RecipeFormSteps: React.FC<RecipeFormStepsProps> = ({
  steps, ingredients,
  stepTitle, setStepTitle, stepDesc, setStepDesc,
  stepTimer, setStepTimer, stepIngredientPick,
  toggleStepIngredientIndex, addStep, removeStep, moveStep, editStep,
  onBack, onNext,
}) => {
  // ⌘/Ctrl+Enter from either field commits the step, keeping hands on the keyboard.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      addStep();
    }
  };

  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8 bg-surface-container p-6 sm:p-10 rounded-2xl border border-outline-variant/30"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-4xl font-headline italic">Steps</h2>
        {steps.length > 0 && (
          <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
            {steps.length} step{steps.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {steps.length > 0 && (
        <ul className="space-y-0">
          {steps.map((s, i) => (
            <motion.li
              key={`${s.title}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between py-4 border-b border-outline-variant/20"
            >
              <div className="flex gap-4 min-w-0">
                <span className="flex-shrink-0 w-8 h-8 rounded-full border border-primary flex items-center justify-center text-primary font-headline italic text-sm">
                  {i + 1}
                </span>
                <div className="min-w-0">
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
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-25"
                    aria-label={`Move step ${i + 1} up`}
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="text-on-surface-variant hover:text-primary transition-colors disabled:opacity-25"
                    aria-label={`Move step ${i + 1} down`}
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => editStep(i)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  aria-label={`Edit step ${i + 1}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-on-surface-variant hover:text-secondary transition-colors"
                  aria-label={`Remove step ${i + 1}`}
                >
                  <X size={16} />
                </button>
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label as="label" htmlFor="step-description">What happens in this step?</Label>
          <Textarea
            id="step-description"
            className="h-24"
            placeholder="e.g. Cream the butter and sugar until pale and fluffy..."
            value={stepDesc}
            onChange={e => setStepDesc(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-8">
          <div className="space-y-2">
            <Label as="label" htmlFor="step-title">Title (optional)</Label>
            <Input
              id="step-title"
              placeholder={`e.g. Preheat and Prep`}
              value={stepTitle}
              onChange={e => setStepTitle(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-2">
            <Label as="label" htmlFor="step-timer">Timer (minutes, optional)</Label>
            <Input id="step-timer" type="number" placeholder="e.g. 10" value={stepTimer} onChange={e => setStepTimer(e.target.value)} min="0" onKeyDown={handleKeyDown} />
          </div>
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
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={addStep} disabled={!stepDesc.trim()} icon={<Plus size={14} />}>
            Add Step
          </Button>
          <span className="text-xs text-on-surface-variant">
            or press <kbd className="rounded border border-outline-variant/50 px-1.5 py-0.5 text-[10px]">⌘ Enter</kbd>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button variant="primary" size="lg" disabled={steps.length === 0} onClick={onNext} className="flex-1">
          Review Recipe
        </Button>
      </div>
    </motion.div>
  );
};
