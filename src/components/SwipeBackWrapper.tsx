import React, { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { haptic } from '../utils/haptics';

const SWIPE_THRESHOLD = 120;
const LEFT_EDGE_ONLY_PX = 48;

interface SwipeBackWrapperProps {
  onBack: () => void;
  /** When true, only drags starting within the first 48px from the left edge trigger */
  edgeOnly?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SwipeBackWrapper: React.FC<SwipeBackWrapperProps> = ({
  onBack,
  edgeOnly = false,
  children,
  className = '',
}) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [0, SWIPE_THRESHOLD * 1.5], [1, 0.5]);
  const firedRef = useRef(false);

  const bind = useDrag(
    ({ first, movement: [mx], initial: [ix], cancel, active }) => {
      if (first) {
        firedRef.current = false;
        if (edgeOnly && ix > LEFT_EDGE_ONLY_PX) {
          cancel();
          return;
        }
      }

      const clamped = Math.max(0, mx);
      x.set(active ? clamped : 0);

      if (!active && mx > SWIPE_THRESHOLD && !firedRef.current) {
        firedRef.current = true;
        haptic('light');
        onBack();
      }

      if (!active) {
        x.set(0);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  const {
    onAnimationStart: _1,
    onDragStart: _2,
    onDrag: _3,
    onDragEnd: _4,
    ...gestureHandlers
  } = bind();

  return (
    <motion.div
      {...gestureHandlers}
      style={{ x, opacity, touchAction: 'pan-y' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
