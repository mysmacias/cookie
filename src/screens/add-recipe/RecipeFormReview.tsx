import React from 'react';
import { motion } from 'motion/react';
import type { Ingredient, Step, Recipe } from '../../types';
import { Label } from '../../components/ui/Label';
import { Button } from '../../components/ui/Button';

interface RecipeFormReviewProps {
  title: string;
  description: string;
  heroImage: string;
  category: string;
  difficulty: Recipe['difficulty'];
  prepTime: string;
  bakeTime?: string;
  yields?: string;
  chefNote?: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
  isEdit: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

export const RecipeFormReview: React.FC<RecipeFormReviewProps> = ({
  title, description, heroImage, category, difficulty, prepTime,
  bakeTime, yields, chefNote,
  tags, ingredients, steps, isEdit, onBack, onSubmit,
}) => (
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
        <Label>Title</Label>
        <p className="text-2xl font-headline italic">{title}</p>
      </div>
      {description && (
        <div className="space-y-1">
          <Label>Description</Label>
          <p className="text-on-surface-variant italic">{description}</p>
        </div>
      )}
      {tags.length > 0 ? (
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t, i) => (
              <span key={`${t}-${i}`} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-label uppercase tracking-wider">
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-8 py-4 border-y border-outline-variant/30">
        <div className="space-y-1">
          <Label>Category</Label>
          <p className="font-headline italic text-lg">{category || 'Uncategorized'}</p>
        </div>
        <div className="space-y-1">
          <Label>Difficulty</Label>
          <p className="font-headline italic text-lg">{difficulty}</p>
        </div>
        {prepTime && (
          <div className="space-y-1">
            <Label>Prep Time</Label>
            <p className="font-headline italic text-lg">{prepTime}</p>
          </div>
        )}
        {bakeTime && (
          <div className="space-y-1">
            <Label>Bake Time</Label>
            <p className="font-headline italic text-lg">{bakeTime}</p>
          </div>
        )}
        {yields && (
          <div className="space-y-1">
            <Label>Yields</Label>
            <p className="font-headline italic text-lg">{yields}</p>
          </div>
        )}
        <div className="space-y-1">
          <Label>Ingredients</Label>
          <p className="font-headline italic text-lg">{ingredients.length}</p>
        </div>
        <div className="space-y-1">
          <Label>Steps</Label>
          <p className="font-headline italic text-lg">{steps.length}</p>
        </div>
      </div>
    </div>

    {chefNote && (
      <div className="space-y-1">
        <Label>Chef's Note</Label>
        <p className="text-on-surface-variant italic">{chefNote}</p>
      </div>
    )}

    <div className="flex items-center gap-4 pt-4">
      <Button variant="outline" onClick={onBack}>Back</Button>
      <Button variant="primary" size="lg" onClick={onSubmit} className="flex-1">
        {isEdit ? 'Save changes' : 'Submit recipe'}
      </Button>
    </div>
  </motion.div>
);
