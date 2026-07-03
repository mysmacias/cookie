import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search, FileEdit } from 'lucide-react';
import { Recipe } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { DraftCard } from '../components/DraftCard';
import { RecipeCardSkeleton } from '../components/RecipeCardSkeleton';
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { Screen } from '../hooks/useNavigation';
import { useLibraryFilters } from '../hooks/useLibraryFilters';
import { useToast } from '../components/ui/Toast';
import { useRecipes } from '../context/RecipeContext';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface LibraryScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
  startCooking: (recipe: Recipe) => void;
  onResumeDraft: (recipe: Recipe) => void;
  onCookTogether?: (recipeIds: string[]) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigateTo, startCooking, onResumeDraft, onCookTogether }) => {
  const lib = useLibraryFilters();
  const { showToast } = useToast();
  const { isLoading, deleteRecipe } = useRecipes();
  const reducedMotion = useReducedMotion();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportRecipes, setExportRecipes] = useState<Recipe[]>([]);
  const [draftToDiscard, setDraftToDiscard] = useState<Recipe | null>(null);

  const isDrafts = lib.filter === 'drafts';

  const openExport = (list: Recipe[]) => {
    if (list.length === 0) return;
    setExportRecipes(list);
    setExportOpen(true);
  };

  const confirmDiscardDraft = async () => {
    if (!draftToDiscard) return;
    const title = draftToDiscard.title || 'Untitled recipe';
    try {
      await deleteRecipe(draftToDiscard.id);
      showToast(`Discarded draft “${title}”.`);
    } catch {
      showToast('Could not discard draft. Try again.');
    } finally {
      setDraftToDiscard(null);
    }
  };

  const motionProps = reducedMotion
    ? {}
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  const emptyMessage = () => {
    if (isDrafts) {
      return 'No drafts. When you start adding a recipe, we save your progress here automatically.';
    }
    if (lib.filter === 'bookmarked') {
      return 'No bookmarked recipes yet. Tap the heart icon on any recipe to save it here.';
    }
    if (lib.cuisineFilters.length > 0 || lib.tagFilters.length > 0) {
      return 'No recipes match your filters. Try clearing cuisine or tag filters.';
    }
    if (lib.searchQuery.trim()) {
      return 'No recipes match your search. Try a different term or clear the filter.';
    }
    return 'Your library is empty. Add a recipe or discover new ones.';
  };

  return (
    <motion.div key="library" {...motionProps} className="space-y-12">
      <LibraryToolbar
        searchQuery={lib.searchQuery}
        setSearchQuery={lib.setSearchQuery}
        filter={lib.filter}
        setFilter={lib.setFilter}
        draftCount={lib.draftCount}
        sort={lib.sort}
        setSort={lib.setAndPersistSort}
        selectionMode={lib.selectionMode}
        setSelectionMode={lib.setSelectionMode}
        selectedCount={lib.selectedCount}
        exitSelectionMode={lib.exitSelectionMode}
        filteredCount={lib.filteredRecipes.length}
        onExportList={() => openExport(lib.filteredRecipes)}
        onExportSelected={() => openExport(lib.selectedRecipes)}
        onCookTogether={
          onCookTogether
            ? () => {
                const ids = lib.selectedRecipes.map(r => r.id);
                if (ids.length >= 2 && ids.length <= 4) {
                  lib.exitSelectionMode();
                  onCookTogether(ids);
                }
              }
            : undefined
        }
        cookTogetherCount={lib.selectedCount}
        onAddRecipe={() => navigateTo('add')}
        gridCols={lib.gridCols}
        setGridCols={lib.setGridCols}
        cuisines={lib.cuisines}
        cuisineFilters={lib.cuisineFilters}
        toggleCuisineFilter={lib.toggleCuisineFilter}
        clearCuisineFilters={lib.clearCuisineFilters}
        allTags={lib.allTags}
        tagFilters={lib.tagFilters}
        toggleTagFilter={lib.toggleTagFilter}
        clearTagFilters={lib.clearTagFilters}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : lib.filteredRecipes.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center space-y-4">
          {isDrafts ? (
            <FileEdit className="mx-auto text-outline-variant" size={40} strokeWidth={1.25} />
          ) : lib.searchQuery.trim() ? (
            <Search className="mx-auto text-outline-variant" size={40} strokeWidth={1.25} />
          ) : (
            <BookOpen className="mx-auto text-outline-variant" size={40} strokeWidth={1.25} />
          )}
          <p className="text-on-surface-variant text-lg max-w-md mx-auto">{emptyMessage()}</p>
        </div>
      ) : (
        <motion.div
          ref={lib.gridContainerRef}
          style={{ scale: lib.gridScale, touchAction: 'pan-y pinch-zoom' }}
          className={`grid ${lib.gridColsClass} gap-x-8 gap-y-16 origin-top transition-[grid-template-columns] duration-300`}
        >
          {isDrafts
            ? lib.filteredRecipes.map((recipe) => (
                <DraftCard
                  key={recipe.id}
                  recipe={recipe}
                  onResume={() => onResumeDraft(recipe)}
                  onDiscard={() => setDraftToDiscard(recipe)}
                />
              ))
            : lib.filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  isBookmarked={lib.bookmarkedSet.has(recipe.id)}
                  onToggleBookmark={() => lib.handleToggleBookmark(recipe.id)}
                  onRecipeImageChanged={lib.refreshRecipes}
                  selectionMode={lib.selectionMode}
                  selected={!!lib.selectedIds[recipe.id]}
                  onSelectToggle={() => lib.toggleSelect(recipe.id)}
                  onClick={() => navigateTo('detail', recipe)}
                  onCookTonight={() => startCooking(recipe)}
                />
              ))}
        </motion.div>
      )}

      <ExportRecipeModal
        recipes={exportRecipes}
        open={exportOpen}
        onClose={() => { setExportOpen(false); setExportRecipes([]); }}
        onFeedback={showToast}
      />

      <ConfirmDialog
        open={draftToDiscard !== null}
        title="Discard draft?"
        message={`“${draftToDiscard?.title || 'Untitled recipe'}” will be permanently deleted. This can't be undone.`}
        confirmLabel="Discard"
        cancelLabel="Keep"
        destructive
        onConfirm={() => void confirmDiscardDraft()}
        onCancel={() => setDraftToDiscard(null)}
      />
    </motion.div>
  );
};
