import React from 'react';

export const RecipeCardSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse" aria-hidden>
    <div className="aspect-[4/5] rounded-xl bg-surface-container" />
    <div className="space-y-3">
      <div className="h-8 w-3/4 rounded bg-surface-container" />
      <div className="h-4 w-1/2 rounded bg-surface-container-high" />
    </div>
  </div>
);
