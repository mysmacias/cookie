import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Play, ExternalLink, Network, ChefHat, Clock, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
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
  type RegionInfo,
  type SimilarityBreakdown,
} from '../utils/recipeSimilarity';

interface RecipeGraphScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
  startCooking: (recipe: Recipe) => void;
  focusRecipeId?: string | null;
  onCookTogether?: (recipeIds: string[]) => void;
}

/** A node as consumed by the force graph; the simulation mutates x/y/vx/vy/fx/fy. */
interface GraphDatum {
  id: string;
  recipe: Recipe;
  region: RegionInfo;
  r: number;
  minutes: number | null;
  title: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface LinkDatum {
  source: string | GraphDatum;
  target: string | GraphDatum;
  weight: number;
}

const MIN_NODE_RADIUS = 7;
const MAX_NODE_RADIUS = 22;
const DEFAULT_THRESHOLD = 0.25;

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

function shortTime(minutes: number | null): string {
  return formatMinutes(minutes).replace(' min', 'm').replace(' hr', 'h').replace('Time unknown', '?');
}

function parseFocusFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const focus = params.get('focus');
  return focus?.trim() || null;
}

function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Read a few theme colors off the DOM so canvas painting matches the CSS tokens. */
function readThemeColors(): { onSurface: string; surfaceHigh: string; primary: string } {
  if (typeof document === 'undefined') {
    return { onSurface: '#e7e2d9', surfaceHigh: '#2a2a28', primary: '#7c9a78' };
  }
  const probe = (cls: string, prop: 'color' | 'backgroundColor') => {
    const el = document.createElement('span');
    el.className = cls;
    el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0';
    document.body.appendChild(el);
    const value = getComputedStyle(el)[prop];
    el.remove();
    return value;
  };
  return {
    onSurface: probe('text-on-surface', 'color'),
    surfaceHigh: probe('bg-surface-container-high', 'backgroundColor'),
    primary: probe('text-primary', 'color'),
  };
}

