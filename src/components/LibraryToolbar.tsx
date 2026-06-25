import React from 'react';
import { Plus, Search, SquareCheck, ListX, ArrowUpDown, LayoutGrid, ChefHat, Tag, X } from 'lucide-react';
import { FilterMenu } from './FilterMenu';
import { SORT_OPTIONS, type LibrarySort } from '../hooks/useLibraryFilters';

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
  onCookTogether?: () => void;
  cookTogetherCount?: number;
  onAddRecipe: () => void;
  gridCols: number;
  setGridCols: (cols: number) => void;
  cuisines: string[];
  cuisineFilters: string[];
  toggleCuisineFilter: (v: string) => void;
  clearCuisineFilters: () => void;
  allTags: string[];
  tagFilters: string[];
  toggleTagFilter: (v: string) => void;
  clearTagFilters: () => void;
}

export const LibraryToolbar: React.FC<LibraryToolbarProps> = ({
  searchQuery, setSearchQuery,
  filter, setFilter,
  sort, setSort,
  selectionMode, setSelectionMode,
  selectedCount, exitSelectionMode,
  filteredCount, onExportList, onExportSelected,
  onCookTogether, cookTogetherCount = 0,
  onAddRecipe,
  gridCols, setGridCols,
  cuisines, cuisineFilters, toggleCuisineFilter, clearCuisineFilters,
  allTags, tagFilters, toggleTagFilter, clearTagFilters,
}) => {
  const activeCount = cuisineFilters.length + tagFilters.length;
  const clearAll = () => { clearCuisineFilters(); clearTagFilters(); };

  return (
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
        <div className="inline-flex rounded-full border border-outline-variant p-0.5" role="group" aria-label="Recipe scope">
          {([['all', 'All'], ['bookmarked', 'Saved']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-xs font-label uppercase tracking-widest transition-colors ${
                filter === value ? 'bg-primary text-on-primary font-bold' : 'text-on-surface-variant'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {cuisines.length > 0 ? (
          <FilterMenu
            label="Cuisine"
            icon={<Tag size={13} aria-hidden />}
            options={cuisines}
            selected={cuisineFilters}
            onToggle={toggleCuisineFilter}
            onClear={clearCuisineFilters}
          />
        ) : null}

        {allTags.length > 0 ? (
          <FilterMenu
            label="Tags"
            options={allTags}
            selected={tagFilters}
            onToggle={toggleTagFilter}
            onClear={clearTagFilters}
            searchable
          />
        ) : null}

        <div className="relative">
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
            className="appearance-none rounded-full border border-outline-variant bg-surface py-2 pl-9 pr-9 text-xs font-label uppercase tracking-widest text-on-surface shadow-none focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
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
              {onCookTogether ? (
                <button
                  type="button"
                  onClick={onCookTogether}
                  disabled={cookTogetherCount < 2 || cookTogetherCount > 4}
                  className="border border-secondary text-secondary px-4 py-2 rounded-full text-xs font-label uppercase tracking-widest font-bold disabled:opacity-45 flex items-center gap-2"
                >
                  <ChefHat size={14} />
                  Cook together ({cookTogetherCount})
                </button>
              ) : null}
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
          <div className="flex items-center gap-1 border border-outline-variant rounded-full px-2 py-1" role="group" aria-label="Grid columns">
            <LayoutGrid size={14} className="text-outline ml-1" aria-hidden />
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                type="button"
                aria-label={`${n} column${n === 1 ? '' : 's'}`}
                aria-pressed={gridCols === n}
                onClick={() => setGridCols(n)}
                className={`h-8 w-8 rounded-full text-xs font-label font-bold ${
                  gridCols === n ? 'bg-primary text-on-primary' : 'hover:bg-surface-container'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-label uppercase tracking-widest text-outline">Filtering by</span>
          {cuisineFilters.map(c => (
            <button
              key={`c-${c}`}
              type="button"
              onClick={() => toggleCuisineFilter(c)}
              aria-label={`Remove cuisine ${c}`}
              className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary pl-3 pr-2 py-1 text-xs font-label uppercase tracking-widest"
            >
              {c}
              <X size={13} />
            </button>
          ))}
          {tagFilters.map(t => (
            <button
              key={`t-${t}`}
              type="button"
              onClick={() => toggleTagFilter(t)}
              aria-label={`Remove tag ${t}`}
              className="flex items-center gap-1.5 rounded-full bg-secondary/10 text-secondary pl-3 pr-2 py-1 text-xs font-label uppercase tracking-widest"
            >
              {t}
              <X size={13} />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-label uppercase tracking-widest text-on-surface-variant underline underline-offset-2 hover:text-on-surface"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </>
  );
};
