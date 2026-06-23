import React, { useCallback, useEffect, useState } from 'react';
import { Share2, Trash2, Check, Plus } from 'lucide-react';
import { Screen } from '../hooks/useNavigation';
import { ScreenShell } from '../components/ui/ScreenShell';
import { useRecipes } from '../context/RecipeContext';
import {
  buildShoppingItemsFromRecipes,
  createManualShoppingItem,
  groupItemsByAisle,
  shoppingListToMarkdown,
  type ShoppingItem,
} from '../utils/shoppingList';
import { fetchShoppingList, saveShoppingList } from '../services/shoppingListApi';
import { useToast } from '../components/ui/Toast';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';

interface ShoppingListScreenProps {
  navigateTo: (screen: Screen, recipe?: import('../types').Recipe) => void;
}

export const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({ navigateTo }) => {
  const ctx = useRecipes();
  const { showToast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');

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

  const addManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) return;
    const item = createManualShoppingItem(name, manualAmount);
    void persist([...items, item]);
    setManualName('');
    setManualAmount('');
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

  const groups = groupItemsByAisle(items);

  return (
    <ScreenShell onBack={() => navigateTo('library')} backLabel="Back to Library">
      <div className="space-y-3">
        <p className="text-sm font-label uppercase tracking-widest text-secondary font-bold">Kitchen</p>
        <h1 className="text-5xl md:text-7xl font-headline italic leading-none">Shopping list</h1>
        <p className="text-on-surface-variant">Merged ingredients from your recipes, grouped by aisle.</p>
      </div>

      <form onSubmit={addManualItem} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[160px] space-y-1">
          <Label htmlFor="manual-item-name">Add item</Label>
          <Input id="manual-item-name" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. Olive oil" />
        </div>
        <div className="w-32 space-y-1">
          <Label htmlFor="manual-item-amount">Amount</Label>
          <Input id="manual-item-amount" value={manualAmount} onChange={e => setManualAmount(e.target.value)} placeholder="1 bottle" />
        </div>
        <button type="submit" className="flex items-center gap-2 px-4 py-3 rounded-full bg-secondary text-on-primary text-xs font-label uppercase tracking-widest font-bold">
          <Plus size={14} />
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={generateFromLibrary} className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-label uppercase tracking-widest font-bold">
          Generate from library
        </button>
        <button type="button" onClick={() => void shareList()} disabled={items.length === 0} className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
          <Share2 size={14} />
          Share
        </button>
        <button type="button" onClick={clearChecked} disabled={!items.some(i => i.checked)} className="px-4 py-2 rounded-full border border-outline-variant text-xs font-label uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
          <Trash2 size={14} />
          Clear checked
        </button>
        {saving ? <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant self-center">Saving…</span> : null}
      </div>

      {loading ? (
        <p className="text-on-surface-variant font-label uppercase tracking-widest text-xs">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-low/50 p-12 text-center">
          <p className="text-on-surface-variant">Your list is empty. Add items manually or generate from your library.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(group => (
            <section key={group.aisle} aria-labelledby={`aisle-${group.aisle}`}>
              <h2 id={`aisle-${group.aisle}`} className="text-sm font-label uppercase tracking-widest text-secondary font-bold mb-3">
                {group.aisle}
              </h2>
              <ul className="space-y-2">
                {group.items.map(item => (
                  <li key={item.id}>
                    <label
                      className={`w-full flex items-center gap-4 rounded-xl border px-4 py-4 cursor-pointer transition-colors ${
                        item.checked ? 'border-outline-variant/30 opacity-60' : 'border-outline-variant/40 hover:bg-surface-container-low'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={item.checked}
                        onChange={() => toggleItem(item.id)}
                      />
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        item.checked ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
                      }`} aria-hidden>
                        {item.checked ? <Check size={14} /> : null}
                      </span>
                      <span className={`flex-1 font-light ${item.checked ? 'line-through' : ''}`}>{item.name}</span>
                      <span className="font-headline italic text-primary text-sm shrink-0">{item.amount}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </ScreenShell>
  );
};
