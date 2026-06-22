import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import type { Recipe } from '../types';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { Label } from '../components/ui/Label';
import { useRecipeForm } from '../hooks/useRecipeForm';
import { RecipeFormBasics } from './add-recipe/RecipeFormBasics';
import { RecipeFormIngredients } from './add-recipe/RecipeFormIngredients';
import { RecipeFormSteps } from './add-recipe/RecipeFormSteps';
import { RecipeFormReview } from './add-recipe/RecipeFormReview';

interface AddRecipeScreenProps {
  onBack: () => void;
  editingRecipe?: Recipe | null;
  onSaved?: () => void;
}

export const AddRecipeScreen: React.FC<AddRecipeScreenProps> = ({ onBack, editingRecipe, onSaved }) => {
  const form = useRecipeForm(editingRecipe, onSaved);

  const handleBack = () => {
    form.persistEditNow();
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
          <h1 className="text-6xl font-headline italic">
            {form.isEdit ? 'Edit Recipe' : 'Submit a Recipe'}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {form.isEdit
              ? 'Changes are saved automatically as you edit — no need to reach the last step.'
              : 'Share your culinary secrets with COOKIE.'}
          </p>
        </div>

        <Label>Step {form.wizardStep} of 4</Label>

        {form.wizardStep === 1 && (
          <RecipeFormBasics
            title={form.title} setTitle={form.setTitle}
            description={form.description} setDescription={form.setDescription}
            prepTime={form.prepTime} setPrepTime={form.setPrepTime}
            timeDisplay={form.timeDisplay} setTimeDisplay={form.setTimeDisplay}
            bakeTime={form.bakeTime} setBakeTime={form.setBakeTime}
            yields={form.yields} setYields={form.setYields}
            heroImage={form.heroImage} setHeroImage={form.setHeroImage}
            difficulty={form.difficulty} setDifficulty={form.setDifficulty}
            category={form.category} setCategory={form.setCategory}
            tags={form.tags} setTags={form.setTags}
            tagInput={form.tagInput} setTagInput={form.setTagInput}
            chefNote={form.chefNote} setChefNote={form.setChefNote}
            setIngredients={form.setIngredients}
            setSteps={form.setSteps}
            commitTag={form.commitTag}
            onNext={() => form.setWizardStep(2)}
          />
        )}

        {form.wizardStep === 2 && (
          <RecipeFormIngredients
            ingredients={form.ingredients}
            ingName={form.ingName} setIngName={form.setIngName}
            ingAmount={form.ingAmount} setIngAmount={form.setIngAmount}
            ingImage={form.ingImage} setIngImage={form.setIngImage}
            addIngredient={form.addIngredient}
            removeIngredient={form.removeIngredient}
            onBack={() => form.setWizardStep(1)}
            onNext={() => form.setWizardStep(3)}
          />
        )}

        {form.wizardStep === 3 && (
          <RecipeFormSteps
            steps={form.steps}
            ingredients={form.ingredients}
            stepTitle={form.stepTitle} setStepTitle={form.setStepTitle}
            stepDesc={form.stepDesc} setStepDesc={form.setStepDesc}
            stepTimer={form.stepTimer} setStepTimer={form.setStepTimer}
            stepIngredientPick={form.stepIngredientPick}
            toggleStepIngredientIndex={form.toggleStepIngredientIndex}
            addStep={form.addStep}
            removeStep={form.removeStep}
            onBack={() => form.setWizardStep(2)}
            onNext={() => form.setWizardStep(4)}
          />
        )}

        {form.wizardStep === 4 && (
          <RecipeFormReview
            title={form.title}
            description={form.description}
            heroImage={form.heroImage}
            category={form.category}
            difficulty={form.difficulty}
            prepTime={form.prepTime}
            bakeTime={form.bakeTime}
            yields={form.yields}
            chefNote={form.chefNote}
            tags={form.tags}
            ingredients={form.ingredients}
            steps={form.steps}
            isEdit={form.isEdit}
            onBack={() => form.setWizardStep(3)}
            onSubmit={() => form.submit(onBack)}
          />
        )}
      </motion.div>
    </SwipeBackWrapper>
  );
};
