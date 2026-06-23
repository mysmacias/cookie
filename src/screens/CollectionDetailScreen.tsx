import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, ChefHat, X } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { RecipeCard } from '../components/RecipeCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useRecipes } from '../context/RecipeContext';
import {
  fetchCollectionRecipeIds,
  renameCollection,
  deleteCollection,
  removeRecipeFromCollection,
  type CollectionSummary,
  fetchCollections,
} from '../services/collectionsApi';
import { useToast } from '../components/ui/Toast';
import type { Recipe } from '../types';

interface CollectionDetailScreenProps {
  collectionId: string;
  navigateTo: (screen: Screen, recipe?: Recipe, cookPlanIds?: string[]) => void;
  startCooking: (recipe: Recipe) => void;
  onCookTogether: (ids: string[]) => void;
}

export const CollectionDetailScreen: React.FC<CollectionDetailScreenProps> = ({
  collectionId,
  navigateTo,
  startCooking,
  onCookTogether,
}) => {
  const ctx = useRecipes();
  const { showToast } = useToast();
  const [collection, setCollection] = useState<CollectionSummary | null>(null);
  const [recipeIds, setRecipeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Recipe | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [collections, ids] = await Promise.all([
        fetchCollections(),
        fetchCollectionRecipeIds(collectionId),
      ]);
      const found = collections.find(c => c.id === collectionId) ?? null;
      setCollection(found);
      setNameDraft(found?.name ?? '');
      setRecipeIds(ids);
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => { void load(); }, [load]);

  const recipes = useMemo(
    () => recipeIds.map(id => ctx.recipes.find(r => r.id === id)).filter((r): r is Recipe => !!r),
    [recipeIds, ctx.recipes],
  );

  const handleRename = async () => {
    const name = nameDraft.trim();
    if (!name) return;
    try {
      await renameCollection(collectionId, name);
      setRenaming(false);
      await load();
      showToast('Collection renamed');
    } catch {
      showToast('Could not rename collection');
    }
  };

  const handleDeleteCollection = async () => {
    try {
      await deleteCollection(collectionId);
      showToast('Collection deleted');
      navigateTo('collections');
    } catch {
      showToast('Could not delete collection');
    }
  };

  const handleRemoveRecipe = async (recipe: Recipe) => {
    try {
      await removeRecipeFromCollection(collectionId, recipe.id);
      await load();
      showToast('Removed from collection');
    } catch {
      showToast('Could not remove recipe');
    }
  };

  if (loading) {
    return (
      <ScreenShell onBack={() => navigateTo('collections')} backLabel="Back to Collections">
        <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
      </ScreenShell>
    );
  }

  if (!collection) {
    return (
      <ScreenShell onBack={() => navigateTo('collections')} backLabel="Back to Collections">
        <p className="font-headline italic text-2xl">Collection not found</p>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell onBack={() => navigateTo('collections')} backLabel="Back to Collections">
      <div className="space-y-3">
        {renaming ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={nameDraft}
              onChange={e => setNameDraft(e.target.value)}
              aria-label="Collection name"
              className="flex-1 text-4xl font-headline italic bg-transparent border-b border-outline-variant focus:outline-none focus:border-primary"
              onKeyDown={e => e.key === 'Enter' && void handleRename()}
            />
            <button type="button" onClick={() => void handleRename()} className="text-xs font-label uppercase tracking-widest text-primary">Save</button>
            <button type="button" onClick={() => { setRenaming(false); setNameDraft(collection.name); }} className="text-xs font-label uppercase tracking-widest text-on-surface-variant">Cancel</button>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <h1 className="text-5xl md:text-7xl font-headline italic leading-none flex-1">{collection.name}</h1>
            <button type="button" aria-label="Rename collection" onClick={() => setRenaming(true)} className="p-3 rounded-full border border-outline-variant">
              <Pencil size={18} />
            </button>
          </div>
        )}
        <p className="text-on-surface-variant">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {recipes.length >= 2 && recipes.length <= 4 ? (
          <button
            type="button"
            onClick={() => onCookTogether(recipes.map(r => r.id))}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-on-primary text-xs font-label uppercase tracking-widest font-bold"
          >
            <ChefHat size={14} />
            Cook collection
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-secondary/40 text-secondary text-xs font-label uppercase tracking-widest"
        >
          <Trash2 size={14} />
          Delete collection
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center">
          <p className="text-on-surface-variant">No recipes in this collection yet. Add recipes from their detail page.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {recipes.map(recipe => (
            <div key={recipe.id} className="relative group">
              <RecipeCard
                recipe={recipe}
                isBookmarked={ctx.isBookmarked(recipe.id)}
                onToggleBookmark={() => void ctx.toggleBookmark(recipe.id)}
                onRecipeImageChanged={() => void ctx.refreshRecipes()}
                onClick={() => navigateTo('detail', recipe)}
                onCookTonight={() => startCooking(recipe)}
              />
              <button
                type="button"
                aria-label={`Remove ${recipe.title} from collection`}
                onClick={() => setRemoveTarget(recipe)}
                className="absolute top-3 right-14 z-20 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-2 rounded-full bg-surface/90 border border-outline-variant text-secondary"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete collection?"
        message={`"${collection.name}" will be removed. Recipes in your library are not deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDeleteCollection()}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove from collection?"
        message={removeTarget ? `"${removeTarget.title}" will be removed from this collection.` : ''}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeTarget) void handleRemoveRecipe(removeTarget);
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </ScreenShell>
  );
};
