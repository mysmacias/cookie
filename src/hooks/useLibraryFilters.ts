import { useState, useCallback, useMemo, useRef } from 'react';
import { useMotionValue, useTransform, animate } from 'motion/react';
import { usePinch } from '@use-gesture/react';
import { haptic } from '../utils/haptics';
import type { Recipe } from '../types';
import { useRecipes } from '../context/RecipeContext';

const GRID_KEY = 'cookie_grid_cols';
const SORT_KEY = 'cookie_library_sort';

export type LibrarySort =
  | 'title-asc'
  | 'title-desc'
  | 'category-asc'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'added-desc'
  | 'added-asc';

export const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'category-asc', label: 'Category' },
  { value: 'difficulty-asc', label: 'Difficulty · easy first' },
  { value: 'difficulty-desc', label: 'Difficulty · hard first' },
  { value: 'added-desc', label: 'Date added · newest' },
  { value: 'added-asc', label: 'Date added · oldest' },
];

const DIFFICULTY_ORDER: Record<Recipe['difficulty'], number> = {
  Easy: 0, Medium: 1, Advanced: 2, Expert: 3,
};

function savedSort(): LibrarySort {
  try {
    const v = localStorage.getItem(SORT_KEY) as LibrarySort | null;
    if (v && SORT_OPTIONS.some(o => o.value === v)) return v;
  } catch { /* ignore */ }
  return 'title-asc';
}

function recipeAddedAt(r: Recipe): number {
  return r.addedAt ?? 0;
}

function compareRecipes(a: Recipe, b: Recipe, sort: LibrarySort): number {
  const byTitle = () => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  switch (sort) {
    case 'title-asc': return byTitle();
    case 'title-desc': return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
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
    case 'added-desc': {
      const d = recipeAddedAt(b) - recipeAddedAt(a);
      return d !== 0 ? d : byTitle();
    }
    case 'added-asc': {
      const d = recipeAddedAt(a) - recipeAddedAt(b);
      return d !== 0 ? d : byTitle();
    }
    default: return byTitle();
  }
}

const TIERS = [
  { maxScale: 0.65, cols: 4 },
  { maxScale: 0.85, cols: 3 },
  { maxScale: 1.15, cols: 2 },
  { maxScale: Infinity, cols: 1 },
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

export function useLibraryFilters() {
  const ctx = useRecipes();
  const recipes = ctx.recipes;
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');
  const [sort, setSort] = useState<LibrarySort>(savedSort);
  const [gridCols, setGridColsState] = useState(savedGridCols);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, true>>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  const tierIndexRef = useRef(colsToTierIndex(gridCols));
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const pinchScale = useMotionValue(1);
  const gridScale = useTransform(pinchScale, [0.6, 1, 1.4], [0.92, 1, 1.05]);

  const applyTier = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(TIERS.length - 1, idx));
    if (clamped === tierIndexRef.current) return;
    tierIndexRef.current = clamped;
    const cols = TIERS[clamped].cols;
    setGridColsState(cols);
    try { localStorage.setItem(GRID_KEY, String(cols)); } catch { /* ignore */ }
    haptic('light');
  }, []);

  usePinch(
    ({ offset: [d], active }) => {
      pinchScale.set(active ? d : 1);
      if (active) {
        const newIdx = TIERS.findIndex(t => d <= t.maxScale);
        if (newIdx >= 0) applyTier(newIdx);
      }
      if (!active) animate(pinchScale, 1, { duration: 0.2 });
    },
    {
      scaleBounds: { min: 0.4, max: 1.6 },
      pointer: { touch: true },
      target: gridContainerRef,
      eventOptions: { passive: false },
    }
  );

  const bookmarkedIds = ctx.bookmarkedIds;

  const bookmarkedSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) set.add(r.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) {
      for (const t of r.tags ?? []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const toggleTagFilter = useCallback((tag: string) => {
    setTagFilters(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag],
    );
  }, []);

  const setGridCols = useCallback((cols: number) => {
    const clamped = Math.max(1, Math.min(4, cols));
    tierIndexRef.current = colsToTierIndex(clamped);
    setGridColsState(clamped);
    try { localStorage.setItem(GRID_KEY, String(clamped)); } catch { /* ignore */ }
    haptic('light');
  }, []);

  const filteredRecipes = useMemo(() =>
    recipes
      .filter(r => recipeMatchesSearch(searchQuery, r))
      .filter(r => filter === 'all' || bookmarkedSet.has(r.id))
      .filter(r => !categoryFilter || r.category === categoryFilter)
      .filter(r => tagFilters.length === 0 || tagFilters.every(t =>
        r.tags?.some(rt => rt.toLowerCase() === t.toLowerCase()),
      ))
      .slice()
      .sort((a, b) => compareRecipes(a, b, sort)),
    [recipes, searchQuery, filter, sort, bookmarkedSet, categoryFilter, tagFilters],
  );

  const selectedRecipes = useMemo(
    () => filteredRecipes.filter(r => selectedIds[r.id]),
    [filteredRecipes, selectedIds],
  );
  const selectedCount = selectedRecipes.length;

  const handleToggleBookmark = useCallback((id: string) => {
    void ctx.toggleBookmark(id);
  }, [ctx.toggleBookmark]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds({});
  }, []);

  const setAndPersistSort = useCallback((v: LibrarySort) => {
    setSort(v);
    try { localStorage.setItem(SORT_KEY, v); } catch { /* ignore */ }
  }, []);

  const refreshRecipes = useCallback(() => ctx.refreshRecipes(), [ctx.refreshRecipes]);

  const gridColsClass =
    gridCols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' :
    gridCols === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
    gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' :
    'grid-cols-1';

  return {
    searchQuery, setSearchQuery,
    filter, setFilter,
    sort, setAndPersistSort,
    selectionMode, setSelectionMode,
    selectedIds, toggleSelect, exitSelectionMode,
    filteredRecipes, selectedRecipes, selectedCount,
    bookmarkedIds, bookmarkedSet, handleToggleBookmark,
    gridContainerRef, gridScale, gridColsClass, gridCols, setGridCols,
    categories, categoryFilter, setCategoryFilter,
    allTags, tagFilters, toggleTagFilter,
    refreshRecipes,
  };
}
