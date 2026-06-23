import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Plus, BookOpen, Trash2 } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useRecipes } from '../context/RecipeContext';
import {
  fetchCollections,
  createCollection,
  deleteCollection,
  fetchCollectionRecipeIds,
  type CollectionSummary,
} from '../services/collectionsApi';
import { ExportRecipeModal } from '../components/ExportRecipeModal';
import { useToast } from '../components/ui/Toast';
import type { Recipe } from '../types';

interface CollectionsScreenProps {
  navigateTo: (screen: Screen, recipe?: Recipe) => void;
}

export const CollectionsScreen: React.FC<CollectionsScreenProps> = ({ navigateTo }) => {
  const ctx = useRecipes();
  const { showToast } = useToast();
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportRecipes, setExportRecipes] = useState<Recipe[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCollections(await fetchCollections());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createCollection(name);
      setNewName('');
      await load();
      showToast('Collection created');
    } catch {
      showToast('Could not create collection');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCollection(id);
      await load();
    } catch {
      showToast('Could not delete collection');
    }
  };

  const handleExport = async (collection: CollectionSummary) => {
    try {
      const ids = await fetchCollectionRecipeIds(collection.id);
      const recipes = ids
        .map(id => ctx.recipes.find(r => r.id === id))
        .filter((r): r is Recipe => !!r);
      if (recipes.length === 0) {
        showToast('No recipes in this collection');
        return;
      }
      setExportRecipes(recipes);
      setExportOpen(true);
    } catch {
      showToast('Could not load collection');
    }
  };

  return (
    <SwipeBackWrapper onBack={() => navigateTo('library')}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-10 pb-24">
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className="flex items-center gap-2 text-sm font-label uppercase tracking-widest text-on-surface-variant hover:text-primary"
        >
          <ChevronLeft size={16} />
          Back to Library
        </button>

        <div className="space-y-3">
          <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Bookshelves</p>
          <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Collections</h1>
          <p className="text-on-surface-variant">Curate themed sets of recipes and export them as cookbooks.</p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="New collection name…"
            aria-label="New collection name"
            className="flex-1 rounded-full border border-outline-variant px-5 py-3 bg-surface focus:ring-2 focus:ring-primary/20"
            onKeyDown={e => e.key === 'Enter' && void handleCreate()}
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {loading ? (
          <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
        ) : collections.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center space-y-4">
            <BookOpen className="mx-auto text-outline-variant" size={40} />
            <p className="text-on-surface-variant">No collections yet. Create one to group your favorite recipes.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {collections.map(c => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-outline-variant/30 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="font-headline italic text-xl truncate">{c.name}</p>
                  <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mt-1">
                    {c.recipe_count} recipe{c.recipe_count === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleExport(c)}
                  className="px-4 py-2 rounded-full border border-primary/40 text-primary text-[10px] font-label uppercase tracking-widest"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${c.name}`}
                  onClick={() => void handleDelete(c.id)}
                  className="p-3 rounded-full border border-outline-variant text-on-surface-variant hover:text-secondary"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <ExportRecipeModal
        recipes={exportRecipes}
        open={exportOpen}
        onClose={() => { setExportOpen(false); setExportRecipes([]); }}
        onFeedback={showToast}
      />
    </SwipeBackWrapper>
  );
};
