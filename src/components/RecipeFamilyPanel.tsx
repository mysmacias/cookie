import React, { useMemo } from 'react';
import { GitBranch, ChevronRight } from 'lucide-react';
import type { Recipe } from '../types';
import { Label } from './ui/Label';
import {
  branchLabel,
  diffRecipes,
  getParentRecipe,
  getRecipeFamily,
} from '../utils/recipeBranch';

interface RecipeFamilyPanelProps {
  recipe: Recipe;
  /** Published recipes plus drafts, so unpublished branches show up too */
  allRecipes: Recipe[];
  onOpenRecipe: (recipe: Recipe) => void;
  onOpenDraft: (recipe: Recipe) => void;
}

const DiffTag: React.FC<{ kind: 'add' | 'remove' | 'change' }> = ({ kind }) => (
  <span
    aria-hidden
    className={`inline-flex w-5 h-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
      kind === 'add'
        ? 'bg-primary/12 text-primary'
        : kind === 'remove'
        ? 'bg-secondary/12 text-secondary'
        : 'border border-outline-variant text-on-surface-variant'
    }`}
  >
    {kind === 'add' ? '+' : kind === 'remove' ? '−' : '~'}
  </span>
);

/**
 * The "family" card on the recipe detail screen: the recipe's lineage tree
 * (root plus every branch, drafts included) and, for branches, what changed
 * compared to the parent. Renders nothing for recipes with no relatives.
 */
export const RecipeFamilyPanel: React.FC<RecipeFamilyPanelProps> = ({
  recipe,
  allRecipes,
  onOpenRecipe,
  onOpenDraft,
}) => {
  const family = useMemo(() => getRecipeFamily(allRecipes, recipe), [allRecipes, recipe]);
  const parent = useMemo(() => getParentRecipe(allRecipes, recipe), [allRecipes, recipe]);
  const diff = useMemo(() => (parent ? diffRecipes(parent, recipe) : null), [parent, recipe]);

  if (family.length <= 1 && !parent && !recipe.branchNote) return null;

  const diffLines: { kind: 'add' | 'remove' | 'change'; text: string }[] = [];
  if (diff) {
    for (const ing of diff.addedIngredients) {
      diffLines.push({ kind: 'add', text: ing.amount ? `${ing.name} · ${ing.amount}` : ing.name });
    }
    for (const ing of diff.removedIngredients) {
      diffLines.push({ kind: 'remove', text: ing.name });
    }
    for (const c of diff.changedIngredients) {
      diffLines.push({ kind: 'change', text: `${c.name} · ${c.from} → ${c.to}` });
    }
    for (const s of diff.addedSteps) diffLines.push({ kind: 'add', text: `Step: ${s.title}` });
    for (const s of diff.removedSteps) diffLines.push({ kind: 'remove', text: `Step: ${s.title}` });
    for (const s of diff.changedSteps) diffLines.push({ kind: 'change', text: `Step: ${s.title}` });
    for (const m of diff.changedMeta) diffLines.push({ kind: 'change', text: `${m.label}: ${m.from} → ${m.to}` });
  }

  return (
    <div className="print:hidden space-y-5 rounded-2xl border border-outline-variant/30 p-5">
      <div className="flex items-center gap-2">
        <GitBranch size={16} className="text-primary" aria-hidden />
        <Label>Recipe family</Label>
      </div>

      {family.length > 1 ? (
        <ul className="space-y-1">
          {family.map(({ recipe: member, depth }) => {
            const isCurrent = member.id === recipe.id;
            return (
              <li key={member.id} style={{ paddingLeft: `${Math.min(depth, 4) * 16}px` }}>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => (member.draft ? onOpenDraft(member) : onOpenRecipe(member))}
                  className={`group w-full flex items-center gap-2 text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                    isCurrent ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container'
                  }`}
                >
                  <span className="truncate">{branchLabel(member)}</span>
                  {depth === 0 ? (
                    <span className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant shrink-0">
                      original
                    </span>
                  ) : null}
                  {member.draft ? (
                    <span className="text-[9px] font-label uppercase tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded-full shrink-0">
                      draft
                    </span>
                  ) : null}
                  {isCurrent ? (
                    <span className="text-[9px] font-label uppercase tracking-widest shrink-0 ml-auto">
                      you're here
                    </span>
                  ) : (
                    <ChevronRight
                      size={14}
                      className="ml-auto shrink-0 opacity-0 group-hover:opacity-60 transition-opacity"
                      aria-hidden
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {recipe.branchNote ? (
        <div className="space-y-1">
          <Label>In your words</Label>
          <p className="text-sm italic text-on-surface-variant leading-relaxed">"{recipe.branchNote}"</p>
        </div>
      ) : null}

      {parent ? (
        <div className="space-y-2">
          <Label>Different from {branchLabel(parent)}</Label>
          {diffLines.length > 0 ? (
            <ul className="space-y-1.5">
              {diffLines.map((line, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                  <DiffTag kind={line.kind} />
                  <span className="min-w-0">{line.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">
              No recipe changes yet — edit this branch to make it your own.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
};
