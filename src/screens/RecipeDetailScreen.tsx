import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Network,
  ExternalLink,
  Trash2,
  Copy,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { Recipe } from '../types';
import { Screen } from '../hooks/useNavigation';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Label } from '../components/ui/Label';
import { useRecipes } from '../context/RecipeContext';
import { scaleAmount } from '../utils/servingScale';
import { fetchCollections, addRecipeToCollection, type CollectionSummary } from '../services/collectionsApi';
import { fetchRecipeNotes, saveRecipeNotes } from '../services/recipeNotesApi';
import { fetchShoppingList, saveShoppingList } from '../services/shoppingListApi';
import { buildShoppingItemsFromRecipes, mergeShoppingItems } from '../utils/shoppingList';
import { createShareLink } from '../services/shareApi';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
  onStartCooking: () => void;
  onEditRecipe: () => void;
  onFindSimilar: () => void;
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
}

function formatLastCooked(ms: number | null): string | null {
  if (!ms) return null;
  try {
    return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return null;
  }
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  recipe,
  onBack,
  onStartCooking,
  onEditRecipe,
  onFindSimilar,
  navigateTo,
}) => {
  const ctx = useRecipes();
  const bookmarked = ctx.isBookmarked(recipe.id);
  const [exportOpen, setExportOpen] = useState(false);
  const [servings, setServings] = useState(1);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [showCollections, setShowCollections] = useState(false);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [lastCookedAt, setLastCookedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notesSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    void fetchCollections().then(setCollections).catch(() => {});
  }, []);

  useEffect(() => {
    void fetchRecipeNotes(recipe.id).then(data => {
      setNotes(data.notes);
      setRating(data.rating);
      setLastCookedAt(data.lastCookedAt);
    }).catch(() => {});
  }, [recipe.id]);

  const persistNotes = useCallback((patch: { notes?: string; rating?: number | null }) => {
    if (notesSaveRef.current) clearTimeout(notesSaveRef.current);
    notesSaveRef.current = setTimeout(() => {
      void saveRecipeNotes(recipe.id, patch).catch(() => showToast('Could not save notes'));
    }, 500);
  }, [recipe.id, showToast]);

  const handleToggleBookmark = () => {
    void ctx.toggleBookmark(recipe.id);
  };

  const shareRecipe = async () => {
    try {
      const { url } = await createShareLink(recipe.id);
      const fullUrl = `${window.location.origin}${url}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: recipe.title, text: recipe.description, url: fullUrl });
          return;
        } catch { /* fall through */ }
      }
      await navigator.clipboard.writeText(fullUrl);
      showToast('Share link copied');
    } catch {
      const url = `${window.location.origin}/recipe/${encodeURIComponent(recipe.id)}`;
      try {
        await navigator.clipboard.writeText(url);
        showToast('Link copied to clipboard');
      } catch {
        showToast('Could not share recipe');
      }
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

  const addToShoppingList = async () => {
    try {
      const generated = buildShoppingItemsFromRecipes([recipe]);
      const existing = await fetchShoppingList();
      await saveShoppingList(mergeShoppingItems(existing, generated));
      showToast('Ingredients added to shopping list');
    } catch {
      showToast('Could not update shopping list');
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await ctx.duplicateRecipe(recipe.id);
      showToast('Recipe duplicated');
      navigateTo('detail', copy);
    } catch {
      showToast('Could not duplicate recipe');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await ctx.deleteRecipe(recipe.id);
      showToast('Recipe deleted');
      onBack();
    } catch {
      showToast('Could not delete recipe');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const lastCookedLabel = formatLastCooked(lastCookedAt);
  const baseYields = recipe.yields ? parseInt(recipe.yields, 10) : NaN;
  const defaultServings = Number.isFinite(baseYields) && baseYields > 0 ? baseYields : 1;

  useEffect(() => {
    setServings(defaultServings);
  }, [recipe.id, defaultServings]);

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
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex w-fit text-sm font-label uppercase tracking-widest text-secondary font-bold bg-secondary/12 backdrop-blur-md px-3 py-1.5 rounded-full border border-secondary/20">
                {recipe.category}
              </span>
              {lastCookedLabel ? (
                <span className="inline-flex text-[10px] font-label uppercase tracking-widest text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                  Last cooked {lastCookedLabel}
                </span>
              ) : null}
            </div>
            <h1 className="text-6xl md:text-8xl font-headline italic leading-none tracking-tight">
              {recipe.title}
            </h1>
            <p className="text-xl text-on-surface-variant leading-relaxed font-light italic">
              {recipe.description}
            </p>
            {recipe.sourceUrl ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary transition-colors print:hidden"
              >
                <ExternalLink size={14} />
                <span>View original recipe</span>
              </a>
            ) : null}
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
            {defaultServings > 1 ? (
              <span className="text-xs text-on-surface-variant">Base: {defaultServings}</span>
            ) : null}
          </div>

          <div className="print:hidden space-y-4 rounded-2xl border border-outline-variant/30 p-5">
            <Label>Your rating</Label>
            <div className="flex gap-1" role="group" aria-label="Recipe rating">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                  aria-pressed={rating === n}
                  onClick={() => {
                    const next = rating === n ? null : n;
                    setRating(next);
                    persistNotes({ rating: next });
                  }}
                  className="p-1 text-primary"
                >
                  <Star size={22} fill={rating && n <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-notes">Notes</Label>
              <textarea
                id="recipe-notes"
                value={notes}
                onChange={e => {
                  setNotes(e.target.value);
                  persistNotes({ notes: e.target.value });
                }}
                rows={4}
                placeholder="Substitutions, tweaks, or reminders for next time…"
                className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={onStartCooking}
              title="Start step-by-step cooking mode"
              className="flex-1 min-w-[140px] bg-primary text-on-primary py-5 rounded-full font-label uppercase tracking-widest text-sm font-bold flex items-center justify-center space-x-3 hover:bg-primary-container transition-all shadow-lg shadow-primary/20"
            >
              <Play size={18} fill="currentColor" />
              <span>Start</span>
            </button>
            <button type="button" onClick={() => void addToShoppingList()} title="Add this recipe's ingredients to your shopping list" className="flex items-center gap-2 px-4 py-5 rounded-full border border-outline-variant text-[10px] font-label uppercase tracking-widest hover:bg-surface-container">
              <ShoppingCart size={18} />
              <span className="hidden sm:inline">Shopping list</span>
            </button>
            <button type="button" onClick={onFindSimilar} aria-label="Find similar recipes in graph" title="Find similar recipes in graph" className="flex items-center gap-2 px-4 py-5 rounded-full border border-secondary/40 text-secondary text-[10px] font-label uppercase tracking-widest font-bold hover:bg-secondary/10">
              <Network size={18} />
            </button>
            <button type="button" onClick={onEditRecipe} className="p-5 rounded-full border border-outline-variant hover:bg-surface-container" aria-label="Edit recipe" title="Edit recipe">
              <Pencil size={20} />
            </button>
            <button type="button" onClick={() => void handleDuplicate()} className="p-5 rounded-full border border-outline-variant hover:bg-surface-container" aria-label="Duplicate recipe" title="Duplicate recipe">
              <Copy size={20} />
            </button>
            <button type="button" onClick={handleToggleBookmark} className={`p-5 rounded-full border transition-colors ${bookmarked ? 'border-primary text-primary' : 'border-outline-variant hover:bg-surface-container'}`} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark recipe'} title={bookmarked ? 'Remove bookmark' : 'Bookmark recipe'}>
              <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <button type="button" aria-label="Share recipe link" title="Share recipe link" onClick={() => void shareRecipe()} className="p-5 rounded-full border border-outline-variant hover:bg-surface-container">
              <Share2 size={20} />
            </button>
            <button type="button" aria-label="Export recipe" title="Print or export recipe" onClick={() => setExportOpen(true)} className="p-5 rounded-full border border-outline-variant hover:bg-surface-container">
              <Printer size={20} />
            </button>
            <button type="button" aria-label="Delete recipe" title="Delete recipe" onClick={() => setConfirmDelete(true)} className="p-5 rounded-full border border-secondary/30 text-secondary hover:bg-secondary/10">
              <Trash2 size={20} />
            </button>
            <div className="relative">
              <button type="button" aria-label="Add to collection" title="Add to collection" aria-expanded={showCollections} onClick={() => setShowCollections(v => !v)} className="p-5 rounded-full border border-outline-variant hover:bg-surface-container">
                <List size={20} />
              </button>
              {showCollections && collections.length > 0 && (
                <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-xl border border-outline-variant bg-surface shadow-lg z-20 py-1">
                  {collections.map(c => (
                    <button key={c.id} type="button" className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-container" onClick={() => void addToCollection(c.id)}>
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
              <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                <UtensilsCrossed size={64} className="text-outline-variant" />
              </div>
            )}
          </div>
          {recipe.chefNote && (
            <div className="absolute -bottom-8 -left-8 bg-surface p-8 rounded-2xl editorial-shadow max-w-xs border border-outline-variant/30">
              <h4 className="text-xs font-label uppercase tracking-widest mb-3 text-secondary font-bold">Chef's Note</h4>
              <p className="text-sm italic leading-relaxed text-on-surface-variant">"{recipe.chefNote}"</p>
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
                <span className="font-headline italic text-primary">{scaleAmount(ing.amount, servings / defaultServings)}</span>
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
                      <img src={step.photo} alt={`Step ${i + 1} photo`} className="w-full max-h-72 object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : null}
                  <p className="text-on-surface-variant leading-relaxed text-lg">{step.description}</p>
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

      <ExportRecipeModal recipes={[recipe]} open={exportOpen} onClose={() => setExportOpen(false)} onFeedback={showToast} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete recipe?"
        message={`"${recipe.title}" will be permanently removed from your library.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      />
    </motion.div>
    </SwipeBackWrapper>
  );
};
