import React, { useEffect, useState } from 'react';
import { GitBranch } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface BranchDialogProps {
  open: boolean;
  /** Title of the recipe being branched, shown in the default heading */
  sourceTitle: string;
  heading?: string;
  subheading?: string;
  confirmLabel?: string;
  /** Optional secondary action (e.g. "Cooked as written" after a cook) */
  skipLabel?: string;
  /** Pre-seeded "what changed" note, e.g. collected during cooking */
  initialNote?: string;
  busy?: boolean;
  onConfirm: (branchName: string, branchNote: string) => void;
  onSkip?: () => void;
  onCancel: () => void;
}

/**
 * Names and saves a new branch (variation) of a recipe. Used from the recipe
 * detail screen and from the finish-cooking flow, which pre-seeds the note
 * with any "I did this differently" observations captured mid-cook.
 */
export const BranchDialog: React.FC<BranchDialogProps> = ({
  open,
  sourceTitle,
  heading,
  subheading,
  confirmLabel = 'Create branch',
  skipLabel,
  initialNote = '',
  busy = false,
  onConfirm,
  onSkip,
  onCancel,
}) => {
  const trapRef = useFocusTrap(open, onCancel);
  const [name, setName] = useState('');
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (open) {
      setName('');
      setNote(initialNote);
    }
  }, [open, initialNote]);

  if (!open) return null;
  const canConfirm = name.trim().length > 0 && !busy;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="branch-dialog-title"
        className="w-full max-w-md rounded-2xl bg-surface text-on-surface border border-outline-variant shadow-2xl p-8 space-y-6"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <GitBranch size={22} className="text-primary shrink-0" aria-hidden />
            <h2 id="branch-dialog-title" className="text-2xl font-headline italic">
              {heading ?? `Branch "${sourceTitle}"`}
            </h2>
          </div>
          <p className="text-on-surface-variant text-sm">
            {subheading ??
              'Your take on this recipe, kept alongside the original. It starts as a draft you can refine anytime.'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="branch-name" className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
              Name your branch
            </label>
            <input
              id="branch-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Brown butter"
              maxLength={80}
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="branch-note" className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
              What did you change? <span className="normal-case tracking-normal opacity-70">(optional)</span>
            </label>
            <textarea
              id="branch-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Browned the butter first, used a little less sugar…"
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          {skipLabel ? (
            <button
              type="button"
              onClick={onSkip}
              className="px-5 py-2.5 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest mr-auto"
            >
              {skipLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm(name.trim(), note.trim())}
            className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold disabled:opacity-30"
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
