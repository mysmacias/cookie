import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { UtensilsCrossed } from 'lucide-react';
import { fetchSharedRecipe } from '../services/shareApi';
import type { Recipe } from '../types';
import { scaleAmount } from '../utils/servingScale';

interface ShareRecipeScreenProps {
  token: string;
  onSignIn: () => void;
}

export const ShareRecipeScreen: React.FC<ShareRecipeScreenProps> = ({ token, onSignIn }) => {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    document.title = 'Shared recipe · COOKIE';
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSharedRecipe(token);
        if (!cancelled) setRecipe(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load recipe');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="font-headline italic text-2xl">{error ?? 'Recipe not found'}</p>
          <button type="button" onClick={onSignIn} className="text-sm font-label uppercase tracking-widest text-primary">Sign in to COOKIE</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-outline-variant/30 px-6 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <span className="text-2xl font-headline font-bold italic text-primary">COOKIE</span>
          <button type="button" onClick={onSignIn} className="text-xs font-label uppercase tracking-widest text-primary">Sign in</button>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="max-w-4xl mx-auto px-6 py-12 space-y-12 outline-none">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <p className="text-sm font-label uppercase tracking-widest text-secondary">Shared recipe</p>
          <h1 className="text-5xl md:text-7xl font-headline italic leading-none">{recipe.title}</h1>
          <p className="text-xl text-on-surface-variant italic">{recipe.description}</p>
        </motion.div>

        {recipe.image ? (
          <div className="aspect-[4/5] max-w-md rounded-2xl overflow-hidden">
            <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
        ) : (
          <div className="aspect-[4/5] max-w-md rounded-2xl bg-surface-container flex items-center justify-center">
            <UtensilsCrossed size={48} className="text-outline-variant" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section className="space-y-6">
            <h2 className="text-3xl font-headline italic">Ingredients</h2>
            <ul className="space-y-4">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex justify-between border-b border-outline-variant/20 py-3">
                  <span>{ing.name}</span>
                  <span className="font-headline italic text-primary">{scaleAmount(ing.amount, servings)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-6">
            <h2 className="text-3xl font-headline italic">Steps</h2>
            <ol className="space-y-8">
              {recipe.steps.map((step, i) => (
                <li key={i} className="space-y-2">
                  <h3 className="text-xl font-headline italic">{i + 1}. {step.title}</h3>
                  <p className="text-on-surface-variant">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
};
