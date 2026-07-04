import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const CONFETTI_COLORS = [
  'var(--color-primary)',
  'var(--color-primary-container)',
  'var(--color-secondary)',
  'var(--color-primary-fixed-dim)',
];

interface ConfettiPiece {
  left: number; // percent
  delay: number;
  duration: number;
  drift: number; // px of horizontal wobble
  spin: number; // degrees
  size: number;
  color: string;
  round: boolean;
}

const Confetti: React.FC = () => {
  const pieces = useMemo<ConfettiPiece[]>(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: 4 + Math.random() * 92,
        delay: Math.random() * 0.5,
        duration: 1.8 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 90,
        spin: 360 + Math.random() * 540,
        size: 6 + Math.random() * 6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: Math.random() > 0.5,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          initial={{ y: -24, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: 420, x: p.drift, rotate: p.spin, opacity: [1, 1, 0.9, 0] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 1.8,
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
          }}
        />
      ))}
    </div>
  );
};

interface RecipeFormSuccessProps {
  title: string;
  heroImage?: string;
  onAddAnother: () => void;
  onDone: () => void;
}

/** Post-publish celebration: a moment of pride, then a nudge to keep going. */
export const RecipeFormSuccess: React.FC<RecipeFormSuccessProps> = ({
  title, heroImage, onAddAnother, onDone,
}) => {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container p-10 text-center space-y-8"
    >
      {!reducedMotion && <Confetti />}

      {heroImage ? (
        <motion.div
          initial={reducedMotion ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-auto w-32 aspect-[4/5] rounded-xl overflow-hidden border border-outline-variant/30 shadow-lg"
        >
          <img src={heroImage} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </motion.div>
      ) : (
        <div aria-hidden className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl">
          🎉
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-4xl sm:text-5xl font-headline italic">
          {title ? `${title} is in your library!` : 'Recipe saved!'}
        </h2>
        <p className="text-on-surface-variant text-lg">
          One more story saved from the recipe box. What are you cooking next?
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <Button variant="primary" size="lg" onClick={onAddAnother} icon={<Plus size={16} aria-hidden />}>
          Add another recipe
        </Button>
        <Button variant="outline" size="lg" onClick={onDone} icon={<BookOpen size={16} aria-hidden />}>
          Back to library
        </Button>
      </div>
    </motion.div>
  );
};
