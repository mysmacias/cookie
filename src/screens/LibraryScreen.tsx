import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Plus, Search, SquareCheck, ListX, ArrowUpDown } from 'lucide-react';
import { usePinch } from '@use-gesture/react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getAllRecipes, getBookmarkedIds, toggleBookmark } from '../services/recipeStore';
import { Recipe } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { Screen } from '../hooks/useNavigation';

const GRID_KEY = 'cookie_grid_cols';
const SORT_KEY = 'cookie_library_sort';

type LibrarySort =
  | 'title-asc'
  | 'title-desc'
  | 'category-asc'
  | 'difficulty-asc'
  | 'difficulty-desc';

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'category-asc', label: 'Category' },
  { value: 'difficulty-asc', label: 'Difficulty · easy first' },
  { value: 'difficulty-desc', label: 'Difficulty · hard first' },
];

const DIFFICULTY_ORDER: Record<Recipe['difficulty'], number> = {
  Easy: 0,
  Medium: 1,
  Advanced: 2,
  Expert: 3,
};

function savedSort(): LibrarySort {
  try {
    const v = localStorage.getItem(SORT_KEY) as LibrarySort | null;
    if (v && SORT_OPTIONS.some(o => o.value === v)) return v;
  } catch { /* ignore */ }
  return 'title-asc';
}

function compareRecipes(a: Recipe, b: Recipe, sort: LibrarySort): number {
  const byTitle = () => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  switch (sort) {
    case 'title-asc':
      return byTitle();
    case 'title-desc':
      return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
    case 'category-asc': {
      const c = a.category.localeCompare(b.category, undefined, { sensitivity: 'base' });
      return c !== 0 ? c : byTitle();
    }
    case 'difficulty-asc': {
      const d = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
      return d !== 0 ? d : byTitle();
    }
    case 'difficulty-desc': {
      const d = DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty];
      return d !== 0 ? d : byTitle();
    }
    default:
      return byTitle();
  }
}

const TIERS = [
  { maxScale: 0.65, cols: 4, label: '4-col' },
  { maxScale: 0.85, cols: 3, label: '3-col' },
  { maxScale: 1.15, cols: 2, label: '2-col' },
  { maxScale: Infinity, cols: 1, label: '1-col' },
] as const;

function savedGridCols(): number {
  try {
    const v = localStorage.getItem(GRID_KEY);
    if (v) {
      const n = Number(v);
      if (n === 6) return 4;
      if (n === 1 || n === 2 || n === 3 || n === 4) return n;
    }
  } catch { /* ignore */ }
  return 3;
}

function colsToTierIndex(cols: number): number {
  return TIERS.findIndex(t => t.cols === cols) ?? 1;
}

function recipeMatchesSearch(query: string, r: Recipe): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (r.title.toLowerCase().includes(q)) return true;
  if (r.category.toLowerCase().includes(q)) return true;
  if (r.description.toLowerCase().includes(q)) return true;
  if (r.tags?.some(t => t.toLowerCase().includes(q))) return true;
  if (r.ingredients.some(i => i.name.toLowerCase().includes(q))) return true;
  return false;
}

