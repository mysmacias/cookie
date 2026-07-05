import React, { useMemo } from 'react';
import { GitBranch } from 'lucide-react';
import type { Recipe } from '../types';
import { Label } from './ui/Label';
import { branchLabel, diffRecipes, getParentRecipe } from '../utils/recipeBranch';

interface RecipeFamilyPanelProps {
  recipe: Recipe;
  /** Published recipes plus drafts, so a draft parent still resolves */
  allRecipes: Recipe[];
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
 * The "what changed" card on the recipe detail screen: a branch's note and
 * its diff against the parent. Hopping between versions lives in the
 * VariationSwitcher chips next to the title; this panel only describes the
 * version being viewed, so it renders nothing for family roots.
 */
export const RecipeFamilyPanel: React.FC<RecipeFamilyPanelProps> = ({
  recipe,
  allRecipes,
}) => {
  const parent = useMemo(() => getParentRecipe(allRecipes, recipe), [allRecipes, recipe]);
  const diff = useMemo(() => (parent ? diffRecipes(parent, recipe) : null), [parent, recipe]);

  if (!parent && !recipe.branchNote) return null;

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
        <Label>This variation</Label>
      </div>

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