function idOf(end: string | GraphDatum): string {
  return typeof end === 'object' ? end.id : end;
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
    () => graph.nodes.map(n => ({ id: n.id, minutes: parseRecipeTimeMinutes(n.recipe.time) })),
    [graph.nodes],
  );

  const radiusMap = useMemo(() => buildRadiusMap(nodeTimes), [nodeTimes]);
  const radiusOf = useCallback((id: string) => radiusMap.get(id) ?? MIN_NODE_RADIUS, [radiusMap]);

  const minutesById = useMemo(() => {
    const m = new Map<string, number | null>();
    nodeTimes.forEach(n => m.set(n.id, n.minutes));
    return m;
  }, [nodeTimes]);

  const regionLegend = useMemo(() => getRegionLegend(graph.nodes.map(n => n.recipe)), [graph.nodes]);

  // Whether the graph canvas is mounted (vs the empty/loading state).
  const showGraph = graph.nodes.length > 0;

  // ---- Force graph plumbing --------------------------------------------
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [fgReady, setFgReady] = useState(false);
  // Defer mounting the (heavy) canvas a beat so the page's enter animation can
  // play smoothly first — mounting the force graph immediately saturates the
  // main thread and janks the transition.
  const [mountGraph, setMountGraph] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [themeColors, setThemeColors] = useState(() => ({ onSurface: '#e7e2d9', surfaceHigh: '#2a2a28', primary: '#7c9a78' }));
  const didFitRef = useRef(false);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => setThemeColors(readThemeColors()), []);

  useEffect(() => {
    const id = window.setTimeout(() => setMountGraph(true), 450);
    return () => window.clearTimeout(id);
  }, []);

  // Track the canvas container size; the force graph needs explicit pixel dims.
  // Re-runs when the graph first becomes visible (the container isn't in the DOM
  // while recipes are still loading), otherwise size would stay 0 forever.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const compute = () => {
      // Fall back to the parent width / a sane default if measurement is 0 so the
      // canvas still mounts; the observer corrects it once a real width is known.
      const w = Math.round(el.clientWidth || el.parentElement?.clientWidth || 640);
      const vh = window.innerHeight || 800;
      const h = Math.round(Math.min(660, Math.max(440, vh * 0.66)));
      setSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [showGraph]);

  // Keep node object identity stable across rebuilds so positions persist
  // (continuity) when the threshold/filter changes — only data fields refresh.
  const nodeCacheRef = useRef<Map<string, GraphDatum>>(new Map());
  const graphData = useMemo(() => {
    const cache = nodeCacheRef.current;
    const liveIds = new Set(graph.nodes.map(n => n.id));
    for (const id of [...cache.keys()]) if (!liveIds.has(id)) cache.delete(id);
    const nodes = graph.nodes.map(n => {
      const datum = cache.get(n.id) ?? ({ id: n.id } as GraphDatum);
      datum.recipe = n.recipe;
      datum.region = getRecipeRegion(n.recipe);
      datum.r = radiusOf(n.id);
      datum.minutes = minutesById.get(n.id) ?? null;
      datum.title = n.recipe.title;
      cache.set(n.id, datum);
      return datum;
    });
    const links: LinkDatum[] = graph.edges.map(e => ({ source: e.source, target: e.target, weight: e.weight }));
    return { nodes, links };
  }, [graph, radiusOf, minutesById]);

  // Adjacency for hover/selection highlighting.
  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    graph.edges.forEach(e => {
      (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target);
      (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source);
    });
    return m;
  }, [graph.edges]);

  const highlightId = hoverId ?? selectedId ?? activeFocusId;
  const highlightNodes = useMemo(() => {
    const s = new Set<string>();
    if (highlightId) {
      s.add(highlightId);
      adjacency.get(highlightId)?.forEach(id => s.add(id));
    }
    return s;
  }, [highlightId, adjacency]);
  const anyActive = Boolean(highlightId);

  // Configure d3 forces once the instance exists and whenever the graph changes.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-180).distanceMax(420);
    const link = fg.d3Force('link');
    if (link) {
      link
        .distance((l: LinkDatum) => radiusOf(idOf(l.source)) + radiusOf(idOf(l.target)) + 42)
        .strength((l: LinkDatum) => 0.06 + l.weight * 0.28);
    }
    fg.d3Force('collide', forceCollide((n: GraphDatum) => (n.r ?? MIN_NODE_RADIUS) + 3).strength(0.95).iterations(3));
    fg.d3ReheatSimulation?.();
  }, [fgReady, graphData, radiusOf]);

  // Frame the graph once it first settles.
  const handleEngineStop = useCallback(() => {
    if (didFitRef.current) return;
    didFitRef.current = true;
    fgRef.current?.zoomToFit(600, 48);
  }, []);

  // When focusing a recipe, glide the camera to it.
  useEffect(() => {
    if (!activeFocusId) return;
    const fg = fgRef.current;
    if (!fg) return;
    const target = graphData.nodes.find(n => n.id === activeFocusId);
    if (target && target.x != null && target.y != null) {
      fg.centerAt(target.x, target.y, 700);
      fg.zoom(2.2, 700);
    }
  }, [activeFocusId, graphData, fgReady]);

  // ---- Canvas painting --------------------------------------------------
  const paintNode = useCallback(
    (node: GraphDatum, c2d: CanvasRenderingContext2D, scale: number) => {
      const r = node.r ?? MIN_NODE_RADIUS;
      const region = node.region;
      const isActive = node.id === selectedId || node.id === activeFocusId;
      const isHover = node.id === hoverId;
      const dim = anyActive && !highlightNodes.has(node.id);
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      c2d.save();
      c2d.globalAlpha = dim ? 0.28 : 1;

      if (isActive || isHover) {
        c2d.beginPath();
        c2d.arc(x, y, r + 4, 0, 2 * Math.PI);
        c2d.strokeStyle = regionFill(region, true);
        c2d.globalAlpha = 0.5;
        c2d.lineWidth = 2;
        c2d.stroke();
        c2d.globalAlpha = 1;
      }

      c2d.beginPath();
      c2d.arc(x, y, r, 0, 2 * Math.PI);
      c2d.fillStyle = regionFill(region, isActive);
      c2d.fill();
      c2d.lineWidth = isActive ? 2.5 : 1.2;
      c2d.strokeStyle = isActive ? '#ffffff' : regionStroke(region);
      c2d.stroke();

      // Cook-time label inside the node, scaling with the node, when legible.
      if (r * scale > 11) {
        const fs = Math.max(4, Math.min(11, r / 1.7));
        c2d.font = `700 ${fs}px "Work Sans", system-ui, sans-serif`;
        c2d.textAlign = 'center';
        c2d.textBaseline = 'middle';
        c2d.fillStyle = '#ffffff';
        c2d.fillText(shortTime(node.minutes), x, y);
      }

      // Title label below, constant screen size, on hover/active or when zoomed in.
      if (isHover || isActive || scale > 2.4) {
        const label = node.title.length > 26 ? `${node.title.slice(0, 24)}…` : node.title;
        const fs = 12 / scale;
        c2d.font = `600 ${fs}px "Work Sans", system-ui, sans-serif`;
        c2d.textAlign = 'center';
        c2d.textBaseline = 'top';
        const padX = 5 / scale;
        const padY = 3 / scale;
        const tw = c2d.measureText(label).width;
        const bx = x - tw / 2 - padX;
        const by = y + r + 3 / scale;
        const bw = tw + padX * 2;
        const bh = fs + padY * 2;
        c2d.globalAlpha = dim ? 0.28 : 0.92;
        c2d.fillStyle = themeColors.surfaceHigh;
        if (typeof c2d.roundRect === 'function') {
          c2d.beginPath();
          c2d.roundRect(bx, by, bw, bh, 4 / scale);
          c2d.fill();
        } else {
          c2d.fillRect(bx, by, bw, bh);
        }
        c2d.globalAlpha = dim ? 0.3 : 1;
        c2d.fillStyle = themeColors.onSurface;
        c2d.fillText(label, x, by + padY);
      }

      c2d.restore();
    },
    [selectedId, activeFocusId, hoverId, anyActive, highlightNodes, themeColors],
  );

  const paintPointerArea = useCallback((node: GraphDatum, color: string, c2d: CanvasRenderingContext2D) => {
    c2d.fillStyle = color;
    c2d.beginPath();
    c2d.arc(node.x ?? 0, node.y ?? 0, (node.r ?? MIN_NODE_RADIUS) + 2, 0, 2 * Math.PI);
    c2d.fill();
  }, []);

  const linkColor = useCallback(
    (link: LinkDatum) => {
      const touches = highlightId && (idOf(link.source) === highlightId || idOf(link.target) === highlightId);
      if (touches) return themeColors.primary;
      return anyActive ? 'rgba(140,140,140,0.08)' : 'rgba(140,140,140,0.28)';
    },
    [highlightId, anyActive, themeColors],
  );

  const linkWidth = useCallback(
    (link: LinkDatum) => {
      const touches = highlightId && (idOf(link.source) === highlightId || idOf(link.target) === highlightId);
      return touches ? 1.6 + (link.weight ?? 0) * 1.5 : 0.6;
    },
    [highlightId],
  );

  // ---- Selection / sidebar ---------------------------------------------
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
    return getSimilarRecipes(activeFocusId, ctx.recipes, 12).filter(r => r.breakdown.score >= deferredThreshold);
  }, [activeFocusId, ctx.recipes, deferredThreshold]);

  useEffect(() => {
    document.title = activeFocusId ? 'Similar recipes · COOKIE' : 'Recipe graph · COOKIE';
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
    onCookTogether([focusRecipe.id, ...similarList.slice(0, 3).map(s => s.recipe.id)]);
  }, [focusRecipe, onCookTogether, similarList]);

  const zoomBy = useCallback((factor: number) => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.zoom(Math.max(0.4, Math.min(6, fg.zoom() * factor)), 250);
  }, []);

  const fitView = useCallback(() => fgRef.current?.zoomToFit(500, 48), []);

  return (
    <SwipeBackWrapper onBack={() => navigateTo('library')}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-24">
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
            Explore how your recipes relate through shared ingredients, tags, and cuisine. Drag nodes to rearrange,
            scroll to zoom. Bigger circles take longer to cook; colors group recipes by region of origin.
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
              <div className="rounded-2xl border border-outline-variant/30 bg-surface overflow-hidden">
                <div ref={wrapRef} className="relative w-full" style={{ height: size.h || 520 }} aria-label="Recipe similarity graph" role="img">
                  {size.w > 0 && mountGraph && (
                    <ForceGraph2D
                      ref={((el: any) => {
                        fgRef.current = el;
                        if (el && !fgReady) setFgReady(true);
                      }) as any}
                      width={size.w}
                      height={size.h}
                      graphData={graphData as any}
                      nodeId="id"
                      backgroundColor="rgba(0,0,0,0)"
                      nodeCanvasObjectMode={() => 'replace'}
                      nodeCanvasObject={paintNode as any}
                      nodePointerAreaPaint={paintPointerArea as any}
                      linkColor={linkColor as any}
                      linkWidth={linkWidth as any}
                      enableNodeDrag
                      onNodeDragEnd={(n: any) => {
                        n.fx = undefined;
                        n.fy = undefined;
                      }}
                      onNodeHover={(n: any) => setHoverId(n ? n.id : null)}
                      onNodeClick={(n: any) => handleSelectNode(n.id)}
                      onBackgroundClick={() => setSelectedId(null)}
                      warmupTicks={reduceMotion ? 220 : 0}
                      cooldownTicks={reduceMotion ? 0 : undefined}
                      d3VelocityDecay={0.3}
                      minZoom={0.4}
                      maxZoom={6}
                      onEngineStop={handleEngineStop}
                    />
                  )}
                  {(size.w === 0 || !mountGraph) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <span className="inline-block w-6 h-6 rounded-full border-2 border-outline-variant border-t-primary animate-spin" aria-hidden />
                      <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Building graph…</p>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => zoomBy(1.3)}
                      aria-label="Zoom in"
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant/50 bg-surface/90 backdrop-blur text-on-surface-variant hover:text-primary hover:border-primary/50 shadow-sm"
                    >
                      <ZoomIn size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomBy(0.75)}
                      aria-label="Zoom out"
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant/50 bg-surface/90 backdrop-blur text-on-surface-variant hover:text-primary hover:border-primary/50 shadow-sm"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={fitView}
                      aria-label="Fit graph to view"
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-outline-variant/50 bg-surface/90 backdrop-blur text-on-surface-variant hover:text-primary hover:border-primary/50 shadow-sm"
                    >
                      <Maximize size={15} />
                    </button>
                  </div>
                </div>

                <div className="border-t border-outline-variant/30 px-5 py-4 space-y-3 bg-surface-container-low/30">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">Region of origin</span>
                    {regionLegend.map(region => (
                      <span key={region.key} className="flex items-center gap-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: regionFill(region), border: `1.5px solid ${regionStroke(region)}` }}
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
