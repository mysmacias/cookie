import React from 'react';
import { motion } from 'motion/react';
import { UtensilsCrossed, Pencil, Trash2, GitBranch } from 'lucide-react';
import type { Recipe } from '../types';

interface DraftCardProps {
  recipe: Recipe;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * A compact card for an in-progress recipe draft. Clicking it resumes the Add
 * Recipe wizard where the cook left off; the trash button discards the draft.
 */
export const DraftCard: React.FC<DraftCardProps> = ({ recipe, onResume, onDiscard }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group space-y-6 cursor-pointer"
      onClick={onResume}
      onKeyDown={(e) => {
        if (e.key !== ' ' && e.key !== 'Enter') return;
        e.preventDefault();
        onResume();
      }}
      tabIndex={0}
      role="link"
      aria-label={`Resume draft ${recipe.title || 'Untitled recipe'}`}
    >
      <div className="aspect-[4/5] overflow-hidden rounded-xl bg-surface-container relative border border-dashed border-outline-variant/60">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
            <UtensilsCrossed size={48} className="text-outline-variant" />
          </div>
        )}

        <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-1.5">
          <span className="bg-surface/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-label uppercase tracking-widest border border-outline-variant/30 text-on-surface-variant">
            Draft
          </span>
          {recipe.branchName ? (
            <span className="inline-flex items-center gap-1 bg-surface/75 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-label uppercase tracking-widest border border-outline-variant/30 text-primary">
              <GitBranch size={10} aria-hidden />
              {recipe.branchName}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          aria-label={`Discard draft ${recipe.title || 'Untitled recipe'}`}
          onClick={(e) => {
            e.stopPropagation();
            onDiscard();
          }}
          className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/65 text-on-surface-variant shadow-md backdrop-blur-md transition-colors hover:bg-secondary/80 hover:text-on-primary"
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>

        <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100 transition-opacity bg-primary text-on-primary px-3 py-1.5 rounded-full text-[9px] font-label uppercase tracking-widest font-bold shadow-md flex items-center gap-1.5">
          <Pencil size={12} strokeWidth={2.5} />
          Continue
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-headline italic leading-tight group-hover:text-primary transition-colors">
          {recipe.title || 'Untitled recipe'}
        </h3>
        <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
          Tap to continue editing
        </p>
      </div>
    </motion.div>
  );
};
