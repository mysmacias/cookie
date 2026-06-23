import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const ONBOARDING_KEY = 'cookie_onboarding_done';

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_KEY) !== '1') setShow(true);
    } catch { /* ignore */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  return { showOnboarding: show, dismissOnboarding: dismiss };
}

export const OnboardingModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const trapRef = useFocusTrap(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm" aria-hidden={!open}>
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="w-full max-w-lg rounded-2xl bg-surface border border-outline-variant shadow-2xl p-8 space-y-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="onboarding-title" className="text-3xl font-headline italic">Welcome to COOKIE</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full border border-outline-variant">
            <X size={18} />
          </button>
        </div>
        <p className="text-on-surface-variant leading-relaxed">
          Your editorial recipe companion. Browse and import recipes, map similarities, plan synchronized meals,
          shop from your library, and export beautiful cookbooks.
        </p>
        <ol className="space-y-3 text-sm text-on-surface-variant list-decimal list-inside">
          <li>Search, filter, and discover new recipes in your library</li>
          <li>Use Graph to find related dishes by ingredients, tags, and origin</li>
          <li>Cook one recipe step-by-step or use Cook Plan to coordinate several dishes</li>
          <li>Build collections, shopping lists, and PDF / Markdown cookbooks</li>
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 rounded-full bg-primary text-on-primary font-label uppercase tracking-widest text-xs font-bold"
        >
          Get started
        </button>
      </div>
    </div>
  );
};
