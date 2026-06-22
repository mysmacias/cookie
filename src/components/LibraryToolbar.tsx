import React from 'react';
import { Plus, Search, SquareCheck, ListX, ArrowUpDown } from 'lucide-react';
import { SORT_OPTIONS, type LibrarySort } from '../hooks/useLibraryFilters';
import type { Recipe } from '../types';

interface LibraryToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  filter: 'all' | 'bookmarked';
  setFilter: (v: 'all' | 'bookmarked') => void;
  sort: LibrarySort;
  setSort: (v: LibrarySort) => void;
  selectionMode: boolean;
  setSelectionMode: (v: boolean) => void;
  selectedCount: number;
  exitSelectionMode: () => void;
  filteredCount: number;
  onExportList: () => void;
  onExportSelected: () => void;
  onAddRecipe: () => void;
}

export const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  searchQuery, setSearchQuery,
  filter, setFilter,
  sort, setSort,
  selectionMode, setSelectionMode,
  selectedCount, exitSelectionMode,
  filteredCount, onExportList, onExportSelected,
  onAddRecipe,
}) => (
  <>
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
          aria-label="Search recipes"
          className="w-full pl-12 pr-4 py-4 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
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
          aria-label="Sort recipes"
          value={sort}
          onChange={e => setSort(e.target.value as LibrarySort)}
          className="w-full appearance-none rounded-full border border-outline-variant bg-surface py-2 pl-9 pr-9 text-xs font-label uppercase tracking-widest text-on-surface shadow-none focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      {!selectionMode ? (
        <>
          <button
            type="button"
            onClick={() => setSelectionMode(true)}
            className="border border-outline-variant px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest flex items-center gap-2"
          >
            <SquareCheck size={14} />
            Select
          </button>
          {filteredCount > 0 ? (
            <button
              type="button"
              onClick={onExportList}
              className="border border-primary/40 text-primary px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest"
            >
              Export list ({filteredCount})
            </button>
          ) : null}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onExportSelected}
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
        onClick={onAddRecipe}
        aria-label="Add recipe"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-outline-variant text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
      >
        <Plus size={18} strokeWidth={2.25} />
      </button>
    </div>
  </>
);
