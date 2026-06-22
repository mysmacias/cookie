import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';
import { Recipe } from '../types';
import { RecipeCard } from '../components/RecipeCard';
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { Screen } from '../hooks/useNavigation';
import { useLibraryFilters } from '../hooks/useLibraryFilters';
import { useToast } from '../components/ui/Toast';

interface LibraryScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigateTo }) => {
  const lib = useLibraryFilters();
  const { showToast } = useToast();
  const [exportOpen, setExportOpen] = useState(false);
  const [exportRecipes, setExportRecipes] = useState<Recipe[]>([]);

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
      <LibraryToolbar
        searchQuery={lib.searchQuery}
        setSearchQuery={lib.setSearchQuery}
        filter={lib.filter}
        setFilter={lib.setFilter}
        sort={lib.sort}
        setSort={lib.setAndPersistSort}
        selectionMode={lib.selectionMode}
        setSelectionMode={lib.setSelectionMode}
        selectedCount={lib.selectedCount}
        exitSelectionMode={lib.exitSelectionMode}
        filteredCount={lib.filteredRecipes.length}
        onExportList={() => openExport(lib.filteredRecipes)}
        onExportSelected={() => openExport(lib.selectedRecipes)}
        onAddRecipe={() => navigateTo('add')}
      />

      {lib.filteredRecipes.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center space-y-4">
          <BookOpen className="mx-auto text-outline-variant" size={40} strokeWidth={1.25} />
          <p className="text-on-surface-variant text-lg">
            {lib.filter === 'bookmarked'
              ? 'No bookmarked recipes yet. Tap the heart icon on any recipe to save it here.'
              : 'No recipes match your search. Try a different term or clear the filter.'}
          </p>
        </div>
      ) : (
        <motion.div
          ref={lib.gridContainerRef}
          style={{ scale: lib.gridScale, touchAction: 'pan-y pinch-zoom' }}
          className={`grid ${lib.gridColsClass} gap-x-8 gap-y-16 origin-top transition-[grid-template-columns] duration-300`}
        >
          {lib.filteredRecipes.map((recipe) => (
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
    </motion.div>
  );
};
