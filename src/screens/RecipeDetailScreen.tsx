import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  Play, 
  Bookmark, 
  Share2, 
  Timer as TimerIcon,
  UtensilsCrossed,
  Pencil
} from 'lucide-react';
import { Recipe } from '../types';
import { isBookmarked, toggleBookmark } from '../services/recipeStore';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { ExportRecipeModal } from '../components/ExportRecipeModal';

interface RecipeDetailScreenProps {
  recipe: Recipe;
  onBack: () => void;
  onStartCooking: () => void;
  onEditRecipe: () => void;
}

export const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({ recipe, onBack, onStartCooking, onEditRecipe }) => {
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(recipe.id));
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleToggleBookmark = () => {
    const newState = toggleBookmark(recipe.id);
    setBookmarked(newState);
  };

  return (
    <SwipeBackWrapper onBack={onBack}>
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-16"
    >
      <button 
        onClick={onBack}
        className="flex items-center space-x-2 text-sm font-label uppercase tracking-widest hover:text-primary transition-colors"
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
              <ul className="flex flex-wrap gap-2 pt-2">
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
              <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Prep Time</span>
              <p className="font-headline italic text-xl">{recipe.prepTime}</p>
            </div>
            {recipe.bakeTime && (
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Bake Time</span>
                <p className="font-headline italic text-xl">{recipe.bakeTime}</p>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Difficulty</span>
              <p className="font-headline italic text-xl">{recipe.difficulty}</p>
            </div>
            {recipe.yields && (
              <div className="space-y-1">
                <span className="text-[10px] font-label uppercase tracking-widest opacity-50">Yields</span>
                <p className="font-headline italic text-xl">{recipe.yields}</p>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button 
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
              onClick={handleToggleBookmark}
              className={`p-5 rounded-full border transition-colors ${
                bookmarked
                  ? 'border-primary text-primary'
                  : 'border-outline-variant hover:bg-surface-container'
              }`}
            >
              <Bookmark size={20} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              aria-label="Export or share recipe"
              onClick={() => setExportOpen(true)}
              className="p-5 rounded-full border border-outline-variant hover:bg-surface-container transition-colors"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        <div className="relative">
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
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container">
                      <img src={ing.image} alt={ing.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <span className="text-lg font-light">{ing.name}</span>
                </div>
                <span className="font-headline italic text-primary">{ing.amount}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-2 space-y-12">
          <h2 className="text-4xl font-headline italic">Preparation</h2>
          <div className="space-y-12">
            {recipe.steps.map((step, i) => (
              <div key={i} className="flex gap-8 group">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border border-primary flex items-center justify-center text-primary font-headline italic text-xl group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  {i + 1}
                </div>
                <div className="space-y-3">
                  <h3 className="text-2xl font-headline italic">{step.title}</h3>
                  {step.photo ? (
                    <div className="rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-low max-w-xl">
                      <img
                        src={step.photo}
                        alt=""
                        className="w-full max-h-72 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}
                  <p className="text-on-surface-variant leading-relaxed text-lg">
                    {step.description}
                  </p>
                  {step.timer && (
                    <div className="inline-flex items-center space-x-2 text-xs font-label uppercase tracking-widest text-secondary font-bold bg-secondary/10 px-3 py-1.5 rounded-full">
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
        onFeedback={(message) => setToast(message)}
      />
      {toast ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-full bg-on-surface text-surface text-sm shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      ) : null}
    </motion.div>
    </SwipeBackWrapper>
  );
};
