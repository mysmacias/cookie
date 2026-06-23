import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, Globe, Loader2, Search, Sparkles } from 'lucide-react';
import type { Recipe } from '../types';
import { Screen } from '../hooks/useNavigation';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useRecipes } from '../context/RecipeContext';
import {
  getImportedApiExternalIds,
  importRecipeFromApi,
  searchRecipeApi,
  type RecipeApiPreview,
} from '../services/recipeApiImport';
import {
  findRecipeBySourceUrl,
  getImportedScrapeUrls,
  importRecipeFromUrl,
  searchWebRecipes,
  type WebRecipeSearchResult,
} from '../services/recipeScrape';
import { useToast } from '../components/ui/Toast';

interface DiscoverRecipesScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
}

type DiscoverTab = 'api' | 'web';

function formatMinutes(mins: number): string {
  if (!mins) return '';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const DiscoverRecipesScreen: React.FC<DiscoverRecipesScreenProps> = ({ navigateTo }) => {
  const { recipes, refreshRecipes } = useRecipes();
  const { showToast } = useToast();

  const [tab, setTab] = useState<DiscoverTab>('web');
  const [query, setQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [page, setPage] = useState(1);
  const [apiResults, setApiResults] = useState<RecipeApiPreview[]>([]);
  const [webResults, setWebResults] = useState<WebRecipeSearchResult[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [webHasMore, setWebHasMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [importingApiId, setImportingApiId] = useState<number | null>(null);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const importedApiIds = useMemo(() => getImportedApiExternalIds(recipes), [recipes]);
  const importedUrls = useMemo(() => getImportedScrapeUrls(recipes), [recipes]);

  const runApiSearch = useCallback(async (q: string, p: number) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchRecipeApi({
        search: q || undefined,
        page: p,
        per_page: 10,
      });
      setApiResults(res.data);
      setTotalPages(res.meta.last_page);
      setTotal(res.meta.total);
    } catch (e) {
      setApiResults([]);
      setSearchError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const runWebSearch = useCallback(async (q: string, p: number) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await searchWebRecipes({
        q: q || undefined,
        page: p,
        per_page: 10,
      });
      setWebResults(res.data);
      setWebHasMore(res.meta.has_more);
      setTotalPages(res.meta.has_more ? p + 1 : p);
      setTotal(res.data.length);
    } catch (e) {
      setWebResults([]);
      setSearchError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'api') {
      void runApiSearch(query, page);
    } else {
      void runWebSearch(query, page);
    }
  }, [tab, query, page, runApiSearch, runWebSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const handleApiImport = async (preview: RecipeApiPreview) => {
    if (importedApiIds.has(preview.id)) {
      const existing = recipes.find(r => r.id === `api_${preview.id}`);
      if (existing) navigateTo('detail', existing);
      return;
    }

    setImportingApiId(preview.id);
    try {
      const recipe = await importRecipeFromApi(preview.id);
      await refreshRecipes();
      showToast(`"${recipe.title}" added to your library.`);
      navigateTo('detail', recipe);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImportingApiId(null);
    }
  };

  const handleWebImport = async (result: WebRecipeSearchResult) => {
    if (importedUrls.has(result.url)) {
      const existing = findRecipeBySourceUrl(recipes, result.url);
      if (existing) navigateTo('detail', existing);
      return;
    }

    setImportingUrl(result.url);
    try {
      const recipe = await importRecipeFromUrl(result.url);
      await refreshRecipes();
      showToast(`"${recipe.title}" saved from ${hostFromUrl(result.url)}.`);
      navigateTo('detail', recipe);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setImportingUrl(null);
    }
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInput.trim();
    if (!url) return;

    if (importedUrls.has(url)) {
      const existing = findRecipeBySourceUrl(recipes, url);
      if (existing) navigateTo('detail', existing);
      return;
    }

    setImportingUrl(url);
    try {
      const recipe = await importRecipeFromUrl(url);
      await refreshRecipes();
      showToast(`"${recipe.title}" saved to your library.`);
      navigateTo('detail', recipe);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImportingUrl(null);
    }
  };

  const switchTab = (next: DiscoverTab) => {
    setTab(next);
    setPage(1);
    setSearchError(null);
  };

  return (
    <SwipeBackWrapper onBack={() => navigateTo('library')}>
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
            Search the web for recipes on blogs and cooking sites, or browse Recipe API — then save any dish to your library with the source link preserved.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Discover sources">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'web'}
          onClick={() => switchTab('web')}
          className={
            tab === 'web'
              ? 'flex items-center gap-2 rounded-full bg-primary text-on-primary px-5 py-2.5 text-xs font-label uppercase tracking-widest font-bold'
              : 'flex items-center gap-2 rounded-full border border-outline-variant px-5 py-2.5 text-xs font-label uppercase tracking-widest'
          }
        >
          <Globe size={14} />
          From the web
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'api'}
          onClick={() => switchTab('api')}
          className={
            tab === 'api'
              ? 'rounded-full bg-primary text-on-primary px-5 py-2.5 text-xs font-label uppercase tracking-widest font-bold'
              : 'rounded-full border border-outline-variant px-5 py-2.5 text-xs font-label uppercase tracking-widest'
          }
        >
          Recipe API
        </button>
      </div>

      {tab === 'web' ? (
        <form onSubmit={handleUrlImport} className="relative max-w-xl">
          <input
            type="url"
            placeholder="Paste a recipe URL to import directly…"
            aria-label="Recipe URL"
            className="w-full px-5 pr-28 py-4 bg-surface-container rounded-full border-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!urlInput.trim() || importingUrl === urlInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary text-on-secondary px-5 py-2 rounded-full text-xs font-label uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {importingUrl === urlInput.trim() ? 'Saving…' : 'Import'}
          </button>
        </form>
      ) : null}

      <form onSubmit={handleSearchSubmit} className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
        <input
          type="search"
          placeholder={tab === 'web' ? 'Search the web for recipes…' : 'Search by name, cuisine, ingredient…'}
          aria-label={tab === 'web' ? 'Search the web for recipes' : 'Search Recipe API'}
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

      {tab === 'api' ? (
        <ApiResults
          results={apiResults}
          isSearching={isSearching}
          page={page}
          totalPages={totalPages}
          total={total}
          importedIds={importedApiIds}
          importingId={importingApiId}
          onImport={handleApiImport}
          onPageChange={setPage}
        />
      ) : (
        <WebResults
          results={webResults}
          isSearching={isSearching}
          page={page}
          totalPages={totalPages}
          hasMore={webHasMore}
          importedUrls={importedUrls}
          importingUrl={importingUrl}
          onImport={handleWebImport}
          onPageChange={setPage}
        />
      )}
    </motion.div>
    </SwipeBackWrapper>
  );
};

interface ApiResultsProps {
  results: RecipeApiPreview[];
  isSearching: boolean;
  page: number;
  totalPages: number;
  total: number;
  importedIds: Set<number>;
  importingId: number | null;
  onImport: (preview: RecipeApiPreview) => void;
  onPageChange: (page: number) => void;
}

function ApiResults({
  results,
  isSearching,
  page,
  totalPages,
  total,
  importedIds,
  importingId,
  onImport,
  onPageChange,
}: ApiResultsProps) {
  if (isSearching && results.length === 0) {
    return <LoadingState />;
  }
  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
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
              <ImportButton imported={imported} isImporting={isImporting} onClick={() => void onImport(preview)} />
            </article>
          );
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} isSearching={isSearching} onPageChange={onPageChange} />
    </>
  );
}

interface WebResultsProps {
  results: WebRecipeSearchResult[];
  isSearching: boolean;
  page: number;
  totalPages: number;
  hasMore: boolean;
  importedUrls: Set<string>;
  importingUrl: string | null;
  onImport: (result: WebRecipeSearchResult) => void;
  onPageChange: (page: number) => void;
}

function WebResults({
  results,
  isSearching,
  page,
  totalPages,
  hasMore,
  importedUrls,
  importingUrl,
  onImport,
  onPageChange,
}: WebResultsProps) {
  if (isSearching && results.length === 0) {
    return <LoadingState />;
  }
  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      <p className="text-sm text-on-surface-variant font-label uppercase tracking-widest">
        {results.length} results on this page{hasMore ? ' · more available' : ''}
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {results.map(result => {
          const imported = importedUrls.has(result.url);
          const isImporting = importingUrl === result.url;

          return (
            <article
              key={result.url}
              className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/40 p-6 flex flex-col gap-4"
            >
              {result.thumbnail ? (
                <img
                  src={result.thumbnail}
                  alt=""
                  className="h-40 w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="space-y-2">
                <h2 className="text-2xl font-headline italic leading-tight">{result.title}</h2>
                <p className="text-on-surface-variant line-clamp-2">{result.description}</p>
                <p className="text-xs font-label uppercase tracking-widest text-secondary">{hostFromUrl(result.url)}</p>
              </div>
              <ImportButton imported={imported} isImporting={isImporting} onClick={() => void onImport(result)} />
            </article>
          );
        })}
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        isSearching={isSearching}
        onPageChange={onPageChange}
        disableNext={!hasMore && page >= totalPages}
      />
    </>
  );
}

function ImportButton({
  imported,
  isImporting,
  onClick,
}: {
  imported: boolean;
  isImporting: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isImporting}
      onClick={onClick}
      className={
        imported
          ? 'mt-auto flex items-center justify-center gap-2 rounded-full border border-primary/40 text-primary px-5 py-3 text-xs font-label uppercase tracking-widest'
          : 'mt-auto flex items-center justify-center gap-2 rounded-full bg-primary text-on-primary px-5 py-3 text-xs font-label uppercase tracking-widest font-bold disabled:opacity-50'
      }
    >
      {isImporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
      {imported ? 'View in library' : isImporting ? 'Saving…' : 'Save to library'}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-on-surface-variant">
      <Loader2 className="animate-spin" size={22} />
      <span className="font-label uppercase tracking-widest text-sm">Searching…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center">
      <p className="text-on-surface-variant text-lg">No recipes found. Try a different search term or paste a recipe URL above.</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  isSearching,
  onPageChange,
  disableNext,
}: {
  page: number;
  totalPages: number;
  isSearching: boolean;
  onPageChange: (page: number) => void;
  disableNext?: boolean;
}) {
  if (totalPages <= 1 && page <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button
        type="button"
        disabled={page <= 1 || isSearching}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="rounded-full border border-outline-variant px-5 py-2 text-xs font-label uppercase tracking-widest disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-on-surface-variant">{page} / {totalPages}</span>
      <button
        type="button"
        disabled={(disableNext ?? page >= totalPages) || isSearching}
        onClick={() => onPageChange(page + 1)}
        className="rounded-full border border-outline-variant px-5 py-2 text-xs font-label uppercase tracking-widest disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
