import React, { useMemo } from 'react';
import { GitBranch, ChevronRight, Plus, UtensilsCrossed } from 'lucide-react';
import type { Recipe } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';
import {
  branchLabel,
  diffRecipes,
  getParentRecipe,
  getRecipeFamily,
  summarizeDiff,
} from '../utils/recipeBranch';

interface VariationsSheetProps {
  open: boolean;
  /** The family root whose variations are listed; null while closed */
  root: Recipe | null;
  /** Published recipes plus drafts, so unpublished branches show up too */
  allRecipes: Recipe[];
  onClose: () => void;
  onOpenRecipe: (recipe: Recipe) => void;
  onOpenDraft: (recipe: Recipe) => void;
  onNewVariation: (source: Recipe) => void;
}

/**
 * Bottom sheet listing a recipe's whole family — the root plus every branch,
 * drafts included — with a one-line diff per branch. Opened from the
 * "variations" pill on a library card.
 */
export const VariationsSheet: React.FC<VariationsSheetProps> = ({
  open,
  root,
  allRecipes,
  onClose,
  onOpenRecipe,
  onOpenDraft,
  onNewVariation,
}) => {
  const trapRef = useFocusTrap(open, onClose);

  const family = useMemo(
    () => (root ? getRecipeFamily(allRecipes, root) : []),
    [allRecipes, root],
  );

  if (!open || !root) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center" role="presentation">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variations-sheet-title"
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-t-3xl bg-surface text-on-surface border-t border-x border-outline-variant/40 shadow-2xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 motion-safe:animate-sheet-up"
      >
        <div className="w-9 h-1 rounded-full bg-outline-variant/60 mx-auto mb-4" aria-hidden />

        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={16} className="text-primary shrink-0" aria-hidden />
          <h2 id="variations-sheet-title" className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant truncate">
            {root.title} · family
          </h2>
        </div>

        <ul className="space-y-1.5">
          {family.map(({ recipe: member, depth }) => {
            const isRoot = depth === 0;
            const parent = isRoot ? null : getParentRecipe(allRecipes, member);
            const summary = parent ? summarizeDiff(diffRecipes(parent, member)) : '';
            const subline = isRoot
              ? 'Original recipe'
              : summary || member.branchNote || 'No changes yet';
            return (
              <li key={member.id} style={{ paddingLeft: `${Math.min(Math.max(depth - 1, 0), 3) * 14}px` }}>
                <button
                  type="button"
                  onClick={() => (member.draft ? onOpenDraft(member) : onOpenRecipe(member))}
                  className={`group w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-2xl transition-colors ${
                    isRoot ? 'bg-primary/8 hover:bg-primary/12' : 'hover:bg-surface-container'
                  }`}
                >
                  <span className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-surface-container-high flex items-center justify-center">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UtensilsCrossed size={16} className="text-outline-variant" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`text-sm truncate ${isRoot ? 'font-bold text-primary' : ''}`}>
                        {branchLabel(member)}
                      </span>
                      {member.draft ? (
                        <span className="text-[9px] font-label uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded-full shrink-0">
                          draft
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-xs text-on-surface-variant truncate">{subline}</span>
                  </span>
                  <ChevronRight
                    size={14}
                    className="shrink-0 opacity-40 group-hover:opacity-80 transition-opacity"
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => onNewVariation(root)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-full border border-dashed border-outline-variant px-4 py-2.5 text-[10px] font-label uppercase tracking-widest text-on-surface-variant hover:border-primary hover:text-primary transition-colors"
        >
          <Plus size={12} aria-hidden />
          New variation
        </button>
      </div>
    </div>
  );
};
