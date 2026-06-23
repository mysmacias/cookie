import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Share2, Trash2, Check } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { SwipeBackWrapper } from '../components/SwipeBackWrapper';
import { useRecipes } from '../context/RecipeContext';
import { buildShoppingItemsFromRecipes, shoppingListToMarkdown, type ShoppingItem } from '../utils/shoppingList';
import { fetchShoppingList, saveShoppingList } from '../services/shoppingListApi';
import { useToast } from '../components/ui/Toast';

interface ShoppingListScreenProps {
  navigateTo: (screen: Screen, recipe?: import('../types').Recipe) => void;
}

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({ navigateTo }) => {
  const ctx = useRecipes();
  const { showToast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchShoppingList());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const persist = async (next: ShoppingItem[]) => {
    setItems(next);
    setSaving(true);
    try {
      await saveShoppingList(next);
    } catch {
      showToast('Could not save shopping list');
    } finally {
      setSaving(false);
    }
  };

  const generateFromLibrary = () => {
    const generated = buildShoppingItemsFromRecipes(ctx.recipes);
    void persist(generated);
    showToast(`Added ${generated.length} items from your library`);
  };

  const toggleItem = (id: string) => {
    void persist(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const clearChecked = () => {
    void persist(items.filter(i => !i.checked));
  };

  const shareList = async () => {
    const md = shoppingListToMarkdown(items);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Shopping list', text: md });
        return;
      } catch { /* fall through */ }
    }
    try {
      await navigator.clipboard.writeText(md);
      showToast('Shopping list copied');
    } catch {
      showToast('Could not share list');
    }
  };

  return (
    <SwipeBackWrapper onBack={() => navigateTo('library')}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-10 pb-24">
        <button
          type="button"
          onClick={() => navigateTo('library')}
          className="flex items-center gap-2 text-sm font-label uppercase tracking-widest text-on-surface-variant hover:text-primary"
        >
          <ChevronLeft size={16} />
          Back to Library
        </button>

        <div className="space-y-3">
          <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Kitchen</p>
          <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Shopping list</h1>
          <p className="text-on-surface-variant">Merged ingredients from your recipes, ready for the market.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateFromLibrary}
            className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold"
          >
            Generate from library
          </button>
          <button
            type="button"
            onClick={() => void shareList()}
            disabled={items.length === 0}
            className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            type="button"
            onClick={clearChecked}
            disabled={!items.some(i => i.checked)}
            className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"
          >
            <Trash2 size={14} />
            Clear checked
          </button>
          {saving ? (
            <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant self-center">Saving…</span>
          ) : null}
        </div>

        {loading ? (
          <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center">
            <p className="text-on-surface-variant">Your list is empty. Generate from your library or add recipes first.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(item => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  className={`w-full flex items-center gap-4 rounded-xl border px-4 py-4 text-left transition-colors ${
                    item.checked ? 'border-outline-variant/30 opacity-60' : 'border-outline-variant/40 hover:bg-surface-container-low'
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    item.checked ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
                  }`}>
                    {item.checked ? <Check size={14} /> : null}
                  </span>
                  <span className={`flex-1 font-light ${item.checked ? 'line-through' : ''}`}>{item.name}</span>
                  <span className="font-headline italic text-primary text-sm shrink-0">{item.amount}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </SwipeBackWrapper>
  );
};
