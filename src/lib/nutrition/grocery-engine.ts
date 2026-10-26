import type { GroceryItem, MealPlanData } from '@/types/domain';
import { VERIFIED_FOODS_BY_ID } from './verified-foods';
import { roundTo } from '@/lib/calculations/units';

/**
 * Generates an aggregated, deduplicated grocery list from a MealPlanData object.
 * Combines duplicate ingredients by canonical foodId (or normalized name),
 * sums exact gram quantities, groups by food category, and clearly separates
 * verified edible-gram totals from approximate household/raw-purchase notes.
 */
export function generateGroceryListFromPlan(planData: MealPlanData): GroceryItem[] {
  const map = new Map<
    string,
    {
      foodId: string | null;
      name: string;
      category: string;
      totalQuantityG: number;
    }
  >();

  for (const day of planData.days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const key = ing.foodId || ing.foodName.trim().toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.totalQuantityG += ing.quantityG;
        } else {
          map.set(key, {
            foodId: ing.foodId || null,
            name: ing.foodName,
            category: ing.category || 'General Pantry',
            totalQuantityG: ing.quantityG
          });
        }
      }
    }
  }

  const items: GroceryItem[] = [];
  let idx = 1;

  for (const entry of map.values()) {
    const food = entry.foodId ? VERIFIED_FOODS_BY_ID.get(entry.foodId) : undefined;
    const totalG = roundTo(entry.totalQuantityG, 0);

    let approxNote = `${totalG >= 1000 ? `${roundTo(totalG / 1000, 2)} kg` : `${totalG} g`} edible portion`;
    if (food && food.serving_size_g > 0) {
      const approxServings = roundTo(totalG / food.serving_size_g, 1);
      approxNote = `~${approxServings} standard servings (${food.serving_size_g}g each) — ${
        /cooked|boiled|steamed/i.test(food.name)
          ? 'Approx. cooked weight; dry/raw grocery weight is typically 35–45% of cooked grain/legume weight.'
          : 'Direct ready/raw weight.'
      }`;
    }

    items.push({
      id: `grocery-${idx++}-${entry.foodId ?? 'custom'}`,
      foodId: entry.foodId,
      name: entry.name,
      category: entry.category,
      totalQuantityG: totalG,
      displayApproxNote: approxNote,
      isQuantityVerified: Boolean(food?.is_verified),
      purchased: false,
      estimatedPriceNote: food?.budget_tier
        ? `Tier: ${food.budget_tier.toUpperCase()} staple (exact retail price not estimated without local vendor feed)`
        : null
    });
  }

  return items.sort((a, b) => {
    const catCmp = a.category.localeCompare(b.category);
    if (catCmp !== 0) return catCmp;
    return a.name.localeCompare(b.name);
  });
}

export function groupGroceryItemsByCategory(
  items: GroceryItem[]
): Record<string, GroceryItem[]> {
  return items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat]!.push(item);
    return acc;
  }, {});
}
