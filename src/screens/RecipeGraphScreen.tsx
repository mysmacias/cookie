import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, ExternalLink, Network, ChefHat, Clock, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useRecipes } from '../context/RecipeContext';
import type { Recipe } from '../types';
import {
  buildRecipeGraph,
  computeSimilarity,
  getRecipeCategories,
  getRecipeRegion,
  getRegionLegend,
  getSimilarRecipes,
  parseRecipeTimeMinutes,
  type GraphEdge,
  type RegionInfo,
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

const SVG_SIZE = 640;
const MIN_NODE_RADIUS = 16;
const MAX_NODE_RADIUS = 42;
const DEFAULT_THRESHOLD = 0.25;
const TOTAL_ITERATIONS = 240;

/** Region color helpers: derive fill/stroke from a region's hue. */
function regionFill(region: RegionInfo, emphasis = false): string {
  return `hsl(${region.hue} 70% ${emphasis ? 58 : 50}%)`;
}
function regionStroke(region: RegionInfo): string {
  return `hsl(${region.hue} 75% 38%)`;
}

/**
 * Map each recipe to a node radius scaled by total cook time. Recipes without a
 * parseable time fall back to the smallest radius.
 */
function buildRadiusMap(recipes: { id: string; minutes: number | null }[]): Map<string, number> {
  const times = recipes.map(r => r.minutes).filter((m): m is number => m != null && m > 0);
  const map = new Map<string, number>();
  if (times.length === 0) {
    recipes.forEach(r => map.set(r.id, (MIN_NODE_RADIUS + MAX_NODE_RADIUS) / 2));
    return map;
  }
  const min = Math.min(...times);
  const max = Math.max(...times);
  // Square-root scale so area reads proportionally without huge outliers.
  const scale = (m: number) => {
    if (max === min) return (MIN_NODE_RADIUS + MAX_NODE_RADIUS) / 2;
    const t = (Math.sqrt(m) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min));
    return MIN_NODE_RADIUS + t * (MAX_NODE_RADIUS - MIN_NODE_RADIUS);
  };
  recipes.forEach(r => {
    map.set(r.id, r.minutes != null && r.minutes > 0 ? scale(r.minutes) : MIN_NODE_RADIUS);
  });
  return map;
}

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return 'Time unknown';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hrs} hr` : `${hrs} hr ${mins} min`;
}

function parseFocusFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const focus = params.get('focus');
  return focus?.trim() || null;
}

interface ForceSimulation {
  /** Live positions, mutated in place each tick. */
  positions: Map<string, NodePosition>;
  /** Advance the simulation by one iteration. No-op once finished. */
  tick: () => void;
  /** True once all iterations have run. */
  done: boolean;
}

/**
 * Build a steppable force-directed layout. Seeding happens up front (so nodes
 * can be painted immediately) while the expensive relaxation is exposed as
 * discrete `tick()`s — the screen drives these across animation frames so the
 * graph settles in without blocking the main thread on mount.
 */
function createForceSimulation(
  nodeIds: string[],
  edges: GraphEdge[],
  focusId: string | null,
  radiusOf: (id: string) => number,
  iterations = TOTAL_ITERATIONS,
  seed?: Map<string, NodePosition>,
): ForceSimulation {
  const positions = new Map<string, NodePosition>();
  const center = SVG_SIZE / 2;
  const n = Math.max(nodeIds.length, 1);

  // Spread the initial ring wider for bigger graphs so nodes don't start piled
  // on top of each other (which the solver struggles to untangle).
  const spread = Math.min(SVG_SIZE * 0.46, SVG_SIZE * (0.22 + n * 0.006));

  nodeIds.forEach((id, i) => {
    // Reuse a node's previous position when we have one so filter/focus changes
    // glide from where things were instead of re-scrambling from scratch. New
    // nodes drop onto a golden-angle spiral that fills the disk evenly.
    const prev = seed?.get(id);
    const t = (i + 0.5) / n;
    const angle = i * 2.399963229728653;
    const rad = spread * Math.sqrt(t);
    positions.set(id, {
      id,
      x: focusId === id ? center : prev?.x ?? center + rad * Math.cos(angle),
      y: focusId === id ? center : prev?.y ?? center + rad * Math.sin(angle),
    });
  });

  // Scale repulsion with node count so dense graphs push apart enough to read.
  const repulseK = 6000 + n * 120;
  // Gravity weakens as the graph grows, letting it use the whole canvas.
  const gravity = Math.max(0.006, 0.02 - n * 0.0002);

  let iter = 0;
  const sim: ForceSimulation = {
    positions,
    done: nodeIds.length === 0,
    tick() {
      if (iter >= iterations) {
        sim.done = true;
        return;
      }
      const cooling = 1 - iter / iterations;

      for (let i = 0; i < nodeIds.length; i++) {
        for (let j = i + 1; j < nodeIds.length; j++) {
          const a = positions.get(nodeIds[i])!;
          const b = positions.get(nodeIds[j])!;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          // Keep nodes apart relative to their combined radii so big (slow-cook)
          // circles never overlap their neighbors.
          const minGap = radiusOf(nodeIds[i]) + radiusOf(nodeIds[j]) + 22;
          const dist = Math.max(Math.hypot(dx, dy), 0.5);
          const overlap = dist < minGap ? (minGap - dist) * 0.5 : 0;
          const repulse = repulseK / (dist * dist) + overlap;
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
        const ideal = radiusOf(edge.source) + radiusOf(edge.target) + 70;
        const attract = (dist - ideal) * 0.05 * edge.weight;
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
        // Gentle pull toward center keeps the graph from drifting off-canvas
        // without crushing it into a ball.
        p.x += (center - p.x) * gravity * cooling;
        p.y += (center - p.y) * gravity * cooling;
        const margin = radiusOf(id) + 14;
        p.x = Math.min(SVG_SIZE - margin, Math.max(margin, p.x));
        p.y = Math.min(SVG_SIZE - margin, Math.max(margin, p.y));
      }

      iter++;
      if (iter >= iterations) sim.done = true;
    },
  };

  return sim;
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
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Defer the heavy graph rebuild so dragging the slider stays smooth — the
  // thumb tracks `threshold` immediately while the graph catches up at low
  // priority instead of recomputing O(n²) similarity on every tick.
  const deferredThreshold = useDeferredValue(threshold);

  const categories = useMemo(() => getRecipeCategories(ctx.recipes), [ctx.recipes]);

  const graph = useMemo(
    () => buildRecipeGraph(ctx.recipes, { threshold: deferredThreshold, categoryFilter }),
    [ctx.recipes, deferredThreshold, categoryFilter],
  );

  const activeFocusId = focusId && graph.nodes.some(n => n.id === focusId) ? focusId : null;

  const nodeTimes = useMemo(
    () =>
      graph.nodes.map(n => ({
        id: n.id,
        minutes: parseRecipeTimeMinutes(n.recipe.time),
      })),
    [graph.nodes],
  );

  const radiusMap = useMemo(() => buildRadiusMap(nodeTimes), [nodeTimes]);
  const radiusOf = useCallback(
    (id: string) => radiusMap.get(id) ?? MIN_NODE_RADIUS,
    [radiusMap],
  );

  const minutesById = useMemo(() => {
    const m = new Map<string, number | null>();
    nodeTimes.forEach(n => m.set(n.id, n.minutes));
    return m;
  }, [nodeTimes]);

  const regionLegend = useMemo(
    () => getRegionLegend(graph.nodes.map(n => n.recipe)),
    [graph.nodes],
  );

  // Positions are computed progressively (see effect below) rather than in
  // render, so navigating to this screen paints instantly and the graph
  // settles in afterward instead of blocking the main thread on mount.
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [isSettling, setIsSettling] = useState(true);
  const rafRef = useRef<number | null>(null);
  // Mirror of the latest positions so a re-layout can seed from where nodes
  // currently are (continuity) without making `positions` an effect dependency.
  const positionsRef = useRef<Map<string, NodePosition>>(new Map());

  useEffect(() => {
    const ids = graph.nodes.map(n => n.id);
    if (ids.length === 0) {
      positionsRef.current = new Map();
      setPositions(positionsRef.current);
      setIsSettling(false);
      return;
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const sim = createForceSimulation(
      ids,
      graph.edges,
      activeFocusId,
      radiusOf,
      TOTAL_ITERATIONS,
      positionsRef.current,
    );

    const commit = () => {
      positionsRef.current = new Map(sim.positions);
      setPositions(positionsRef.current);
    };

    // Reduced motion: solve in one deferred pass (still off the first paint, so
    // entry stays snappy) and drop the node-by-node settling animation.
    if (reduceMotion) {
      while (!sim.done) sim.tick();
      commit();
      setIsSettling(false);
      return;
    }

    // Paint the seeded layout immediately, then relax it over frames.
    commit();
    setIsSettling(true);

    // Fewer iterations per frame for larger graphs keeps each frame cheap so
    // the page stays responsive while the layout converges.
    const perFrame = Math.max(3, Math.round(30 - ids.length / 8));

    const step = () => {
      for (let k = 0; k < perFrame && !sim.done; k++) sim.tick();
      commit();
      if (sim.done) {
        setIsSettling(false);
        rafRef.current = null;
      } else {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [graph.nodes, graph.edges, activeFocusId, radiusOf]);

  const hasLayout = positions.size > 0;

  // ---- Pan & zoom -------------------------------------------------------
  // A single transform on the content group lets the user explore dense graphs
  // without re-running the layout. Panning is driven by pointer drags on the
  // canvas background (nodes stop propagation so taps still select).
  const svgRef = useRef<SVGSVGElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 });

  // Recenter when the graph's subject changes; keep zoom across threshold drags.
  useEffect(() => {
    setView({ scale: 1, x: 0, y: 0 });
  }, [activeFocusId, categoryFilter]);

  const zoomBy = useCallback((factor: number) => {
    setView(v => {
      const scale = Math.min(4, Math.max(0.6, v.scale * factor));
      // Keep the canvas center fixed while scaling.
      const c = SVG_SIZE / 2;
      return { scale, x: v.x + (v.scale - scale) * c, y: v.y + (v.scale - scale) * c };
    });
  }, []);

  const resetView = useCallback(() => setView({ scale: 1, x: 0, y: 0 }), []);

  const beginPan = (e: React.PointerEvent<SVGSVGElement>) => {
    // On touch, only hijack the gesture once zoomed in so the page can still
    // scroll past the graph at the default zoom.
    if (e.pointerType === 'touch' && view.scale <= 1) return;
    panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    svgRef.current?.setPointerCapture?.(e.pointerId);
  };

  const movePan = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    const rect = svgRef.current?.getBoundingClientRect();
    const ratio = rect && rect.width ? SVG_SIZE / rect.width : 1;
    const dx = (e.clientX - panRef.current.lastX) * ratio;
    const dy = (e.clientY - panRef.current.lastY) * ratio;
    panRef.current.lastX = e.clientX;
    panRef.current.lastY = e.clientY;
    setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const endPan = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    panRef.current.active = false;
    svgRef.current?.releasePointerCapture?.(e.pointerId);
  };

  const isZoomed = view.scale !== 1 || view.x !== 0 || view.y !== 0;

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
      r => r.breakdown.score >= deferredThreshold,
    );
  }, [activeFocusId, ctx.recipes, deferredThreshold]);

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

  // On the stacked (mobile) layout the detail panel sits below the graph, so a
  // node tap can scroll out of view. Bring the panel into view when a recipe is
  // selected; on desktop the panel is already beside the graph (sticky), so skip.
  useEffect(() => {
    if (!selectedId || typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

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
            Bigger circles take longer to cook; colors group recipes by region of origin.
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
                  {ctx.isLoading
                    ? 'Loading your recipes…'
                    : 'No recipes match these filters. Try lowering the similarity threshold.'}
                </p>
              </div>
            ) : (
              <div
                className="relative rounded-2xl border border-outline-variant/30 bg-surface overflow-hidden"
                role="img"
                aria-label="Recipe similarity graph"
              >
                {!hasLayout && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface">
                    <span
                      className="inline-block w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin"
                      aria-hidden
                    />
                    <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
                      Building graph…
                    </p>
                  </div>
                )}
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
                  className="w-full h-auto max-h-[min(80vh,680px)]"
                  style={{
                    opacity: hasLayout ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                    touchAction: view.scale > 1 ? 'none' : 'pan-y',
                    cursor: panRef.current.active ? 'grabbing' : 'grab',
                  }}
                  onPointerDown={beginPan}
                  onPointerMove={movePan}
                  onPointerUp={endPan}
                  onPointerCancel={endPan}
                >
                  <g
                    transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
                    style={{ transition: panRef.current.active ? 'none' : 'transform 0.18s ease' }}
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
                    const anyActive = Boolean(selectedId || activeFocusId);
                    return (
                      <line
                        key={`${edge.source}-${edge.target}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="currentColor"
                        strokeWidth={highlighted ? 3 + edge.weight * 2 : 1.5}
                        strokeLinecap="round"
                        className={highlighted ? 'text-primary' : 'text-outline-variant'}
                        style={{
                          opacity: highlighted ? 0.8 : anyActive ? 0.12 : 0.4,
                          transition: 'opacity 0.2s',
                        }}
                      />
                    );
                  })}
                  {graph.nodes.map(node => {
                    const pos = positions.get(node.id);
                    if (!pos) return null;
                    const isSelected = selectedId === node.id;
                    const isFocus = activeFocusId === node.id;
                    const isActive = isSelected || isFocus;
                    const isHovered = hoverId === node.id;
                    const region = getRecipeRegion(node.recipe);
                    const r = radiusOf(node.id);
                    const minutes = minutesById.get(node.id) ?? null;
                    // Dim nodes that aren't selected/focused while something is active.
                    const dim = (selectedId || activeFocusId) && !isActive && !isHovered;
                    // Title labels only appear for the active/hovered node to keep
                    // the canvas readable; the time always shows inside the circle.
                    const showLabel = isActive || isHovered;
                    const label = node.recipe.title.length > 22
                      ? `${node.recipe.title.slice(0, 20)}…`
                      : node.recipe.title;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        role="button"
                        tabIndex={0}
                        aria-label={`${node.recipe.title}, ${region.label}, ${formatMinutes(minutes)}`}
                        aria-pressed={isSelected}
                        className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        style={{ opacity: dim ? 0.3 : 1, transition: 'opacity 0.2s' }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => handleSelectNode(node.id)}
                        onKeyDown={e => handleKeyNode(e, node.id)}
                        onMouseEnter={() => setHoverId(node.id)}
                        onMouseLeave={() => setHoverId(prev => (prev === node.id ? null : prev))}
                        onFocus={() => setHoverId(node.id)}
                        onBlur={() => setHoverId(prev => (prev === node.id ? null : prev))}
                      >
                        {(isActive || isHovered) && (
                          <circle
                            r={r + 6}
                            fill="none"
                            stroke={regionFill(region, true)}
                            strokeWidth={2.5}
                            opacity={0.55}
                          />
                        )}
                        <circle
                          r={r}
                          fill={regionFill(region, isActive)}
                          stroke={isActive ? '#fff' : regionStroke(region)}
                          strokeWidth={isActive ? 3 : 1.5}
                        />
                        {r >= 20 && (
                          <text
                            y={4}
                            textAnchor="middle"
                            className="fill-white font-label font-bold pointer-events-none"
                            style={{ fontSize: Math.max(9, Math.min(12, r / 3.2)) }}
                          >
                            {formatMinutes(minutes)
                              .replace(' min', 'm')
                              .replace(' hr', 'h')
                              .replace('Time unknown', '?')}
                          </text>
                        )}
                        {showLabel && (
                          <g className="pointer-events-none">
                            <rect
                              x={-label.length * 3.4 - 6}
                              y={r + 4}
                              width={label.length * 6.8 + 12}
                              height={18}
                              rx={9}
                              className="fill-surface-container-high"
                              opacity={0.95}
                            />
                            <text
                              y={r + 16}
                              textAnchor="middle"
                              className="fill-on-surface text-[11px] font-label font-bold tracking-wide"
                            >
                              {label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                  </g>
                </svg>

                {hasLayout && (
                  <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => zoomBy(1.25)}
                      aria-label="Zoom in"
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant/50 bg-surface/90 backdrop-blur text-on-surface-variant hover:text-primary hover:border-primary/50 shadow-sm"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomBy(0.8)}
                      aria-label="Zoom out"
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant/50 bg-surface/90 backdrop-blur text-on-surface-variant hover:text-primary hover:border-primary/50 shadow-sm"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={resetView}
                      aria-label="Reset view"
                      disabled={!isZoomed}
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant/50 bg-surface/90 backdrop-blur text-on-surface-variant hover:text-primary hover:border-primary/50 shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Maximize size={15} />
                    </button>
                  </div>
                )}

                <div className="border-t border-outline-variant/30 px-5 py-4 space-y-3 bg-surface-container-low/30">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                      Region of origin
                    </span>
                    {regionLegend.map(region => (
                      <span key={region.key} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: regionFill(region),
                            border: `1.5px solid ${regionStroke(region)}`,
                          }}
                        />
                        <span className="text-xs text-on-surface">{region.label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                    <span>Circle size</span>
                    <span className="flex items-center gap-2 normal-case tracking-normal text-xs text-on-surface">
                      <span className="inline-block w-3 h-3 rounded-full bg-on-surface-variant/40" />
                      quick
                      <span className="inline-block w-5 h-5 rounded-full bg-on-surface-variant/40" />
                      slow to cook
                    </span>
                  </div>
                </div>
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
            ref={asideRef}
            className="lg:w-80 shrink-0 rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 p-6 space-y-5 h-fit lg:sticky lg:top-28 scroll-mt-24"
            aria-live="polite"
          >
            {selectedRecipe ? (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-label uppercase tracking-widest text-secondary font-bold">
                    {selectedRecipe.category}
                  </p>
                  <h2 className="text-3xl font-headline italic leading-tight">{selectedRecipe.title}</h2>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {(() => {
                      const region = getRecipeRegion(selectedRecipe);
                      return (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-label uppercase tracking-widest text-white"
                          style={{ backgroundColor: regionFill(region) }}
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-white/80" />
                          {region.label}
                        </span>
                      );
                    })()}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-outline-variant/50 text-[10px] font-label uppercase tracking-widest text-on-surface-variant">
                      <Clock size={11} />
                      {formatMinutes(parseRecipeTimeMinutes(selectedRecipe.time))}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-3 pt-1">{selectedRecipe.description}</p>
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