interface LibraryScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
  recipeCatalogVersion: number;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigateTo, recipeCatalogVersion }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>(() => getAllRecipes());
  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');
  const [sort, setSort] = useState<LibrarySort>(savedSort);
  const [, setBookmarkRevision] = useState(0);
  const [gridCols, setGridCols] = useState(savedGridCols);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});
  const [exportOpen, setExportOpen] = useState(false);
  const [exportRecipes, setExportRecipes] = useState<Recipe[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const tierIndexRef = useRef(colsToTierIndex(gridCols));
  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const pinchScale = useMotionValue(1);
  const gridScale = useTransform(pinchScale, [0.6, 1, 1.4], [0.92, 1, 1.05]);

  const applyTier = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(TIERS.length - 1, idx));
    if (clamped === tierIndexRef.current) return;
    tierIndexRef.current = clamped;
    const cols = TIERS[clamped].cols;
    setGridCols(cols);
    try { localStorage.setItem(GRID_KEY, String(cols)); } catch { /* ignore */ }
    if (Capacitor.isNativePlatform()) {
      void Haptics.impact({ style: ImpactStyle.Light });
    }
  }, []);

  usePinch(
    ({ offset: [d], active }) => {
      pinchScale.set(active ? d : 1);
      if (active) {
        const newIdx = TIERS.findIndex(t => d <= t.maxScale);
        if (newIdx >= 0) applyTier(newIdx);
      }
      if (!active) {
        animate(pinchScale, 1, { duration: 0.2 });
      }
    },
    {
      scaleBounds: { min: 0.4, max: 1.6 },
      pointer: { touch: true },
      target: gridContainerRef,
      eventOptions: { passive: false },
    }
  );

  const gridColsClass =
    gridCols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
    gridCols === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
    gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' :
    'grid-cols-1';

  useEffect(() => {
    setRecipes(getAllRecipes());
  }, [recipeCatalogVersion]);

  const bookmarkedIds = getBookmarkedIds();

  const filteredRecipes = recipes
    .filter(r => recipeMatchesSearch(searchQuery, r))
    .filter(r => filter === 'all' || bookmarkedIds.includes(r.id))
    .slice()
    .sort((a, b) => compareRecipes(a, b, sort));

  const selectedRecipes = filteredRecipes.filter(r => selectedIds[r.id]);
  const selectedCount = selectedRecipes.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds({});
  };

  const openExport = (list: Recipe[]) => {
    if (list.length === 0) return;
    setExportRecipes(list);
    setExportOpen(true);
  };

  return (
    <motion.div 
      key="library"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-headline italic leading-none">The Library</h1>
          <p className="text-on-surface-variant max-w-md text-lg">
            A curated collection of heirloom recipes and modern classics, designed for the digital gastronome.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
          <input 
            type="text" 
            placeholder="Search recipes, tags, ingredients..."
            className="w-full pl-12 pr-4 py-4 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFilter('all')}
          className={
            filter === 'all'
              ? 'bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest font-bold'
              : 'border border-outline-variant px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest'
          }
        >
          All Recipes
        </button>
        <button
          onClick={() => setFilter('bookmarked')}
          className={
            filter === 'bookmarked'
              ? 'bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest font-bold'
              : 'border border-outline-variant px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest'
          }
        >
          Bookmarked
        </button>
        <div className="relative w-full sm:w-auto sm:min-w-[13rem]">
          <ArrowUpDown
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-outline"
            size={14}
            strokeWidth={2.25}
            aria-hidden
          />
          <select
            id="library-sort"
            aria-label="Sort recipes"
            value={sort}
            onChange={(e) => {
              const v = e.target.value as LibrarySort;
              setSort(v);
              try {
                localStorage.setItem(SORT_KEY, v);
              } catch { /* ignore */ }
            }}
            className="w-full appearance-none rounded-full border border-outline-variant bg-surface py-2 pl-9 pr-9 text-xs font-label uppercase tracking-widest text-on-surface shadow-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {!selectionMode ? (
          <>
            <button
              type="button"
              onClick={() => {
                setSelectionMode(true);
                setSelectedIds({});
              }}
              className="border border-outline-variant px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest flex items-center gap-2"
            >
              <SquareCheck size={14} />
              Select
            </button>
            {filteredRecipes.length > 0 ? (
              <button
                type="button"
                onClick={() => openExport(filteredRecipes)}
                className="border border-primary/40 text-primary px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest"
              >
                Export list ({filteredRecipes.length})
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openExport(selectedRecipes)}
              disabled={selectedCount === 0}
              className="bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest font-bold disabled:opacity-45"
            >
              Export selected ({selectedCount})
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="border border-outline-variant px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest flex items-center gap-2"
            >
              <ListX size={14} />
              Done
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => navigateTo('add')}
          aria-label="Add recipe"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
        >
          <Plus size={18} strokeWidth={2.25} />
        </button>
      </div>

      <motion.div
        ref={gridContainerRef}
        style={{ scale: gridScale, touchAction: 'pan-y pinch-zoom' }}
        className={`grid ${gridColsClass} gap-x-8 gap-y-16 origin-top transition-[grid-template-columns] duration-300`}
      >
        {filteredRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isBookmarked={bookmarkedIds.includes(recipe.id)}
            onToggleBookmark={() => {
              toggleBookmark(recipe.id);
              setBookmarkRevision(r => r + 1);
            }}
            onRecipeImageChanged={() => setRecipes(getAllRecipes())}
            selectionMode={selectionMode}
            selected={!!selectedIds[recipe.id]}
            onSelectToggle={() => toggleSelect(recipe.id)}
            onClick={() => navigateTo('detail', recipe)}
          />
        ))}
      </motion.div>

      <ExportRecipeModal
        recipes={exportRecipes}
        open={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setExportRecipes([]);
        }}
        onFeedback={(message) => setToast(message)}
      />
      {toast ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[250] px-5 py-3 rounded-full bg-on-surface text-surface text-sm shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      ) : null}
    </motion.div>
  );
};
