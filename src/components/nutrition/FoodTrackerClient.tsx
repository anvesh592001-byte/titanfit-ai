'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import type {
  CalorieCalculationResult,
  FoodItem,
  FoodLogRow,
  MealType,
  UserCustomFoodRow
} from '@/types/domain';
import {
  aggregateFoodLogs,
  calculateFoodNutrition,
  servingCaloriesOf
} from '@/lib/nutrition/nutrition-engine';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface FoodTrackerClientProps {
  initialDate: string;
  initialLogs: FoodLogRow[];
  foods: FoodItem[];
  initialCustomFoods: UserCustomFoodRow[];
  targets: CalorieCalculationResult | null;
}

const MEAL_SLOTS: Array<{ key: MealType; label: string }> = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' }
];

export function FoodTrackerClient({
  initialDate,
  initialLogs,
  foods,
  initialCustomFoods,
  targets
}: FoodTrackerClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [logs, setLogs] = useState<FoodLogRow[]>(initialLogs);
  const [customFoods, setCustomFoods] = useState<UserCustomFoodRow[]>(initialCustomFoods);
  const [loadingDate, setLoadingDate] = useState(false);

  // Search & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [selectedFoodKey, setSelectedFoodKey] = useState<string>(foods[0]?.id ?? '');
  const [quantityG, setQuantityG] = useState<number>(foods[0]?.serving_size_g ?? 100);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline quantity edit
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(100);

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Custom food modal state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customBrand, setCustomBrand] = useState('');
  const [customServingG, setCustomServingG] = useState(100);
  const [customCal, setCustomCal] = useState(200);
  const [customPro, setCustomPro] = useState(10);
  const [customCarb, setCustomCarb] = useState(25);
  const [customFat, setCustomFat] = useState(6);
  const [customFib, setCustomFib] = useState<string>('');
  const [savingCustom, setSavingCustom] = useState(false);

  // Unified searchable food list (verified + user custom)
  const combinedCatalog = useMemo(() => {
    const customMapped: FoodItem[] = customFoods.map((cf) => ({
      id: `custom:${cf.id}`,
      name: cf.name,
      brand: cf.brand,
      source: 'USER_CUSTOM',
      source_food_id: cf.id,
      category: 'Saved Custom Foods',
      diet_tags: [],
      allergen_tags: [],
      serving_size_g: cf.serving_size_g,
      serving_label: `${cf.serving_size_g}g serving`,
      calories_per_100g: cf.calories_per_100g,
      protein_per_100g: cf.protein_per_100g,
      carbs_per_100g: cf.carbs_per_100g,
      fat_per_100g: cf.fat_per_100g,
      fiber_per_100g: cf.fiber_per_100g,
      is_verified: false
    }));
    return [...customMapped, ...foods];
  }, [foods, customFoods]);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(combinedCatalog.map((f) => f.category)))],
    [combinedCatalog]
  );

  const filteredFoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return combinedCatalog.filter((f) => {
      if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (f.brand && f.brand.toLowerCase().includes(q)) ||
        f.category.toLowerCase().includes(q)
      );
    });
  }, [combinedCatalog, selectedCategory, searchQuery]);

  const activeFood =
    combinedCatalog.find((f) => f.id === selectedFoodKey) ??
    filteredFoods[0] ??
    combinedCatalog[0];

  const livePortionPreview = useMemo(() => {
    if (!activeFood || !Number.isFinite(quantityG) || quantityG <= 0) return null;
    try {
      return calculateFoodNutrition(activeFood, quantityG);
    } catch {
      return null;
    }
  }, [activeFood, quantityG]);

  const aggregation = useMemo(
    () =>
      aggregateFoodLogs(
        logs,
        targets
          ? {
              calories: targets.targetCalories,
              proteinG: targets.macros.proteinG,
              carbsG: targets.macros.carbsG,
              fatG: targets.macros.fatG,
              fiberG: targets.macros.fiberG
            }
          : null
      ),
    [logs, targets]
  );

  const loadDateLogs = async (nextDate: string) => {
    setSelectedDate(nextDate);
    setLoadingDate(true);
    setError(null);
    try {
      const res = await fetch(`/api/food-logs?date=${encodeURIComponent(nextDate)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load food logs.');
      setLogs(json.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs.');
    } finally {
      setLoadingDate(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(`${selectedDate}T00:00:00`);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    void loadDateLogs(`${yyyy}-${mm}-${dd}`);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFood) return;
    setError(null);
    setSubmittingLog(true);

    try {
      const isCustom = activeFood.id.startsWith('custom:');
      const res = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          food_id: isCustom ? null : activeFood.id,
          food_name_snapshot: activeFood.brand
            ? `${activeFood.name} (${activeFood.brand})`
            : activeFood.name,
          log_date: selectedDate,
          meal_type: activeMealType,
          quantity_g: Number(quantityG),
          calories_per_100g: activeFood.calories_per_100g,
          protein_per_100g: activeFood.protein_per_100g,
          carbs_per_100g: activeFood.carbs_per_100g,
          fat_per_100g: activeFood.fat_per_100g,
          fiber_per_100g: activeFood.fiber_per_100g
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to log food.');

      const inserted: FoodLogRow[] = json.logs ?? [];
      setLogs((prev) => [...prev, ...inserted]);
      pushToast({
        kind: 'success',
        title: 'Food logged',
        description: `${activeFood.name} (${quantityG}g) saved to ${activeMealType}.`
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save food log.');
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleSaveEditQty = async (id: string) => {
    try {
      const res = await fetch('/api/food-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, quantity_g: Number(editQty) })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update quantity.');

      setLogs((prev) => prev.map((item) => (item.id === id ? json.log : item)));
      setEditingLogId(null);
      pushToast({ kind: 'success', title: 'Portion updated' });
      router.refresh();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update entry.'
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/food-logs?id=${encodeURIComponent(deleteTargetId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      setLogs((prev) => prev.filter((l) => l.id !== deleteTargetId));
      setDeleteTargetId(null);
      pushToast({ kind: 'info', title: 'Entry removed' });
      router.refresh();
    } catch {
      pushToast({ kind: 'error', title: 'Could not delete food log' });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateCustomFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustom(true);
    setError(null);
    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          brand: customBrand.trim() || null,
          category: 'Saved Custom Foods',
          serving_size_g: Number(customServingG),
          calories_per_100g: Number(customCal),
          protein_per_100g: Number(customPro),
          carbs_per_100g: Number(customCarb),
          fat_per_100g: Number(customFat),
          fiber_per_100g: customFib.trim() === '' ? null : Number(customFib)
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save custom food.');

      const created: UserCustomFoodRow = json.customFood;
      setCustomFoods((prev) => [created, ...prev]);
      setSelectedFoodKey(`custom:${created.id}`);
      setQuantityG(created.serving_size_g);
      setShowCustomForm(false);
      setCustomName('');
      setCustomBrand('');
      pushToast({
        kind: 'success',
        title: 'Custom food saved',
        description: `${created.name} is now available in your personal food library.`
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save custom food.');
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Food &amp; Calorie Tracker
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Search verified USDA &amp; ICMR-NIN foods or add custom items. Every entry persists to Supabase.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-1.5 self-start">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
            className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="h-4 w-4 text-crimson-500" />
            <input
              type="date"
              aria-label="Selected log date"
              value={selectedDate}
              onChange={(e) => void loadDateLogs(e.target.value)}
              className="bg-transparent text-xs font-bold tabular-nums focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => shiftDate(1)}
            aria-label="Next day"
            className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Daily Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-2xl border border-crimson-600/40 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-crimson-500">
            Estimated Intake
          </span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {aggregation.totals.calories}{' '}
            <span className="text-xs font-normal text-zinc-400">kcal</span>
          </p>
          {aggregation.remaining && (
            <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
              {aggregation.remaining.calories >= 0
                ? `${aggregation.remaining.calories} kcal remaining`
                : `${Math.abs(aggregation.remaining.calories)} kcal over target`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Protein
          </span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {aggregation.totals.proteinG}g
          </p>
          {aggregation.remaining && (
            <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
              Rem: {aggregation.remaining.proteinG}g
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Carbohydrates
          </span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {aggregation.totals.carbsG}g
          </p>
          {aggregation.remaining && (
            <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
              Rem: {aggregation.remaining.carbsG}g
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Fats
          </span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {aggregation.totals.fatG}g
          </p>
          {aggregation.remaining && (
            <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
              Rem: {aggregation.remaining.fatG}g
            </p>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Dietary Fiber
          </span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">
            {aggregation.totals.fiberG}g
          </p>
          {aggregation.totals.missingFiberCount > 0 && (
            <p className="mt-0.5 text-[10px] text-amber-500">
              {aggregation.totals.missingFiberCount} custom item(s) omit fiber
            </p>
          )}
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Search & Add Food Panel */}
        <section className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4 self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Search &amp; Log Food
            </h2>
            <button
              type="button"
              onClick={() => setShowCustomForm((v) => !v)}
              className="text-xs font-semibold text-crimson-500 hover:underline"
            >
              {showCustomForm ? 'Cancel Custom Food' : '+ Create Custom Food'}
            </button>
          </div>

          {showCustomForm ? (
            <form onSubmit={handleCreateCustomFood} className="space-y-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Custom foods use your package label values (per 100g) and are marked as user-entered rather than lab-verified.
              </p>
              <input
                type="text"
                required
                placeholder="Food name (e.g. Homemade Protein Ladoo)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Brand (optional)"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
                />
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="Std serving (g)"
                  value={customServingG}
                  onChange={(e) => setCustomServingG(Number(e.target.value))}
                  className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500">Kcal / 100g</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={customCal}
                    onChange={(e) => setCustomCal(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500">Protein / 100g</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    required
                    value={customPro}
                    onChange={(e) => setCustomPro(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500">Carbs / 100g</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    required
                    value={customCarb}
                    onChange={(e) => setCustomCarb(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 text-xs tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500">Fat / 100g</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    required
                    value={customFat}
                    onChange={(e) => setCustomFat(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500">Fiber / 100g (opt)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Unknown"
                    value={customFib}
                    onChange={(e) => setCustomFib(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 text-xs tabular-nums"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingCustom}
                className="w-full rounded-xl bg-crimson-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-crimson-700"
              >
                {savingCustom ? 'Saving Custom Food...' : 'Save Custom Food'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddLog} className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="search"
                  placeholder="Search rice, roti, idli, paneer, chicken, oats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 pl-9 pr-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Category Filter
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-2 bg-zinc-50/70 dark:bg-obsidian-950/60">
                {filteredFoods.length === 0 ? (
                  <p className="p-3 text-center text-xs text-zinc-500">
                    No matching food found. Create a custom food item above!
                  </p>
                ) : (
                  filteredFoods.map((f) => {
                    const selected = activeFood?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFoodKey(f.id);
                          setQuantityG(f.serving_size_g);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                          selected
                            ? 'bg-crimson-600 text-white'
                            : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold block truncate">{f.name}</span>
                          <span
                            className={`text-[10px] ${
                              selected ? 'text-crimson-100' : 'text-zinc-500'
                            }`}
                          >
                            {f.is_verified ? `Verified (${f.source})` : 'Custom Food'} &bull; Std{' '}
                            {f.serving_size_g}g
                          </span>
                        </div>
                        <span className="shrink-0 text-right leading-tight">
                          <span
                            className={`block font-mono text-[11px] font-bold ${
                              selected ? 'text-white' : 'text-crimson-500'
                            }`}
                          >
                            {servingCaloriesOf(f)} kcal / {f.serving_size_g}g
                          </span>
                          <span
                            className={`block font-mono text-[10px] ${
                              selected ? 'text-crimson-100' : 'text-zinc-500'
                            }`}
                          >
                            {f.calories_per_100g} kcal/100g
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {activeFood && (
                <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold truncate">{activeFood.name}</span>
                    {activeFood.is_verified ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-500">User Custom</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-crimson-600/12 to-violet-600/12 px-3 py-2 text-[11px] font-semibold">
                    <span className="text-zinc-600 dark:text-zinc-300">
                      Std serving {activeFood.serving_size_g}g
                    </span>
                    <span className="tabular-nums text-crimson-500">
                      {servingCaloriesOf(activeFood)} kcal
                    </span>
                    <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                      {activeFood.calories_per_100g} kcal/100g
                    </span>
                  </div>

                  {/* Serving quick multipliers */}
                  <div className="flex items-center gap-1.5">
                    {[0.5, 1, 1.5, 2].map((mult) => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() =>
                          setQuantityG(Math.round(activeFood.serving_size_g * mult))
                        }
                        className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-[11px] font-semibold hover:border-crimson-500"
                      >
                        {mult}&times; ({Math.round(activeFood.serving_size_g * mult)}g)
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                        Quantity (grams)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        step={5}
                        value={quantityG}
                        onChange={(e) => setQuantityG(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-3 py-1.5 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                        Meal Category
                      </label>
                      <select
                        value={activeMealType}
                        onChange={(e) => setActiveMealType(e.target.value as MealType)}
                        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-3 py-1.5 text-sm"
                      >
                        {MEAL_SLOTS.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {livePortionPreview && (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-1">
                      <div>
                        <span className="block text-[10px] text-zinc-500">Kcal</span>
                        <span className="font-bold text-crimson-500 tabular-nums">
                          {livePortionPreview.calories}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">Protein</span>
                        <span className="font-bold tabular-nums">
                          {livePortionPreview.proteinG}g
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">Carbs</span>
                        <span className="font-bold tabular-nums">
                          {livePortionPreview.carbsG}g
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-500">Fat</span>
                        <span className="font-bold tabular-nums">
                          {livePortionPreview.fatG}g
                        </span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingLog}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-crimson-600 px-4 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {submittingLog ? 'Saving Entry...' : `Add to ${activeMealType}`}
                  </button>
                </div>
              )}
            </form>
          )}

          <p className="flex items-start gap-2 text-[11px] text-zinc-500 pt-1">
            <Info className="h-3.5 w-3.5 shrink-0 text-zinc-400 mt-0.5" />
            <span>
              Packaged-food labels, home recipe oil use, moisture retention during cooking,
              and visual portion estimates can shift actual intake from reference values.
            </span>
          </p>
        </section>

        {/* Meal-Categorized Food Log */}
        <section className="lg:col-span-7 space-y-4">
          {loadingDate ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-8 text-center text-sm text-zinc-500">
              Loading food logs for {selectedDate}...
            </div>
          ) : (
            MEAL_SLOTS.map(({ key, label }) => {
              const slotLogs = logs.filter((l) => l.meal_type === key);
              const slotSummary = aggregation.byMeal[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5"
                >
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                        {label}
                      </h3>
                      <p className="text-xs text-zinc-500 tabular-nums">
                        {slotSummary.calories} kcal &bull; P {slotSummary.proteinG}g &bull; C{' '}
                        {slotSummary.carbsG}g &bull; F {slotSummary.fatG}g
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMealType(key)}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1 text-xs font-semibold hover:border-crimson-500"
                    >
                      Select {label}
                    </button>
                  </div>

                  {slotLogs.length === 0 ? (
                    <p className="py-4 text-xs text-zinc-500">
                      No foods logged for {label.toLowerCase()} on {selectedDate}.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs mt-2">
                      {slotLogs.map((entry) => {
                        const isEditing = editingLogId === entry.id;
                        return (
                          <li
                            key={entry.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-semibold text-zinc-900 dark:text-white">
                                {entry.food_name_snapshot}
                              </p>
                              <p className="text-zinc-500 tabular-nums">
                                {entry.quantity_g}g &bull; P {entry.protein_g}g &bull; C{' '}
                                {entry.carbs_g}g &bull; F {entry.fat_g}g
                                {entry.fiber_g !== null ? ` • Fib ${entry.fiber_g}g` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {isEditing ? (
                                <>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5000}
                                    value={editQty}
                                    onChange={(e) => setEditQty(Number(e.target.value))}
                                    className="w-20 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2 py-1 text-xs tabular-nums"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void handleSaveEditQty(entry.id)}
                                    className="rounded-lg bg-crimson-600 px-2.5 py-1 text-xs font-bold text-white"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingLogId(null)}
                                    className="text-xs text-zinc-400"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold text-crimson-500 tabular-nums mr-2">
                                    {Math.round(entry.calories)} kcal
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Edit quantity for ${entry.food_name_snapshot}`}
                                    onClick={() => {
                                      setEditingLogId(entry.id);
                                      setEditQty(entry.quantity_g);
                                    }}
                                    className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Delete ${entry.food_name_snapshot}`}
                                    onClick={() => setDeleteTargetId(entry.id)}
                                    className="rounded-lg p-1.5 text-zinc-400 hover:text-crimson-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        title="Delete Food Log Entry?"
        description="This entry will be permanently removed from your daily nutrition log in Supabase."
        confirmLabel="Delete Entry"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
