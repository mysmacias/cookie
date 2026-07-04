import React from 'react';
import { Check } from 'lucide-react';

const STEP_LABELS = ['Basics', 'Ingredients', 'Steps', 'Review'] as const;

interface WizardStepperProps {
  current: number;
  /** Whether the user is allowed to jump to a given step right now. */
  canGo: (step: number) => boolean;
  onSelect: (step: number) => void;
}

/**
 * Clickable progress rail for the add-recipe wizard. Finished steps collapse to
 * a check and stay tappable so fixing an earlier answer never feels like
 * "going backwards".
 */
export const WizardStepper: React.FC<WizardStepperProps> = ({ current, canGo, onSelect }) => (
  <nav aria-label="Recipe progress">
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        const reachable = canGo(step);
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <li aria-hidden className="flex-1 min-w-3">
                <div className={`h-px transition-colors ${done || active ? 'bg-primary/50' : 'bg-outline-variant/40'}`} />
              </li>
            )}
            <li>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(step)}
                aria-current={active ? 'step' : undefined}
                className={`group flex items-center gap-2 transition-opacity ${
                  reachable ? '' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-headline italic transition-colors ${
                    done
                      ? 'border-primary bg-primary text-on-primary'
                      : active
                      ? 'border-primary text-primary'
                      : 'border-outline-variant text-on-surface-variant'
                  } ${reachable && !active ? 'group-hover:border-primary/60' : ''}`}
                >
                  {done ? <Check size={14} aria-hidden /> : step}
                </span>
                <span
                  className={`text-[10px] font-label uppercase tracking-widest transition-colors ${
                    active ? 'text-primary' : 'text-on-surface-variant'
                  } ${active ? '' : 'hidden md:inline'}`}
                >
                  {label}
                </span>
              </button>
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  </nav>
);
