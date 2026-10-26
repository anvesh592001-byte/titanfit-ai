import { describe, expect, it } from 'vitest';
import {
  aggregateFoodLogs,
  calculateFoodNutrition,
  computeMovingAverage
} from '@/lib/nutrition/nutrition-engine';
import {
  generatePersonalizedMealPlan,
  replaceMealInPlan,
  swapIngredientInMeal,
  updateIngredientQuantityInMeal,
  validateMealPlan
} from '@/lib/nutrition/diet-planner';
import { generateGroceryListFromPlan } from '@/lib/nutrition/grocery-engine';
import { VERIFIED_FOODS } from '@/lib/nutrition/verified-foods';

describe('Nutrition Engine & Food Quantity Calculations', () => {
  it('scales calories and macros proportionally to serving grams', () => {
    const paneer = VERIFIED_FOODS.find((f) => f.name.includes('Paneer'))!;
    const portion = calculateFoodNutrition(paneer, 150);
    expect(portion.calories).toBe(387);
    expect(portion.proteinG).toBe(28.2);
    expect(portion.isVerified).toBe(true);
  });

  it('preserves null fiber instead of fabricating 0g when fiber is unknown', () => {
    const unverifiedCustom = {
      calories_per_100g: 250,
      protein_per_100g: 10,
      carbs_per_100g: 30,
      fat_per_100g: 9,
      fiber_per_100g: null,
      is_verified: false
    };
    const portion = calculateFoodNutrition(unverifiedCustom, 80);
    expect(portion.calories).toBe(200);
    expect(portion.fiberG).toBeNull();
    expect(portion.isVerified).toBe(false);
  });

  it('aggregates daily and meal macro totals and remaining targets accurately', () => {
    const agg = aggregateFoodLogs(
      [
        {
          meal_type: 'breakfast',
          calories: 380,
          protein_g: 22.4,
          carbs_g: 48.2,
          fat_g: 9.1,
          fiber_g: 6.5
        },
        {
          meal_type: 'lunch',
          calories: 620,
          protein_g: 38.6,
          carbs_g: 72.0,
          fat_g: 16.4,
          fiber_g: null
        }
      ],
      { calories: 2100, proteinG: 140, carbsG: 230, fatG: 65, fiberG: 30 }
    );

    expect(agg.totals.calories).toBe(1000);
    expect(agg.totals.proteinG).toBe(61);
    expect(agg.totals.missingFiberCount).toBe(1);
    expect(agg.remaining?.calories).toBe(1100);
  });

  it('computes moving averages without inventing extra data points', () => {
    const avg = computeMovingAverage(
      [
        { date: '2026-10-01', value: 80 },
        { date: '2026-10-02', value: 79.4 },
        { date: '2026-10-03', value: 79.7 }
      ],
      3
    );
    expect(avg).toHaveLength(3);
    expect(avg[2]?.movingAvg).toBe(79.7);
  });
});

describe('Personalized Diet Planner, Substitutions & Grocery Engine', () => {
  it('generates a 7-day vegan meal plan strictly respecting peanut and gluten allergies', () => {
    const plan = generatePersonalizedMealPlan({
      planType: 'weekly',
      targetCalories: 2000,
      targetMacros: { proteinG: 110, carbsG: 240, fatG: 60, fiberG: 30 },
      dietaryPreference: 'vegan',
      allergies: ['peanuts', 'gluten'],
      excludedFoods: ['mushroom'],
      mealsPerDay: 4
    });

    expect(plan.days).toHaveLength(7);
    const check = validateMealPlan(plan, 'vegan', ['peanuts', 'gluten'], ['mushroom']);
    expect(check.valid).toBe(true);

    // Ensure no dairy, egg, meat, fish, peanut, or wheat appears anywhere
    for (const day of plan.days) {
      expect(day.meals).toHaveLength(4);
      for (const meal of day.meals) {
        for (const ing of meal.ingredients) {
          expect(ing.allergenTags).not.toContain('dairy');
          expect(ing.allergenTags).not.toContain('eggs');
          expect(ing.allergenTags).not.toContain('peanuts');
          expect(ing.allergenTags).not.toContain('gluten');
        }
      }
    }

    // Generate grocery list and verify deduplication
    const grocery = generateGroceryListFromPlan(plan);
    expect(grocery.length).toBeGreaterThan(0);
    const ids = grocery.map((g) => g.foodId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('replaces meals, swaps compatible ingredients, and recalculates gram quantities', () => {
    let plan = generatePersonalizedMealPlan({
      planType: 'daily',
      targetCalories: 2200,
      targetMacros: { proteinG: 150, carbsG: 240, fatG: 65, fiberG: 30 },
      dietaryPreference: 'vegetarian',
      allergies: [],
      mealsPerDay: 4
    });

    const firstMeal = plan.days[0]!.meals[0]!;
    plan = replaceMealInPlan(plan, 0, firstMeal.id);
    expect(plan.days[0]!.meals[0]!.id).not.toBe(firstMeal.id);

    const updatedFirstMeal = plan.days[0]!.meals[0]!;
    const beforeGrams = updatedFirstMeal.ingredients[0]!.quantityG;
    plan = updateIngredientQuantityInMeal(
      plan,
      0,
      updatedFirstMeal.id,
      0,
      beforeGrams + 50
    );
    expect(plan.days[0]!.meals[0]!.ingredients[0]!.quantityG).toBe(beforeGrams + 50);

    // Reject swapping in a non-vegetarian food into a vegetarian plan
    const chicken = VERIFIED_FOODS.find((f) => f.name.includes('Chicken Breast'))!;
    expect(() =>
      swapIngredientInMeal(plan, 0, updatedFirstMeal.id, 0, chicken.id)
    ).toThrow();
  });
});
