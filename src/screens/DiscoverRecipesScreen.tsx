import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, Loader2, Search, Sparkles } from 'lucide-react';
import type { Recipe } from '../types';
import { Screen } from '../hooks/useNavigation';
import { useRecipes } from '../context/RecipeContext';
import {
  getImportedApiExternalIds,
  importRecipeFromApi,
  searchRecipeApi,
  type RecipeApiPreview,
} from '../services/recipeApiImport';
import { useToast } from '../components/ui/Toast';

interface DiscoverRecipesScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
}

function formatMinutes(mins: number): string {
  if (!mins) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const DiscoverRecipesScreen: React.FC<DiscoverRecipesScreenProps> = ({ navigateTo }) => {
  const { recipes, refreshRecipes } = useRecipes();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<RecipeApiPreview[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const importedIds = useMemo(() => getImportedApiExternalIds(recipes), [recipes]);

  const runSearch = useCallback(async (q: string, p: number) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchRecipeApi({
        search: q || undefined,
        page: p,
        per_page: 10,
      });
      setResults(res.data);
      setTotalPages(res.meta.last_page);
      setTotal(res.meta.total);
    } catch (e) {
      setResults([]);
      setSearchError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(query, page);
  }, [query, page, runSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleImport = async (preview: RecipeApiPreview) => {
    if (importedIds.has(preview.id)) {
      const existing = recipes.find(r => r.id === `api_${preview.id}`);
      if (existing) navigateTo('detail', existing);
      return;
    }

    setImportingId(preview.id);
    try {
      const recipe = await importRecipeFromApi(preview.id);
      await refreshRecipes();
      showToast(`"${recipe.title}" added to your library.`);
      navigateTo('detail', recipe);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <motion.div
      key="discover"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-10"
    >
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-outline-variant hover:border-primary transition-colors"
          aria-label="Back to library"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary" size={28} strokeWidth={1.5} />
            <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Discover</h1>
          </div>
          <p className="text-on-surface-variant max-w-xl text-lg">
            Browse thousands of recipes from Recipe API and save any dish to your library with one tap.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <input
          type="search"
          placeholder="Search by name, cuisine, ingredient…"
          aria-label="Search Recipe API"
          className="w-full pl-12 pr-28 py-4 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-on-primary px-5 py-2 rounded-full text-xs font-label uppercase tracking-widest font-bold"
        >
          Search
        </button>
      </form>

      {searchError ? (
        <div className="rounded-2xl border border-error/30 bg-error-container/20 p-6 text-on-surface">
          {searchError}
        </div>
      ) : null}

      {isSearching && results.length === 0 ? (
        <div className="flex items-center justify-center gap-3 py-20 text-on-surface-variant">
          <Loader2 className="animate-spin" size={22} />
          <span className="font-label uppercase tracking-widest text-sm">Searching…</span>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center">
          <p className="text-on-surface-variant text-lg">No recipes found. Try a different search term.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-on-surface-variant font-label uppercase tracking-widest">
            {total.toLocaleString()} recipes · page {page} of {totalPages}
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {results.map(preview => {
              const imported = importedIds.has(preview.id);
              const isImporting = importingId === preview.id;
              const totalTime = (preview.prep_time ?? 0) + (preview.cook_time ?? 0);

              return (
                <article
                  key={preview.id}
                  className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/40 p-6 flex flex-col gap-4"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-headline italic leading-tight">{preview.name}</h2>
                    <p className="text-on-surface-variant line-clamp-2">{preview.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-label uppercase tracking-widest text-on-surface-variant">
                    {preview.cuisine ? (
                      <span className="rounded-full border border-outline-variant/50 px-3 py-1">{preview.cuisine}</span>
                    ) : null}
                    {preview.meal_type ? (
                      <span className="rounded-full border border-outline-variant/50 px-3 py-1">{preview.meal_type}</span>
                    ) : null}
                    {preview.difficulty ? (
                      <span className="rounded-full border border-outline-variant/50 px-3 py-1">{preview.difficulty}</span>
                    ) : null}
                    {totalTime > 0 ? (
                      <span className="rounded-full border border-outline-variant/50 px-3 py-1">{formatMinutes(totalTime)}</span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => void handleImport(preview)}
                    className={
                      imported
                        ? 'mt-auto flex items-center justify-center gap-2 rounded-full border border-primary/40 text-primary px-5 py-3 text-xs font-label uppercase tracking-widest'
                        : 'mt-auto flex items-center justify-center gap-2 rounded-full bg-primary text-on-primary px-5 py-3 text-xs font-label uppercase tracking-widest font-bold disabled:opacity-50'
                    }
                  >
                    {isImporting ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Download size={14} />
                    )}
                    {imported ? 'View in library' : isImporting ? 'Saving…' : 'Save to library'}
                  </button>
                </article>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                type="button"
                disabled={page <= 1 || isSearching}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="rounded-full border border-outline-variant px-5 py-2 text-xs font-label uppercase tracking-widest disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages || isSearching}
                onClick={() => setPage(p => p + 1)}
                className="rounded-full border border-outline-variant px-5 py-2 text-xs font-label uppercase tracking-widest disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
};
