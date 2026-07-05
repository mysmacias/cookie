import React, { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import type { Recipe } from '../types';
import { branchLabel, getRecipeFamily } from '../utils/recipeBranch';

interface VariationSwitcherProps {
  recipe: Recipe;
  /** Published recipes plus drafts, so unpublished branches show up too */
  allRecipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
  onOpenDraft: (recipe: Recipe) => void;
}

/**
 * Chip row for hopping between versions of a recipe on the detail screen.
 * The current version is highlighted and inert; draft branches get a dashed
 * chip that resumes in the wizard. Renders nothing for recipes without
 * relatives.
 */
export const VariationSwitcher: React.FC<VariationSwitcherProps> = ({
  recipe,
  allRecipes,
  onOpenRecipe,
  onOpenDraft,
}) => {
  const family = useMemo(() => getRecipeFamily(allRecipes, recipe), [allRecipes, recipe]);

  if (family.length <= 1) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Recipe variations">
      <GitBranch size={14} className="text-primary shrink-0" aria-hidden />
      {family.map(({ recipe: member, depth }) => {
        const isCurrent = member.id === recipe.id;
        const label = depth === 0 ? 'Original' : branchLabel(member);
        return (
          <button
            key={member.id}
            type="button"
            disabled={isCurrent}
            aria-current={isCurrent ? 'true' : undefined}
            title={isCurrent ? undefined : `Open ${branchLabel(member)}`}
            onClick={() => (member.draft ? onOpenDraft(member) : onOpenRecipe(member))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-label uppercase tracking-widest transition-colors ${
              isCurrent
                ? 'bg-primary text-on-primary font-bold'
                : member.draft
                ? 'border border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
                : 'border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary'
            }`}
          >
            {label}
            {member.draft ? (
              <span className={isCurrent ? 'opacity-80' : 'text-secondary'}>· draft</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
