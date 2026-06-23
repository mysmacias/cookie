import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Play, 
  Bookmark, 
  Share2, 
  Timer as TimerIcon,
  UtensilsCrossed,
  Pencil,
  Minus,
  Plus,
  Printer,
  List,
} from 'lucide-react';
import { Recipe } from '../types';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { useToast } from '../components/ui/Toast';
import { Label } from '../components/ui/Label';
import { useRecipes } from '../context/RecipeContext';
import { scaleAmount } from '../utils/servingScale';
import { fetchCollections, addRecipeToCollection, type CollectionSummary } from '../services/collectionsApi';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
  onStartCooking: () => void;
  onEditRecipe: () => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipe, onBack, onStartCooking, onEditRecipe }) => {
  const ctx = useRecipes();
  const bookmarked = ctx.isBookmarked(recipe.id);
  const [exportOpen, setExportOpen] = useState(false);
  const [servings, setServings] = useState(1);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [showCollections, setShowCollections] = useState(false);
  const { showToast } = useToast();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    void fetchCollections().then(setCollections).catch(() => {});
  }, []);

  const handleToggleBookmark = () => {
    void ctx.toggleBookmark(recipe.id);
  };

  const shareRecipe = async () => {
    const url = `${window.location.origin}/recipe/${encodeURIComponent(recipe.id)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, text: recipe.description, url });
        return;
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Could not share recipe');
    }
  };

  const addToCollection = async (collectionId: string) => {
    try {
      await addRecipeToCollection(collectionId, recipe.id);
      showToast('Added to collection');
      setShowCollections(false);
    } catch {
      showToast('Could not add to collection');
    }
  };

  const motionProps = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };

  return (
    <SwipeBackWrapper onBack={onBack}>
    <motion.div {...motionProps} className="recipe-print space-y-16">
      <button 
        type="button"
        onClick={onBack}
        className="flex items-center space-x-2 text-sm font-label uppercase tracking-widest hover:text-primary transition-colors print:hidden"
      >
        <ChevronLeft size={16} />
        <span>Back to Library</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <span className="inline-flex w-fit text-sm font-label uppercase tracking-widest text-secondary font-bold bg-secondary/12 backdrop-blur-md px-3 py-1.5 rounded-full border border-secondary/20">
              {recipe.category}
            </span>
            <h1 className="text-6xl md:text-8xl font-headline italic leading-none tracking-tight">
              {recipe.title}
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed font-light italic">
              {recipe.description}
            </p>
            {recipe.tags && recipe.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2 pt-2 print:hidden">
                {recipe.tags.map((t, i) => (
                  <li
                    key={`${t}-${i}`}
                    className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-label uppercase tracking-widest"
                  >
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-8 py-8 border-y border-outline-variant/30">
            <div className="space-y-1">
              <Label>Prep Time</Label>
              <p className="font-headline italic text-xl">{recipe.prepTime}</p>
            </div>
            {recipe.bakeTime && (
              <div className="space-y-1">
                <Label>Bake Time</Label>
                <p className="font-headline italic text-xl">{recipe.bakeTime}</p>
              </div>
            )}
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <p className="font-headline italic text-xl">{recipe.difficulty}</p>
            </div>
            {recipe.yields && (
              <div className="space-y-1">
                <Label>Yields</Label>
                <p className="font-headline italic text-xl">{recipe.yields}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 print:hidden" role="group" aria-label="Scale servings">
            <Label>Servings</Label>
            <button type="button" aria-label="Decrease servings" onClick={() => setServings(s => Math.max(1, s - 1))} className="p-2 rounded-full border border-outline-variant">
              <Minus size={16} />
            </button>
            <span className="font-headline italic text-xl w-8 text-center tabular-nums">{servings}</span>
            <button type="button" aria-label="Increase servings" onClick={() => setServings(s => Math.min(12, s + 1))} className="p-2 rounded-full border border-outline-variant">
              <Plus size={16} />
            </button>
          </div>

          <div className="flex items-center space-x-4 print:hidden">
            <button 
              type="button"
              onClick={onStartCooking}
              className="flex-1 bg-primary text-on-primary py-5 rounded-full font-label uppercase tracking-widest text-sm font-bold flex items-center justify-center space-x-3 hover:bg-primary-container transition-all shadow-lg shadow-primary/20"
            >
              <Play size={18} fill="currentColor" />
              <span>Start</span>
            </button>
            <button
              type="button"
              onClick={onEditRecipe}
              className="p-5 rounded-full border border-outline-variant hover:bg-surface-container hover:border-primary/40 transition-colors"
              aria-label="Edit recipe"
            >
              <Pencil size={20} />
            </button>
            <button
              type="button"
              onClick={handleToggleBookmark}
              className={`p-5 rounded-full border transition-colors ${
                bookmarked
                  ? 'border-primary text-primary'
                  : 'border-outline-variant hover:bg-surface-container'
              }`}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark recipe'}
            >
              <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              aria-label="Share recipe link"
              onClick={() => void shareRecipe()}
              className="p-5 rounded-full border border-outline-variant hover:bg-surface-container transition-colors"
            >
              <Share2 size={20} />
            </button>
            <button
              type="button"
              aria-label="Export recipe"
              onClick={() => setExportOpen(true)}
              className="p-5 rounded-full border border-outline-variant hover:bg-surface-container transition-colors"
            >
              <Printer size={20} />
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label="Add to collection"
                aria-expanded={showCollections}
                onClick={() => setShowCollections(v => !v)}
                className="p-5 rounded-full border border-outline-variant hover:bg-surface-container transition-colors"
              >
                <List size={20} />
              </button>
              {showCollections && collections.length > 0 && (
                <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl border border-outline-variant bg-surface shadow-lg z-20 py-1">
                  {collections.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-container"
                      onClick={() => void addToCollection(c.id)}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative print:hidden">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden editorial-shadow">
            {recipe.image ? (
              <img 
                src={recipe.image} 
                alt={recipe.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                <UtensilsCrossed size={64} className="text-outline-variant" />
              </div>
            )}
          </div>
          {recipe.chefNote && (
            <div className="absolute -bottom-8 -left-8 bg-surface p-8 rounded-2xl editorial-shadow max-w-xs border border-outline-variant/30">
              <h4 className="text-xs font-label uppercase tracking-widest mb-3 text-secondary font-bold">Chef's Note</h4>
              <p className="text-sm italic leading-relaxed text-on-surface-variant">
                "{recipe.chefNote}"
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 pt-16">
        <div className="lg:col-span-1 space-y-8">
          <h2 className="text-4xl font-headline italic">Ingredients</h2>
          <ul className="space-y-6">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-center justify-between py-4 border-b border-outline-variant/20 group">
                <div className="flex items-center space-x-4">
                  {ing.image && (
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container print:hidden">
                      <img src={ing.image} alt={ing.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <span className="text-lg font-light">{ing.name}</span>
                </div>
                <span className="font-headline italic text-primary">{scaleAmount(ing.amount, servings)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2 space-y-12">
          <h2 className="text-4xl font-headline italic">Preparation</h2>
          <div className="space-y-12">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-8 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border border-primary flex items-center justify-center text-primary font-headline italic text-xl print:border-on-surface">
                  {i + 1}
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-headline italic">{step.title}</h3>
                  {step.photo ? (
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-low max-w-xl print:hidden">
                      <img
                        src={step.photo}
                        alt={`Step ${i + 1} photo`}
                        className="w-full max-h-72 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}
                  <p className="text-on-surface-variant leading-relaxed text-lg">
                    {step.description}
                  </p>
                  {step.timer && (
                    <div className="inline-flex items-center space-x-2 text-xs font-label uppercase tracking-widest text-secondary font-bold bg-secondary/10 px-3 py-1.5 rounded-full print:hidden">
                      <TimerIcon size={14} />
                      <span>{Math.floor(step.timer / 60)} Minute Timer</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ExportRecipeModal
        recipes={[recipe]}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onFeedback={showToast}
      />
    </motion.div>
    </SwipeBackWrapper>
  );
};
