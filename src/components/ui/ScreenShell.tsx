import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft } from 'lucide-react';
import { SwipeBackWrapper } from '../SwipeBackWrapper';

interface ScreenShellProps {
  onBack: () => void;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  onBack,
  backLabel = 'Back',
  children,
  className = '',
}) => (
  <SwipeBackWrapper onBack={onBack}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`max-w-3xl mx-auto space-y-12 ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="flex items-center space-x-2 text-sm font-label uppercase tracking-widest hover:text-primary transition-colors"
      >
        <ChevronLeft size={16} />
        <span>{backLabel}</span>
      </button>
      {children}
    </motion.div>
  </SwipeBackWrapper>
);
