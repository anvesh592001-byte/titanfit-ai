import type { FoodItem, FoodLogRow, MealType } from '@/types/domain';
import { roundTo } from '@/lib/calculations/units';

export interface CalculatedFoodPortion {
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  isVerified: boolean;
}

export function calculateFoodNutrition(
  food: Pick<
    FoodItem,
    | 'calories_per_100g'
    | 'protein_per_100g'
    | 'carbs_per_100g'
    | 'fat_per_100g'
    | 'fiber_per_100g'
    | 'is_verified'
  >,
  quantityG: number
): CalculatedFoodPortion {
  if (typeof quantityG !== 'number' || !Number.isFinite(quantityG) || quantityG <= 0 || quantityG > 5000) {
    throw new Error('Food quantity must be between 0.1g and 5,000g.');
  }

  const fields = [
    food.calories_per_100g,
    food.protein_per_100g,
    food.carbs_per_100g,
    food.fat_per_100g
  ];
  if (fields.some((v) => typeof v !== 'number' || !Number.isFinite(v) || v < 0)) {
    throw new Error('Food nutrient per-100g values must be non-negative finite numbers.');
  }

  const ratio = quantityG / 100;
  const fiberG =
    food.fiber_per_100g === null || food.fiber_per_100g === undefined
      ? null
      : roundTo(food.fiber_per_100g * ratio, 1);

  return {
    quantityG: roundTo(quantityG, 1),
    calories: roundTo(food.calories_per_100g * ratio, 1),
    proteinG: roundTo(food.protein_per_100g * ratio, 1),
    carbsG: roundTo(food.carbs_per_100g * ratio, 1),
    fatG: roundTo(food.fat_per_100g * ratio, 1),
    fiberG,
    isVerified: Boolean(food.is_verified)
  };
}

/**
 * Calories contained in ONE standard serving of a food item
 * (calories_per_100g scaled to the item's declared serving_size_g).
 * Rounded to whole kcal — the display precision used across the UI.
 */
export function servingCaloriesOf(
  food: Pick<FoodItem, 'calories_per_100g' | 'serving_size_g'>
): number {
  const serving = Number(food.serving_size_g);
  const per100 = Number(food.calories_per_100g);
  if (!Number.isFinite(serving) || serving <= 0 || !Number.isFinite(per100)) {
    return 0;
  }
  return Math.round((per100 * serving) / 100);
}

/**
 * Compact human label for a food's standard serving calories, e.g.
 * `195 kcal / 150g`. Safe for custom foods with partial data.
 */
export function servingCaloriesLabel(
  food: Pick<FoodItem, 'calories_per_100g' | 'serving_size_g'>
): string {
  return `${servingCaloriesOf(food)} kcal / ${food.serving_size_g}g`;
}

export interface MacroSummary {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  missingFiberCount: number;
}

export interface DailyNutritionAggregation {
  totals: MacroSummary;
  byMeal: Record<MealType, MacroSummary>;
  remaining: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  } | null;
}

function emptySummary(): MacroSummary {
  return {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    missingFiberCount: 0
  };
}

export function aggregateFoodLogs(
  logs: Array<
    Pick<
      FoodLogRow,
      'meal_type' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g'
    >
  >,
  targets?: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  } | null
): DailyNutritionAggregation {
  const totals = emptySummary();
  const byMeal: Record<MealType, MacroSummary> = {
    breakfast: emptySummary(),
    lunch: emptySummary(),
    dinner: emptySummary(),
    snacks: emptySummary()
  };

  for (const entry of logs) {
    const bucket = byMeal[entry.meal_type] ?? byMeal.snacks;
    const cal = Number(entry.calories) || 0;
    const pro = Number(entry.protein_g) || 0;
    const carb = Number(entry.carbs_g) || 0;
    const fat = Number(entry.fat_g) || 0;

    totals.calories += cal;
    totals.proteinG += pro;
    totals.carbsG += carb;
    totals.fatG += fat;

    bucket.calories += cal;
    bucket.proteinG += pro;
    bucket.carbsG += carb;
    bucket.fatG += fat;

    if (entry.fiber_g === null || entry.fiber_g === undefined) {
      totals.missingFiberCount += 1;
      bucket.missingFiberCount += 1;
    } else {
      const fib = Number(entry.fiber_g) || 0;
      totals.fiberG += fib;
      bucket.fiberG += fib;
    }
  }

  const finalize = (s: MacroSummary): MacroSummary => ({
    calories: Math.round(s.calories),
    proteinG: roundTo(s.proteinG, 1),
    carbsG: roundTo(s.carbsG, 1),
    fatG: roundTo(s.fatG, 1),
    fiberG: roundTo(s.fiberG, 1),
    missingFiberCount: s.missingFiberCount
  });

  const roundedTotals = finalize(totals);

  return {
    totals: roundedTotals,
    byMeal: {
      breakfast: finalize(byMeal.breakfast),
      lunch: finalize(byMeal.lunch),
      dinner: finalize(byMeal.dinner),
      snacks: finalize(byMeal.snacks)
    },
    remaining: targets
      ? {
          calories: Math.round(targets.calories - roundedTotals.calories),
          proteinG: roundTo(targets.proteinG - roundedTotals.proteinG, 1),
          carbsG: roundTo(targets.carbsG - roundedTotals.carbsG, 1),
          fatG: roundTo(targets.fatG - roundedTotals.fatG, 1),
          fiberG: roundTo(targets.fiberG - roundedTotals.fiberG, 1)
        }
      : null
  };
}

export function computeMovingAverage<T extends { value: number }>(
  series: T[],
  windowSize = 7
): Array<T & { movingAvg: number }> {
  if (windowSize < 1) {
    throw new Error('windowSize must be at least 1');
  }
  return series.map((item, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    const slice = series.slice(start, idx + 1);
    const sum = slice.reduce((acc, cur) => acc + cur.value, 0);
    return {
      ...item,
      movingAvg: roundTo(sum / slice.length, 2)
    };
  });
}
