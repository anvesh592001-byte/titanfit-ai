'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Save,
  ShoppingCart,
  Square,
  Trash2
} from 'lucide-react';
import type { GroceryItem, GroceryListRow, MealPlanRow } from '@/types/domain';
import {
  generateGroceryListFromPlan,
  groupGroceryItemsByCategory
} from '@/lib/nutrition/grocery-engine';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface GroceryListClientProps {
  initialLists: GroceryListRow[];
  savedMealPlans: MealPlanRow[];
}

export function GroceryListClient({
  initialLists,
  savedMealPlans
}: GroceryListClientProps) {
  const { pushToast } = useToast();

  const [lists, setLists] = useState<GroceryListRow[]>(initialLists);
  const [activeListId, setActiveListId] = useState<string | null>(
    initialLists[0]?.id ?? null
  );
  const [title, setTitle] = useState<string>(
    initialLists[0]?.title ?? 'Weekly Grocery List'
  );
  const [mealPlanId, setMealPlanId] = useState<string | null>(
    initialLists[0]?.meal_plan_id ?? null
  );
  const [items, setItems] = useState<GroceryItem[]>(initialLists[0]?.items ?? []);

  const [customItemName, setCustomItemName] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState('Pantry & Spices');
  const [customItemGrams, setCustomItemGrams] = useState(100);

  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const grouped = useMemo(() => groupGroceryItemsByCategory(items), [items]);

  const handleBuildFromPlan = (plan: MealPlanRow) => {
    const generated = generateGroceryListFromPlan(plan.plan_data);
    setActiveListId(null);
    setMealPlanId(plan.id);
    setTitle(`Grocery List — ${plan.title}`);
    setItems(generated);
    pushToast({
      kind: 'success',
      title: 'Aggregated from Meal Plan',
      description: `${generated.length} ingredients combined across meals. Click Save List to persist.`
    });
  };

  const handleSaveList = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/grocery-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeListId ?? undefined,
          meal_plan_id: mealPlanId,
          title: title.trim() || 'Grocery List',
          items
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save grocery list.');

      const savedRow: GroceryListRow = json.list;
      setActiveListId(savedRow.id);
      setLists((prev) => {
        const exists = prev.some((l) => l.id === savedRow.id);
        return exists
          ? prev.map((l) => (l.id === savedRow.id ? savedRow : l))
          : [savedRow, ...prev];
      });
      pushToast({
        kind: 'success',
        title: 'Grocery List Saved',
        description: 'Persisted to Supabase for shopping across devices.'
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save list.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCustomIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemName.trim()) return;
    const newItem: GroceryItem = {
      id: `custom-${Date.now()}`,
      foodId: null,
      name: customItemName.trim(),
      category: customItemCategory,
      totalQuantityG: Math.max(5, Number(customItemGrams) || 100),
      displayApproxNote: 'User-entered quantity (unverified custom item)',
      isQuantityVerified: false,
      purchased: false,
      estimatedPriceNote: null
    };
    setItems((prev) => [...prev, newItem]);
    setCustomItemName('');
  };

  const handleDeleteList = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/grocery-lists?id=${encodeURIComponent(deleteId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      const next = lists.filter((l) => l.id !== deleteId);
      setLists(next);
      if (activeListId === deleteId) {
        setActiveListId(next[0]?.id ?? null);
        setTitle(next[0]?.title ?? 'Grocery List');
        setItems(next[0]?.items ?? []);
      }
      setDeleteId(null);
      pushToast({ kind: 'info', title: 'Grocery list deleted' });
    } catch {
      pushToast({ kind: 'error', title: 'Could not delete list' });
    }
  };

  const purchasedCount = items.filter((i) => i.purchased).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Grocery List Generator
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Deduplicates ingredients across meals, aggregates gram weights, groups by aisle,
            and distinguishes verified edible weights from approximate household estimates.
          </p>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveList}
            className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Grocery List'}
          </button>
        )}
      </div>

      {/* Generate from Saved Meal Plan */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
              Import from Saved Meal Plan
            </h2>
            <p className="text-xs text-zinc-500">
              Select a saved daily or weekly plan to combine duplicate ingredients automatically.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedMealPlans.length === 0 ? (
              <span className="text-xs text-zinc-500">
                Save a meal plan on the Nutrition page to import here.
              </span>
            ) : (
              savedMealPlans.map((mp) => (
                <button
                  key={mp.id}
                  type="button"
                  onClick={() => handleBuildFromPlan(mp)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold hover:border-crimson-500"
                >
                  Build from &ldquo;{mp.title}&rdquo;
                </button>
              ))
            )}
          </div>
        </div>

        {lists.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Saved Lists:</span>
            {lists.map((lst) => (
              <div
                key={lst.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs ${
                  activeListId === lst.id
                    ? 'border-crimson-600 bg-crimson-600/15 text-crimson-500 font-bold'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveListId(lst.id);
                    setTitle(lst.title);
                    setMealPlanId(lst.meal_plan_id);
                    setItems(lst.items);
                  }}
                >
                  {lst.title}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${lst.title}`}
                  onClick={() => setDeleteId(lst.id)}
                  className="text-zinc-400 hover:text-crimson-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Manual Ingredient */}
      <form
        onSubmit={handleAddCustomIngredient}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          placeholder="Add extra item (e.g. Turmeric, Curry Leaves, Garlic)"
          value={customItemName}
          onChange={(e) => setCustomItemName(e.target.value)}
          className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
        />
        <input
          type="text"
          value={customItemCategory}
          onChange={(e) => setCustomItemCategory(e.target.value)}
          className="sm:w-44 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
        />
        <input
          type="number"
          min={5}
          value={customItemGrams}
          onChange={(e) => setCustomItemGrams(Number(e.target.value))}
          className="sm:w-28 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-crimson-600 px-4 py-2 text-xs font-bold text-crimson-500 hover:bg-crimson-600 hover:text-white"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Your grocery list is empty"
          description="Generate a grocery list from any saved meal plan above, or add items manually."
          actionLabel="Go to Diet Planner"
          actionHref="/nutrition"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-3.5 py-2 text-sm font-bold"
            />
            <span className="text-xs text-zinc-500 tabular-nums">
              Purchased: {purchasedCount} / {items.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div
                key={category}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 space-y-3"
              >
                <h3 className="text-sm font-bold uppercase tracking-wider text-crimson-500 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  {category} ({catItems.length})
                </h3>
                <ul className="space-y-2.5 text-xs">
                  {catItems.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 p-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === it.id ? { ...x, purchased: !x.purchased } : x
                            )
                          )
                        }
                        className="flex items-start gap-2.5 text-left flex-1"
                      >
                        {it.purchased ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-zinc-400 mt-0.5" />
                        )}
                        <div>
                          <span
                            className={`font-semibold block ${
                              it.purchased
                                ? 'line-through text-zinc-400'
                                : 'text-zinc-900 dark:text-white'
                            }`}
                          >
                            {it.name}
                          </span>
                          <span className="text-[11px] text-zinc-500 block mt-0.5">
                            {it.displayApproxNote}
                          </span>
                          {it.estimatedPriceNote && (
                            <span className="text-[10px] text-zinc-400 block">
                              {it.estimatedPriceNote}
                            </span>
                          )}
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={5}
                          step={10}
                          aria-label={`Quantity in grams for ${it.name}`}
                          value={it.totalQuantityG}
                          onChange={(e) => {
                            const nextG = Math.max(5, Number(e.target.value) || 5);
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === it.id ? { ...x, totalQuantityG: nextG } : x
                              )
                            );
                          }}
                          className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-2 py-1 text-xs tabular-nums"
                        />
                        <span className="text-[10px] text-zinc-500">g</span>
                        <button
                          type="button"
                          aria-label={`Remove ${it.name}`}
                          onClick={() =>
                            setItems((prev) => prev.filter((x) => x.id !== it.id))
                          }
                          className="p-1 text-zinc-400 hover:text-crimson-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Saved Grocery List?"
        description="This saved shopping list will be removed permanently."
        confirmLabel="Delete List"
        onConfirm={handleDeleteList}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
