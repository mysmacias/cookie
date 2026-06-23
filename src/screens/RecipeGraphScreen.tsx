import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, ExternalLink, Network, ChefHat } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useRecipes } from '../context/RecipeContext';
import type { Recipe } from '../types';
import {
  buildRecipeGraph,
  computeSimilarity,
  getRecipeCategories,
  getSimilarRecipes,
  type GraphEdge,
  type SimilarityBreakdown,
} from '../utils/recipeSimilarity';

interface RecipeGraphScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
  startCooking: (recipe: Recipe) => void;
  focusRecipeId?: string | null;
  onCookTogether?: (recipeIds: string[]) => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

const SVG_SIZE = 520;
const NODE_RADIUS = 28;
const DEFAULT_THRESHOLD = 0.25;

function parseFocusFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const focus = params.get('focus');
  return focus?.trim() || null;
}

function runForceLayout(
  nodeIds: string[],
  edges: GraphEdge[],
  focusId: string | null,
  iterations = 80,
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const center = SVG_SIZE / 2;
  const radius = SVG_SIZE * 0.34;

  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / Math.max(nodeIds.length, 1);
    positions.set(id, {
      id,
      x: focusId === id ? center : center + radius * Math.cos(angle),
      y: focusId === id ? center : center + radius * Math.sin(angle),
    });
  });

  for (let iter = 0; iter < iterations; iter++) {
    const damping = 0.85 - iter / iterations * 0.35;

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        const a = positions.get(nodeIds[i])!;
        const b = positions.get(nodeIds[j])!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const repulse = 4200 / (dist * dist);
        dx = (dx / dist) * repulse;
        dy = (dy / dist) * repulse;
        if (nodeIds[i] !== focusId) {
          a.x -= dx;
          a.y -= dy;
        }
        if (nodeIds[j] !== focusId) {
          b.x += dx;
          b.y += dy;
        }
      }
    }

    for (const edge of edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const dist = Math.max(Math.hypot(dx, dy), 1);
      const attract = (dist - 110) * 0.04 * edge.weight;
      dx = (dx / dist) * attract;
      dy = (dy / dist) * attract;
      if (edge.source !== focusId) {
        a.x += dx;
        a.y += dy;
      }
      if (edge.target !== focusId) {
        b.x -= dx;
        b.y -= dy;
      }
    }

    for (const id of nodeIds) {
      const p = positions.get(id)!;
      if (id === focusId) {
        p.x = center;
        p.y = center;
        continue;
      }
      p.x += (center - p.x) * 0.02;
      p.y += (center - p.y) * 0.02;
      const margin = NODE_RADIUS + 8;
      p.x = Math.min(SVG_SIZE - margin, Math.max(margin, p.x));
      p.y = Math.min(SVG_SIZE - margin, Math.max(margin, p.y));
      p.x *= damping;
      p.y *= damping;
      p.x += center * (1 - damping);
      p.y += center * (1 - damping);
    }
  }

  return positions;
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export const RecipeGraphScreen: React.FC<RecipeGraphScreenProps> = ({
  navigateTo,
  startCooking,
  focusRecipeId: focusProp,
  onCookTogether,
}) => {
  const ctx = useRecipes();
  const [focusId, setFocusId] = useState<string | null>(focusProp ?? parseFocusFromUrl());
  const [selectedId, setSelectedId] = useState<string | null>(focusProp ?? parseFocusFromUrl());
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const categories = useMemo(() => getRecipeCategories(ctx.recipes), [ctx.recipes]);

  const graph = useMemo(
    () => buildRecipeGraph(ctx.recipes, { threshold, categoryFilter }),
    [ctx.recipes, threshold, categoryFilter],
  );

  const activeFocusId = focusId && graph.nodes.some(n => n.id === focusId) ? focusId : null;

  const positions = useMemo(
    () => runForceLayout(graph.nodes.map(n => n.id), graph.edges, activeFocusId),
    [graph.nodes, graph.edges, activeFocusId],
  );

  const selectedRecipe = useMemo(
    () => ctx.recipes.find(r => r.id === selectedId) ?? null,
    [ctx.recipes, selectedId],
  );

  const selectedBreakdown: SimilarityBreakdown | null = useMemo(() => {
    if (!selectedRecipe || !activeFocusId || selectedRecipe.id === activeFocusId) return null;
    const focus = ctx.recipes.find(r => r.id === activeFocusId);
    if (!focus) return null;
    return computeSimilarity(focus, selectedRecipe);
  }, [selectedRecipe, activeFocusId, ctx.recipes]);

  const similarList = useMemo(() => {
    if (!activeFocusId) return [];
    return getSimilarRecipes(activeFocusId, ctx.recipes, 12).filter(
      r => r.breakdown.score >= threshold,
    );
  }, [activeFocusId, ctx.recipes, threshold]);

  useEffect(() => {
    document.title = activeFocusId
      ? 'Similar recipes · COOKIE'
      : 'Recipe graph · COOKIE';
    return () => {
      document.title = 'COOKIE';
    };
  }, [activeFocusId]);

  useEffect(() => {
    if (focusProp) {
      setFocusId(focusProp);
      setSelectedId(focusProp);
    }
  }, [focusProp]);

  const handleSelectNode = useCallback((id: string) => {
    setSelectedId(prev => (prev === id ? null : id));
  }, []);

  const handleKeyNode = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectNode(id);
      }
    },
    [handleSelectNode],
  );

  const focusRecipe = activeFocusId ? ctx.recipes.find(r => r.id === activeFocusId) : null;

  const handleFocusRecipe = useCallback(
    (recipe: Recipe) => {
      setFocusId(recipe.id);
      setSelectedId(recipe.id);
      navigateTo('graph', recipe);
    },
    [navigateTo],
  );

  const handleCookWithSimilar = useCallback(() => {
    if (!focusRecipe || !onCookTogether) return;
    const ids = [
      focusRecipe.id,
      ...similarList.slice(0, 3).map(s => s.recipe.id),
    ];
    onCookTogether(ids);
  }, [focusRecipe, onCookTogether, similarList]);

  return (
    <SwipeBackWrapper onBack={() => navigateTo('library')}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-10 pb-24"
      >
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className="flex items-center gap-2 text-sm font-label uppercase tracking-widest text-on-surface-variant hover:text-primary"
        >
          <ChevronLeft size={16} />
          Back to Library
        </button>

        <div className="space-y-3">
          <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold flex items-center gap-2">
            <Network size={16} />
            Connections
          </p>
          <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Recipe graph</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Explore how your recipes relate through shared ingredients, tags, and cuisine.
            {focusRecipe ? (
              <> Focused on <span className="text-primary font-headline italic">{focusRecipe.title}</span>.</>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6 min-w-0">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                aria-pressed={categoryFilter === null}
                className={`px-4 py-2 rounded-full text-[10px] font-label uppercase tracking-widest border transition-colors ${
                  categoryFilter === null
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-outline-variant hover:border-primary/40'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  aria-pressed={categoryFilter === cat}
                  className={`px-4 py-2 rounded-full text-[10px] font-label uppercase tracking-widest border transition-colors ${
                    categoryFilter === cat
                      ? 'bg-primary text-on-primary border-primary'
                      : 'border-outline-variant hover:border-primary/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low/40 p-5 space-y-3">
              <label htmlFor="similarity-threshold" className="flex items-center justify-between text-xs font-label uppercase tracking-widest">
                <span>Min similarity</span>
                <span className="text-primary font-bold">{formatPercent(threshold)}</span>
              </label>
              <input
                id="similarity-threshold"
                type="range"
                min={0.1}
                max={0.7}
                step={0.05}
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>

            {graph.nodes.length === 0 ? (
              <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center">
                <p className="text-on-surface-variant">
                  No recipes match these filters. Try lowering the similarity threshold.
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl border border-outline-variant/30 bg-surface overflow-hidden"
                role="img"
                aria-label="Recipe similarity graph"
              >
                <svg
                  viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                  className="w-full h-auto max-h-[min(70vh,520px)]"
                >
                  {graph.edges.map(edge => {
                    const a = positions.get(edge.source);
                    const b = positions.get(edge.target);
                    if (!a || !b) return null;
                    const highlighted =
                      selectedId === edge.source ||
                      selectedId === edge.target ||
                      activeFocusId === edge.source ||
                      activeFocusId === edge.target;
                    return (
                      <line
                        key={`${edge.source}-${edge.target}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="currentColor"
                        strokeWidth={highlighted ? 2.5 : 1}
                        className={highlighted ? 'text-primary/60' : 'text-outline-variant/50'}
                      />
                    );
                  })}
                  {graph.nodes.map(node => {
                    const pos = positions.get(node.id);
                    if (!pos) return null;
                    const isSelected = selectedId === node.id;
                    const isFocus = activeFocusId === node.id;
                    const label = node.recipe.title.length > 14
                      ? `${node.recipe.title.slice(0, 12)}…`
                      : node.recipe.title;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${node.recipe.title}, ${node.recipe.category}`}
                        aria-pressed={isSelected}
                        className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        onClick={() => handleSelectNode(node.id)}
                        onKeyDown={e => handleKeyNode(e, node.id)}
                      >
                        <circle
                          r={NODE_RADIUS}
                          className={
                            isFocus
                              ? 'fill-secondary stroke-secondary'
                              : isSelected
                                ? 'fill-primary stroke-primary'
                                : 'fill-surface-container-high stroke-outline-variant'
                          }
                          strokeWidth={isSelected || isFocus ? 3 : 1.5}
                        />
                        <text
                          y={NODE_RADIUS + 14}
                          textAnchor="middle"
                          className="fill-on-surface text-[9px] font-label uppercase tracking-wide pointer-events-none"
                        >
                          {label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {activeFocusId && similarList.length > 0 && onCookTogether && (
              <button
                type="button"
                onClick={handleCookWithSimilar}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-secondary/50 text-secondary text-xs font-label uppercase tracking-widest font-bold hover:bg-secondary/8"
              >
                <ChefHat size={16} />
                Cook with similar
              </button>
            )}

            {activeFocusId && similarList.length > 0 && (
              <section aria-labelledby="similar-list-heading" className="space-y-4">
                <h2 id="similar-list-heading" className="text-2xl font-headline italic">
                  Similar to {focusRecipe?.title}
                </h2>
                <ul className="space-y-2">
                  {similarList.map(({ recipe, breakdown }) => (
                    <li key={recipe.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(recipe.id)}
                        aria-pressed={selectedId === recipe.id}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                          selectedId === recipe.id
                            ? 'border-primary bg-primary/8'
                            : 'border-outline-variant/30 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-headline italic text-lg truncate">{recipe.title}</span>
                          <span className="text-[10px] font-label uppercase tracking-widest text-primary shrink-0">
                            {formatPercent(breakdown.score)}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {breakdown.sharedIngredients.slice(0, 4).join(', ')}
                          {breakdown.sharedIngredients.length > 4 ? '…' : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside
            className="lg:w-80 shrink-0 rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 p-6 space-y-5 h-fit lg:sticky lg:top-28"
            aria-live="polite"
          >
            {selectedRecipe ? (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">
                    {selectedRecipe.category}
                  </p>
                  <h2 className="text-3xl font-headline italic leading-tight">{selectedRecipe.title}</h2>
                  <p className="text-sm text-on-surface-variant line-clamp-3">{selectedRecipe.description}</p>
                </div>

                {selectedBreakdown && (
                  <div className="space-y-3 text-sm">
                    <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                      Similarity {formatPercent(selectedBreakdown.score)}
                    </p>
                    {selectedBreakdown.sharedIngredients.length > 0 && (
                      <div>
                        <p className="text-[10px] font-label uppercase tracking-widest mb-1">Shared ingredients</p>
                        <p className="text-on-surface-variant">{selectedBreakdown.sharedIngredients.join(', ')}</p>
                      </div>
                    )}
                    {selectedBreakdown.sharedTags.length > 0 && (
                      <div>
                        <p className="text-[10px] font-label uppercase tracking-widest mb-1">Shared tags</p>
                        <ul className="flex flex-wrap gap-1">
                          {selectedBreakdown.sharedTags.map(tag => (
                            <li
                              key={tag}
                              className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-label uppercase tracking-widest"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('detail', selectedRecipe)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-primary text-primary text-xs font-label uppercase tracking-widest font-bold hover:bg-primary/8"
                  >
                    <ExternalLink size={16} />
                    View recipe
                  </button>
                  <button
                    type="button"
                    onClick={() => startCooking(selectedRecipe)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold hover:bg-primary-container"
                  >
                    <Play size={16} fill="currentColor" />
                    Cook
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFocusRecipe(selectedRecipe)}
                    className="text-xs font-label uppercase tracking-widest text-on-surface-variant hover:text-primary"
                  >
                    Focus graph on this recipe
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Network className="mx-auto text-outline-variant" size={36} />
                <p className="text-sm text-on-surface-variant">
                  Select a node in the graph or pick from the similar list to preview connections.
                </p>
              </div>
            )}
          </aside>
        </div>
      </motion.div>
    </SwipeBackWrapper>
  );
};
