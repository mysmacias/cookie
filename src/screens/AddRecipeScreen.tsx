import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronLeft } from 'lucide-react';
import type { Recipe } from '../types';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { Button } from '../components/ui/Button';
import { useRecipeForm } from '../hooks/useRecipeForm';
import { WizardStepper } from './add-recipe/WizardStepper';
import { RecipeFormBasics } from './add-recipe/RecipeFormBasics';
import { RecipeFormIngredients } from './add-recipe/RecipeFormIngredients';
import { RecipeFormSteps } from './add-recipe/RecipeFormSteps';
import { RecipeFormReview } from './add-recipe/RecipeFormReview';
import { RecipeFormSuccess } from './add-recipe/RecipeFormSuccess';

interface AddRecipeScreenProps {
  onBack: () => void;
  editingRecipe?: Recipe | null;
  onSaved?: () => void;
  /** Called from the success screen so the app can clear editing state for a fresh recipe. */
  onAddAnother?: () => void;
}

export const AddRecipeScreen: React.FC<AddRecipeScreenProps> = ({ onBack, editingRecipe, onSaved, onAddAnother }) => {
  const form = useRecipeForm(editingRecipe, onSaved);
  // A resumed draft is technically "editing" an existing record, but to the cook
  // it's still the new recipe they started — so it gets its own framing.
  const isDraft = editingRecipe?.draft === true;
  const isPublishedEdit = form.isEdit && !isDraft;
  // Snapshot for the celebration screen; form state resets on "Add another".
  const [celebrated, setCelebrated] = useState<{ title: string; heroImage: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleBack = () => {
    form.persistNow();
    onBack();
  };

  // Steps already visited stay reachable; jumping ahead needs the same
  // prerequisites as the Continue buttons (title → ingredients → steps).
  const canGo = (step: number) => {
    if (step <= form.wizardStep) return true;
    if (step >= 2 && !form.title.trim()) return false;
    if (step >= 3 && form.ingredients.length === 0) return false;
    if (step >= 4 && form.steps.length === 0) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await form.submit(() => {
        if (isPublishedEdit) {
          // Edits of a published recipe just return to its detail page — no fanfare.
          onBack();
        } else {
          setCelebrated({ title: form.title.trim(), heroImage: form.heroImage });
        }
      });
    } catch (err) {
      // The hook already re-saved the work as a draft; tell the cook what
      // happened so they can retry instead of silently losing the tap.
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : 'Something went wrong while saving. Your work is kept as a draft — please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    setCelebrated(null);
    form.resetForNew();
    onAddAnother?.();
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  if (celebrated) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto pt-8">
        <RecipeFormSuccess
          title={celebrated.title}
          heroImage={celebrated.heroImage}
          onAddAnother={handleAddAnother}
          onDone={onBack}
        />
      </motion.div>
    );
  }

  return (
    <SwipeBackWrapper onBack={handleBack}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-10"
      >
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center space-x-2 text-sm font-label uppercase tracking-widest hover:text-primary transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3">
            {form.saveState === 'error' && (
              <span role="alert" className="text-xs text-secondary">
                Couldn't save — try again
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void form.saveDraft()}
              disabled={!form.title.trim() || form.saveState === 'saving' || submitting}
              title={form.title.trim() ? undefined : 'Name your recipe first'}
              icon={form.saveState === 'saved' ? <Check size={12} aria-hidden /> : undefined}
              aria-live="polite"
            >
              {form.saveState === 'saving'
                ? 'Saving…'
                : form.saveState === 'saved'
                ? 'Saved'
                : isPublishedEdit
                ? 'Save changes'
                : 'Save draft'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl font-headline italic">
            {isDraft ? 'Finish your recipe' : form.isEdit ? 'Edit Recipe' : 'Submit a Recipe'}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {isDraft
              ? 'Pick up where you left off — we keep saving your draft as you go.'
              : form.isEdit
              ? 'Changes are saved automatically as you edit — no need to reach the last step.'
              : 'Share your culinary secrets with COOKIE. We save your progress as a draft as you go.'}
          </p>
        </div>

        <WizardStepper current={form.wizardStep} canGo={canGo} onSelect={form.setWizardStep} />

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
            addIngredientsBulk={form.addIngredientsBulk}
            removeIngredient={form.removeIngredient}
            editIngredient={form.editIngredient}
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
            moveStep={form.moveStep}
            editStep={form.editStep}
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
            isDraft={isDraft}
            submitting={submitting}
            submitError={submitError}
            onBack={() => form.setWizardStep(3)}
            onSubmit={() => void handleSubmit()}
          />
        )}
      </motion.div>
    </SwipeBackWrapper>
  );
};
