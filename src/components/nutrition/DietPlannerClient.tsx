'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  RefreshCw,
  Save,
  ShoppingCart,
  Sparkles,
  Trash2,
  Utensils
} from 'lucide-react';
import type {
  CalorieCalculationResult,
  DietaryPreference,
  MealPlanData,
  MealPlanRow,
  PlannedMeal,
  ProfileRow,
  UserPreferencesRow
} from '@/types/domain';
import {
  generatePersonalizedMealPlan,
  getCompatibleSubstituteFoods,
  replaceMealInPlan,
  swapIngredientInMeal,
  updateIngredientQuantityInMeal
} from '@/lib/nutrition/diet-planner';
import { generateGroceryListFromPlan } from '@/lib/nutrition/grocery-engine';
import { servingCaloriesOf } from '@/lib/nutrition/nutrition-engine';
import { VERIFIED_FOODS_BY_ID } from '@/lib/nutrition/verified-foods';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface DietPlannerClientProps {
  todayIso: string;
  profile: ProfileRow | null;
  preferences: UserPreferencesRow | null;
  targets: CalorieCalculationResult | null;
  initialSavedPlans: MealPlanRow[];
}

export function DietPlannerClient({
  todayIso,
  profile,
  preferences,
  targets,
  initialSavedPlans
}: DietPlannerClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [savedPlans, setSavedPlans] = useState<MealPlanRow[]>(initialSavedPlans);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(
    initialSavedPlans[0]?.id ?? null
  );

  const [planTitle, setPlanTitle] = useState<string>(
    initialSavedPlans[0]?.title ?? 'Personalized Indian & Global Nutrition Plan'
  );
  const [planType, setPlanType] = useState<'daily' | 'weekly'>(
    initialSavedPlans[0]?.plan_type ?? 'daily'
  );
  const [dietPref, setDietPref] = useState<DietaryPreference>(
    profile?.dietary_preference ?? 'vegetarian'
  );
  const [targetKcal, setTargetKcal] = useState<number>(
    targets?.targetCalories ?? initialSavedPlans[0]?.target_calories ?? 2000
  );
  const [mealsPerDay, setMealsPerDay] = useState<number>(
    preferences?.meals_per_day ?? 4
  );
  const [budgetOnly, setBudgetOnly] = useState<boolean>(false);

  const [activePlanData, setActivePlanData] = useState<MealPlanData | null>(
    initialSavedPlans[0]?.plan_data ?? null
  );
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const [creatingGrocery, setCreatingGrocery] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);

  const allergies = preferences?.allergies ?? [];
  const excludedFoods = preferences?.excluded_foods ?? [];

  const handleGenerate = () => {
    setError(null);
    try {
      const generated = generatePersonalizedMealPlan({
        planType,
        targetCalories: targetKcal,
        targetMacros: targets?.macros ?? {
          proteinG: Math.round((targetKcal * 0.25) / 4),
          carbsG: Math.round((targetKcal * 0.48) / 4),
          fatG: Math.round((targetKcal * 0.27) / 9),
          fiberG: 28
        },
        dietaryPreference: dietPref,
        allergies,
        excludedFoods,
        preferredFoods: preferences?.preferred_foods ?? [],
        mealsPerDay,
        budgetFriendlyOnly: budgetOnly
      });

      setActiveSavedId(null);
      setPlanTitle(
        `${planType === 'weekly' ? '7-Day' : 'Daily'} ${dietPref.toUpperCase()} Plan (${targetKcal} kcal)`
      );
      setActivePlanData(generated);
      setSelectedDayIdx(0);
      pushToast({
        kind: 'success',
        title: 'Meal Plan Generated',
        description: 'Allergies & dietary constraints verified against food catalog.'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate meal plan.');
    }
  };

  const handleSavePlan = async () => {
    if (!activePlanData) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeSavedId ?? undefined,
          title: planTitle.trim() || 'Nutrition Plan',
          plan_date: planType === 'daily' ? todayIso : null,
          plan_type: planType,
          target_calories: targetKcal,
          plan_data: activePlanData
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save meal plan.');

      const savedRow: MealPlanRow = json.plan;
      setActiveSavedId(savedRow.id);
      setSavedPlans((prev) => {
        const exists = prev.some((p) => p.id === savedRow.id);
        return exists
          ? prev.map((p) => (p.id === savedRow.id ? savedRow : p))
          : [savedRow, ...prev];
      });

      pushToast({
        kind: 'success',
        title: 'Plan Saved to Supabase',
        description: `"${savedRow.title}" persisted across sessions.`
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAndLogMeal = async (meal: PlannedMeal) => {
    if (!activePlanData) return;
    setLoggingMealId(meal.id);
    try {
      const entries = meal.ingredients.map((ing) => {
        const refFood = VERIFIED_FOODS_BY_ID.get(ing.foodId);
        return {
          food_id: refFood ? refFood.id : null,
          food_name_snapshot: ing.foodName,
          log_date: todayIso,
          meal_type: meal.mealType,
          quantity_g: ing.quantityG,
          calories_per_100g:
            refFood?.calories_per_100g ?? (ing.calories / ing.quantityG) * 100,
          protein_per_100g:
            refFood?.protein_per_100g ?? (ing.proteinG / ing.quantityG) * 100,
          carbs_per_100g:
            refFood?.carbs_per_100g ?? (ing.carbsG / ing.quantityG) * 100,
          fat_per_100g: refFood?.fat_per_100g ?? (ing.fatG / ing.quantityG) * 100,
          fiber_per_100g:
            refFood?.fiber_per_100g ??
            (ing.fiberG !== null ? (ing.fiberG / ing.quantityG) * 100 : null)
        };
      });

      const res = await fetch('/api/food-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not log meal.');

      setActivePlanData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((d, i) =>
            i === selectedDayIdx
              ? {
                  ...d,
                  meals: d.meals.map((m) =>
                    m.id === meal.id ? { ...m, eaten: true } : m
                  )
                }
              : d
          )
        };
      });

      pushToast({
        kind: 'success',
        title: 'Meal Marked Eaten & Logged',
        description: `${meal.ingredients.length} ingredients added to today's Food Tracker.`
      });
      router.refresh();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Meal logging failed',
        description: err instanceof Error ? err.message : 'Unable to log meal.'
      });
    } finally {
      setLoggingMealId(null);
    }
  };

  const handleGenerateGrocery = async () => {
    if (!activePlanData) return;
    setCreatingGrocery(true);
    try {
      const items = generateGroceryListFromPlan(activePlanData);
      const res = await fetch('/api/grocery-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_plan_id: activeSavedId,
          title: `Grocery List — ${planTitle}`,
          items
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save grocery list.');

      pushToast({
        kind: 'success',
        title: 'Grocery List Generated',
        description: `${items.length} deduplicated ingredients saved.`
      });
      router.push('/grocery-list');
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Grocery generation failed',
        description: err instanceof Error ? err.message : 'Could not build list.'
      });
    } finally {
      setCreatingGrocery(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    try {
      const res = await fetch(`/api/meal-plans?id=${encodeURIComponent(deletePlanId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      const remaining = savedPlans.filter((p) => p.id !== deletePlanId);
      setSavedPlans(remaining);
      if (activeSavedId === deletePlanId) {
        setActiveSavedId(remaining[0]?.id ?? null);
        setActivePlanData(remaining[0]?.plan_data ?? null);
      }
      setDeletePlanId(null);
      pushToast({ kind: 'info', title: 'Meal plan deleted' });
    } catch {
      pushToast({ kind: 'error', title: 'Unable to delete plan' });
    }
  };

  const weeklyTotals = useMemo(() => {
    if (!activePlanData) return null;
    return activePlanData.days.reduce(
      (acc, d) => ({
        calories: acc.calories + d.totals.calories,
        proteinG: Math.round((acc.proteinG + d.totals.proteinG) * 10) / 10,
        carbsG: Math.round((acc.carbsG + d.totals.carbsG) * 10) / 10,
        fatG: Math.round((acc.fatG + d.totals.fatG) * 10) / 10
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    );
  }, [activePlanData]);

  const currentDay = activePlanData?.days[selectedDayIdx] ?? activePlanData?.days[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Personalized Diet &amp; Meal Planner
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Deterministic Indian &amp; global meal compositions with hard allergen exclusions,
            ingredient swaps, adjustable quantities, and one-click logging.
          </p>
        </div>

        {allergies.length > 0 && (
          <div className="rounded-xl border border-crimson-500/40 bg-crimson-600/10 px-3.5 py-2 text-xs font-semibold text-crimson-500">
            Hard Allergen Exclusions Active: {allergies.join(', ')}
          </div>
        )}
      </div>

      {/* Generator Controls */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Plan Horizon
            </label>
            <select
              value={planType}
              onChange={(e) => setPlanType(e.target.value as 'daily' | 'weekly')}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm"
            >
              <option value="daily">Daily Plan (1 Day)</option>
              <option value="weekly">Weekly Plan (7 Days)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Dietary Pattern
            </label>
            <select
              value={dietPref}
              onChange={(e) => setDietPref(e.target.value as DietaryPreference)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="eggetarian">Eggetarian</option>
              <option value="omnivore">Non-Vegetarian / Omnivore</option>
              <option value="pescatarian">Pescatarian</option>
              <option value="vegan">Vegan</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Daily Target (kcal)
            </label>
            <input
              type="number"
              min={1200}
              max={6000}
              step={50}
              value={targetKcal}
              onChange={(e) => setTargetKcal(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm tabular-nums"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Meals / Day
            </label>
            <select
              value={mealsPerDay}
              onChange={(e) => setMealsPerDay(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm"
            >
              {[2, 3, 4, 5, 6].map((m) => (
                <option key={m} value={m}>
                  {m} meals
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs font-medium mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={budgetOnly}
                onChange={(e) => setBudgetOnly(e.target.checked)}
                className="rounded border-zinc-400 text-crimson-600"
              />
              <span>Budget-friendly staples</span>
            </label>
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson-600 px-4 py-2 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate Plan
            </button>
          </div>
        </div>

        {/* Saved Plans Bar */}
        {savedPlans.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 mr-1">Saved Plans:</span>
            {savedPlans.map((sp) => (
              <div
                key={sp.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs ${
                  activeSavedId === sp.id
                    ? 'border-crimson-600 bg-crimson-600/15 text-crimson-500 font-bold'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveSavedId(sp.id);
                    setPlanTitle(sp.title);
                    setPlanType(sp.plan_type);
                    setTargetKcal(sp.target_calories);
                    setActivePlanData(sp.plan_data);
                    setSelectedDayIdx(0);
                  }}
                >
                  {sp.title}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${sp.title}`}
                  onClick={() => setDeletePlanId(sp.id)}
                  className="text-zinc-400 hover:text-crimson-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ErrorBanner message={error} />

      {!activePlanData ? (
        <EmptyState
          icon={<Utensils className="h-6 w-6" />}
          title="No active meal plan loaded"
          description="Click Generate Plan above to build a deterministic daily or 7-day plan tailored to your calorie target, diet, and allergies."
          actionLabel="Generate Personalized Plan"
          onAction={handleGenerate}
        />
      ) : (
        <div className="space-y-5">
          {/* Plan Title + Save & Grocery Actions */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Plan Title
              </label>
              <input
                type="text"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                className="w-full max-w-md rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm font-bold"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePlan}
                className="inline-flex items-center gap-1.5 rounded-xl bg-crimson-600 px-4 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : activeSavedId ? 'Update Saved Plan' : 'Save Plan'}
              </button>

              <button
                type="button"
                disabled={creatingGrocery}
                onClick={handleGenerateGrocery}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-xs font-semibold hover:border-crimson-500"
              >
                <ShoppingCart className="h-4 w-4 text-crimson-500" />
                {creatingGrocery ? 'Building List...' : 'Generate Grocery List'}
              </button>
            </div>
          </div>

          {/* Day Selector Tabs + Daily/Weekly Totals */}
          {activePlanData.days.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {activePlanData.days.map((day, idx) => (
                <button
                  key={day.dayIndex}
                  type="button"
                  onClick={() => setSelectedDayIdx(idx)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                    selectedDayIdx === idx
                      ? 'bg-crimson-600 text-white'
                      : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900'
                  }`}
                >
                  {day.dayLabel}
                </button>
              ))}
            </div>
          )}

          {currentDay && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/70 dark:bg-obsidian-900/60 p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="tabular-nums">
                <strong className="text-zinc-900 dark:text-white">
                  {currentDay.dayLabel} Totals:
                </strong>{' '}
                <span className="text-crimson-500 font-bold">
                  {currentDay.totals.calories} kcal
                </span>{' '}
                &bull; Protein {currentDay.totals.proteinG}g &bull; Carbs{' '}
                {currentDay.totals.carbsG}g &bull; Fat {currentDay.totals.fatG}g &bull; Fiber{' '}
                {currentDay.totals.fiberG}g
              </div>
              {weeklyTotals && activePlanData.days.length > 1 && (
                <div className="text-zinc-500 tabular-nums">
                  7-Day Cumulative: {weeklyTotals.calories} kcal &bull; Protein{' '}
                  {weeklyTotals.proteinG}g
                </div>
              )}
            </div>
          )}

          {/* Meals List */}
          {currentDay && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {currentDay.meals.map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-crimson-500">
                        {meal.mealType} &bull; {meal.cuisine} &bull; {meal.prepTimeMinutes}m prep
                      </span>
                      <h3 className="mt-0.5 text-base font-bold text-zinc-950 dark:text-white">
                        {meal.name}
                      </h3>
                      <p className="text-xs text-zinc-500 tabular-nums mt-0.5">
                        {meal.totals.calories} kcal &bull; P {meal.totals.proteinG}g &bull; C{' '}
                        {meal.totals.carbsG}g &bull; F {meal.totals.fatG}g &bull; Fib{' '}
                        {meal.totals.fiberG}g
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setActivePlanData((prev) =>
                            prev ? replaceMealInPlan(prev, selectedDayIdx, meal.id) : prev
                          )
                        }
                        title="Replace / Regenerate Meal"
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold hover:border-crimson-500"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Replace
                      </button>

                      <button
                        type="button"
                        disabled={loggingMealId === meal.id || meal.eaten}
                        onClick={() => void handleMarkAndLogMeal(meal)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                          meal.eaten
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-crimson-600 text-white hover:bg-crimson-700'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {meal.eaten
                          ? 'Logged'
                          : loggingMealId === meal.id
                          ? 'Logging...'
                          : 'Eat & Log'}
                      </button>
                    </div>
                  </div>

                  {/* Ingredients with Quantity Edit & Swap */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Ingredients (Adjust Grams or Swap)
                    </p>
                    {meal.ingredients.map((ing, iIdx) => {
                      const refFood = VERIFIED_FOODS_BY_ID.get(ing.foodId);
                      const substitutes = getCompatibleSubstituteFoods(
                        ing.foodId,
                        activePlanData.dietaryPreference,
                        activePlanData.excludedAllergens,
                        activePlanData.excludedFoods
                      );
                      return (
                        <div
                          key={`${meal.id}-ing-${iIdx}`}
                          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate text-zinc-900 dark:text-white">
                              {ing.foodName}
                            </p>
                            <p className="text-[11px] text-zinc-500 tabular-nums">
                              {ing.calories} kcal &bull; P {ing.proteinG}g ({ing.source})
                            </p>
                            {refFood && (
                              <p className="text-[11px] tabular-nums text-crimson-500/90">
                                Std {refFood.serving_size_g}g ={' '}
                                {servingCaloriesOf(refFood)} kcal &bull;{' '}
                                {refFood.calories_per_100g} kcal/100g
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              aria-label={`Quantity in grams for ${ing.foodName}`}
                              min={5}
                              max={2000}
                              step={5}
                              value={ing.quantityG}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val >= 5 && val <= 2000) {
                                  setActivePlanData((prev) =>
                                    prev
                                      ? updateIngredientQuantityInMeal(
                                          prev,
                                          selectedDayIdx,
                                          meal.id,
                                          iIdx,
                                          val
                                        )
                                      : prev
                                  );
                                }
                              }}
                              className="w-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-2 py-1 text-xs tabular-nums"
                            />
                            <span className="text-[11px] text-zinc-500">g</span>

                            {substitutes.length > 0 && (
                              <select
                                aria-label={`Swap ${ing.foodName}`}
                                value=""
                                onChange={(e) => {
                                  const nextFoodId = e.target.value;
                                  if (!nextFoodId) return;
                                  setActivePlanData((prev) =>
                                    prev
                                      ? swapIngredientInMeal(
                                          prev,
                                          selectedDayIdx,
                                          meal.id,
                                          iIdx,
                                          nextFoodId
                                        )
                                      : prev
                                  );
                                }}
                                className="max-w-[115px] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-2 py-1 text-[11px]"
                              >
                                <option value="">Swap...</option>
                                {substitutes.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    {sub.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Prep Steps */}
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 pt-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Preparation Steps
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      {meal.instructions.map((stepTxt, sIdx) => (
                        <li key={sIdx}>{stepTxt}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-500">{activePlanData.pricingNote}</p>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletePlanId)}
        title="Delete Saved Meal Plan?"
        description="This meal plan will be permanently removed from your Supabase account."
        confirmLabel="Delete Plan"
        onConfirm={handleDeletePlan}
        onCancel={() => setDeletePlanId(null)}
      />
    </div>
  );
}
