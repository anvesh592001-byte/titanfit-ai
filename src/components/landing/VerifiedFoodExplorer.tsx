'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { VERIFIED_FOODS } from '@/lib/nutrition/verified-foods';
import { calculateFoodNutrition, servingCaloriesOf } from '@/lib/nutrition/nutrition-engine';

export function VerifiedFoodExplorer() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(VERIFIED_FOODS[3]!.id); // Idli default
  const [grams, setGrams] = useState(160);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return VERIFIED_FOODS.slice(0, 12);
    return VERIFIED_FOODS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query]);

  const selectedFood =
    VERIFIED_FOODS.find((f) => f.id === selectedId) ?? VERIFIED_FOODS[0]!;

  const calc = useMemo(
    () => calculateFoodNutrition(selectedFood, Math.min(2000, Math.max(5, grams || 100))),
    [selectedFood, grams]
  );

  return (
    <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 shadow-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-crimson-500">
            Traceable Food Composition Engine
          </span>
          <h3 className="mt-1 text-xl font-bold text-zinc-950 dark:text-white">
            Inspect Verified Indian &amp; Global Foods Live
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Every food record cites USDA FoodData Central or ICMR-NIN IFCT 2017—never AI-guessed macros.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="search"
            aria-label="Search verified foods"
            placeholder="Try idli, paneer, soya, chicken..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 pl-9 pr-3 py-2 text-sm text-zinc-900 dark:text-white"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 flex flex-wrap gap-2 content-start">
          {filtered.map((food) => {
            const active = food.id === selectedFood.id;
            return (
              <button
                key={food.id}
                type="button"
                onClick={() => {
                  setSelectedId(food.id);
                  setGrams(food.serving_size_g);
                }}
                className={`rounded-xl border px-3.5 py-2 text-left text-xs font-medium transition-all ${
                  active
                    ? 'border-crimson-600 bg-crimson-600 text-white shadow-crimson'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 text-zinc-700 dark:text-zinc-300 hover:border-crimson-500/60'
                }`}
              >
                <span className="block font-semibold">{food.name}</span>
                <span
                  className={`text-[10px] ${
                    active ? 'text-crimson-100' : 'text-zinc-500'
                  }`}
                >
                  {food.source} &bull; {servingCaloriesOf(food)} kcal/{food.serving_size_g}g
                  &bull; {food.calories_per_100g} kcal/100g
                </span>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-zinc-950 dark:text-white">
                {selectedFood.name}
              </h4>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Verified ({selectedFood.source}: {selectedFood.source_food_id})
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="explorer-grams"
              className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
            >
              Portion Quantity (grams) — Std: {selectedFood.serving_label ?? `${selectedFood.serving_size_g}g`}
            </label>
            <p className="mb-1.5 text-[11px] font-semibold tabular-nums text-crimson-500">
              Standard serving = {servingCaloriesOf(selectedFood)} kcal &bull;{' '}
              {selectedFood.calories_per_100g} kcal/100g
            </p>
            <input
              id="explorer-grams"
              type="number"
              min={5}
              max={2000}
              step={5}
              value={grams}
              onChange={(e) => setGrams(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-3 py-2 text-sm tabular-nums text-zinc-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-5 gap-2 text-center pt-1">
            <div className="rounded-lg bg-white dark:bg-obsidian-900 p-2 border border-zinc-200 dark:border-zinc-800">
              <span className="block text-[10px] uppercase text-zinc-500">Kcal</span>
              <span className="text-sm font-bold tabular-nums text-crimson-500">
                {calc.calories}
              </span>
            </div>
            <div className="rounded-lg bg-white dark:bg-obsidian-900 p-2 border border-zinc-200 dark:border-zinc-800">
              <span className="block text-[10px] uppercase text-zinc-500">Pro</span>
              <span className="text-sm font-bold tabular-nums">{calc.proteinG}g</span>
            </div>
            <div className="rounded-lg bg-white dark:bg-obsidian-900 p-2 border border-zinc-200 dark:border-zinc-800">
              <span className="block text-[10px] uppercase text-zinc-500">Carb</span>
              <span className="text-sm font-bold tabular-nums">{calc.carbsG}g</span>
            </div>
            <div className="rounded-lg bg-white dark:bg-obsidian-900 p-2 border border-zinc-200 dark:border-zinc-800">
              <span className="block text-[10px] uppercase text-zinc-500">Fat</span>
              <span className="text-sm font-bold tabular-nums">{calc.fatG}g</span>
            </div>
            <div className="rounded-lg bg-white dark:bg-obsidian-900 p-2 border border-zinc-200 dark:border-zinc-800">
              <span className="block text-[10px] uppercase text-zinc-500">Fiber</span>
              <span className="text-sm font-bold tabular-nums">
                {calc.fiberG ?? '—'}g
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
