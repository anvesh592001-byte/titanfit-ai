import type {
  DietaryPreference,
  FoodItem,
  MealPlanData,
  MealType,
  PlannedDay,
  PlannedIngredient,
  PlannedMeal
} from '@/types/domain';
import { VERIFIED_FOODS, VERIFIED_FOODS_BY_ID } from './verified-foods';
import { calculateFoodNutrition } from './nutrition-engine';
import { roundTo } from '@/lib/calculations/units';

const fid = (num: number): string =>
  `10000000-0000-4000-8000-${String(num).padStart(12, '0')}`;

interface MealTemplate {
  id: string;
  mealType: MealType;
  name: string;
  cuisine: string;
  budgetTier: 'budget' | 'moderate';
  prepTimeMinutes: number;
  instructions: string[];
  items: Array<{
    foodId: string;
    baseQuantityG: number;
    substitutes: string[];
  }>;
}

const MEAL_TEMPLATES: MealTemplate[] = [
  // ================= BREAKFAST TEMPLATES =================
  {
    id: 'bf-idli-sambar-sprouts',
    mealType: 'breakfast',
    name: 'Steamed Idli, South Indian Sambar & Moong Sprouts',
    cuisine: 'South Indian',
    budgetTier: 'budget',
    prepTimeMinutes: 15,
    instructions: [
      'Steam fermented rice-urad idli batter in greased moulds for 10–12 minutes.',
      'Warm vegetable lentil sambar seasoned with mustard seeds and curry leaves.',
      'Serve alongside steamed moong sprouts for extra plant protein and fiber.'
    ],
    items: [
      { foodId: fid(4), baseQuantityG: 160, substitutes: [fid(5), fid(6)] },
      { foodId: fid(10), baseQuantityG: 180, substitutes: [fid(9)] },
      { foodId: fid(13), baseQuantityG: 90, substitutes: [fid(39), fid(11)] }
    ]
  },
  {
    id: 'bf-dosa-sambar',
    mealType: 'breakfast',
    name: 'Crisp Fermented Dosa with Lentil Sambar & Roasted Chana',
    cuisine: 'South Indian',
    budgetTier: 'budget',
    prepTimeMinutes: 15,
    instructions: [
      'Spread fermented dosa batter thinly on a hot cast-iron tawa with minimal oil.',
      'Cook until golden crisp and pair with piping hot vegetable sambar and roasted chana.'
    ],
    items: [
      { foodId: fid(5), baseQuantityG: 140, substitutes: [fid(4), fid(6)] },
      { foodId: fid(10), baseQuantityG: 180, substitutes: [fid(9)] },
      { foodId: fid(39), baseQuantityG: 40, substitutes: [fid(13)] }
    ]
  },
  {
    id: 'bf-poha-peanuts-curd',
    mealType: 'breakfast',
    name: 'Kanda-Batata Vegetable Poha with Peanuts & Curd',
    cuisine: 'Maharashtrian / Indian',
    budgetTier: 'budget',
    prepTimeMinutes: 15,
    instructions: [
      'Rinse thick poha lightly so flakes soften without turning mushy.',
      'Temper mustard seeds, curry leaves, onions, and roasted peanuts; fold in poha and turmeric.',
      'Serve warm with a bowl of plain toned curd.'
    ],
    items: [
      { foodId: fid(6), baseQuantityG: 180, substitutes: [fid(4), fid(7)] },
      { foodId: fid(34), baseQuantityG: 20, substitutes: [fid(13), fid(39)] },
      { foodId: fid(16), baseQuantityG: 125, substitutes: [fid(13)] }
    ]
  },
  {
    id: 'bf-upma-eggs',
    mealType: 'breakfast',
    name: 'Savoury Vegetable Rava Upma & Boiled Eggs',
    cuisine: 'Indian',
    budgetTier: 'budget',
    prepTimeMinutes: 18,
    instructions: [
      'Dry roast semolina until aromatic, then simmer with sautéed vegetables and ginger.',
      'Hard-boil whole eggs and egg whites for 9 minutes, season with black pepper and cumin.'
    ],
    items: [
      { foodId: fid(7), baseQuantityG: 160, substitutes: [fid(6), fid(4)] },
      { foodId: fid(21), baseQuantityG: 100, substitutes: [fid(17), fid(13)] },
      { foodId: fid(22), baseQuantityG: 100, substitutes: [fid(16)] }
    ]
  },
  {
    id: 'bf-oats-milk-banana',
    mealType: 'breakfast',
    name: 'High-Protein Rolled Oats Porridge with Milk, Banana & Almonds',
    cuisine: 'Global / Indian',
    budgetTier: 'budget',
    prepTimeMinutes: 10,
    instructions: [
      'Simmer rolled oats in toned cow milk for 5 minutes until creamy.',
      'Top with sliced ripe banana and chopped raw almonds.'
    ],
    items: [
      { foodId: fid(8), baseQuantityG: 55, substitutes: [fid(6)] },
      { foodId: fid(18), baseQuantityG: 220, substitutes: [fid(19)] },
      { foodId: fid(32), baseQuantityG: 118, substitutes: [fid(33)] },
      { foodId: fid(36), baseQuantityG: 15, substitutes: [fid(34)] }
    ]
  },
  {
    id: 'bf-vegan-oats-plantpro',
    mealType: 'breakfast',
    name: 'Plant-Protein Oatmeal Bowl with Banana',
    cuisine: 'Global Plant-Based',
    budgetTier: 'moderate',
    prepTimeMinutes: 8,
    instructions: [
      'Cook rolled oats in hot water until tender and allow to cool slightly.',
      'Whisk in plant protein isolate until smooth and top with sliced banana.'
    ],
    items: [
      { foodId: fid(8), baseQuantityG: 55, substitutes: [fid(4)] },
      { foodId: fid(40), baseQuantityG: 30, substitutes: [fid(13)] },
      { foodId: fid(32), baseQuantityG: 118, substitutes: [fid(33)] }
    ]
  },

  // ================= LUNCH TEMPLATES =================
  {
    id: 'ln-rice-dal-palak-salad',
    mealType: 'lunch',
    name: 'Steamed Rice, Toor Dal Tadka, Palak & Kachumber Salad',
    cuisine: 'Indian Comfort',
    budgetTier: 'budget',
    prepTimeMinutes: 25,
    instructions: [
      'Pressure cook toor dal with turmeric and temper with cumin, garlic, and 1 tsp cooking oil.',
      'Sauté fresh palak greens until wilted without overcooking.',
      'Serve alongside steamed rice and crisp cucumber-tomato-onion salad.'
    ],
    items: [
      { foodId: fid(1), baseQuantityG: 180, substitutes: [fid(2), fid(3)] },
      { foodId: fid(9), baseQuantityG: 180, substitutes: [fid(12), fid(11)] },
      { foodId: fid(27), baseQuantityG: 100, substitutes: [fid(28), fid(29)] },
      { foodId: fid(30), baseQuantityG: 120, substitutes: [fid(28)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [fid(38)] }
    ]
  },
  {
    id: 'ln-roti-paneer-dal',
    mealType: 'lunch',
    name: 'Whole Wheat Rotis with Spiced Paneer Bhurji, Dal & Curd',
    cuisine: 'North Indian',
    budgetTier: 'moderate',
    prepTimeMinutes: 25,
    instructions: [
      'Crumble fresh paneer and sauté lightly with onions, tomatoes, green chilies, and turmeric.',
      'Pair with warm whole wheat phulkas, cooked lentil dal, and chilled curd.'
    ],
    items: [
      { foodId: fid(3), baseQuantityG: 80, substitutes: [fid(1), fid(2)] },
      { foodId: fid(17), baseQuantityG: 100, substitutes: [fid(15), fid(14)] },
      { foodId: fid(9), baseQuantityG: 120, substitutes: [fid(10)] },
      { foodId: fid(16), baseQuantityG: 100, substitutes: [fid(30)] }
    ]
  },
  {
    id: 'ln-soya-pulao-salad',
    mealType: 'lunch',
    name: 'High-Protein Soya Chunks Rice Pulao & Fresh Salad',
    cuisine: 'Indian High-Protein',
    budgetTier: 'budget',
    prepTimeMinutes: 22,
    instructions: [
      'Boil dry soya chunks in salted water for 5 minutes, rinse thoroughly, and squeeze dry.',
      'Toss with steamed brown rice, mixed seasonal vegetables, cumin, and 1 tsp oil.',
      'Serve with fresh kachumber salad.'
    ],
    items: [
      { foodId: fid(14), baseQuantityG: 45, substitutes: [fid(11), fid(15)] },
      { foodId: fid(2), baseQuantityG: 170, substitutes: [fid(1), fid(3)] },
      { foodId: fid(28), baseQuantityG: 120, substitutes: [fid(27), fid(29)] },
      { foodId: fid(30), baseQuantityG: 100, substitutes: [fid(28)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [] }
    ]
  },
  {
    id: 'ln-chicken-rice-dal',
    mealType: 'lunch',
    name: 'Grilled Tandoori-Spiced Chicken Breast, Steamed Rice & Dal',
    cuisine: 'Indian Athletic',
    budgetTier: 'moderate',
    prepTimeMinutes: 25,
    instructions: [
      'Marinate chicken breast in ginger-garlic, lemon juice, turmeric, and garam masala; pan-grill until cooked through (74°C internal).',
      'Serve with steamed white rice, a bowl of toor dal, and fresh cucumber-tomato salad.'
    ],
    items: [
      { foodId: fid(23), baseQuantityG: 140, substitutes: [fid(24), fid(25)] },
      { foodId: fid(1), baseQuantityG: 180, substitutes: [fid(2), fid(3)] },
      { foodId: fid(9), baseQuantityG: 130, substitutes: [fid(10)] },
      { foodId: fid(30), baseQuantityG: 120, substitutes: [fid(28)] }
    ]
  },
  {
    id: 'ln-fish-rice-sambar',
    mealType: 'lunch',
    name: 'Coastal Rohu Fish Fillet with Steamed Rice, Sambar & Greens',
    cuisine: 'Coastal Indian',
    budgetTier: 'moderate',
    prepTimeMinutes: 28,
    instructions: [
      'Simmer rohu fish fillet gently in turmeric, tamarind, black pepper, and curry leaf broth.',
      'Serve with steamed rice, vegetable sambar, and sautéed palak.'
    ],
    items: [
      { foodId: fid(25), baseQuantityG: 140, substitutes: [fid(26), fid(21)] },
      { foodId: fid(1), baseQuantityG: 180, substitutes: [fid(2)] },
      { foodId: fid(10), baseQuantityG: 150, substitutes: [fid(9)] },
      { foodId: fid(27), baseQuantityG: 100, substitutes: [fid(28)] }
    ]
  },
  {
    id: 'ln-rajma-brown-rice',
    mealType: 'lunch',
    name: 'Homestyle Rajma Masala with Brown Rice & Salad',
    cuisine: 'North Indian Plant-Based',
    budgetTier: 'budget',
    prepTimeMinutes: 25,
    instructions: [
      'Simmer boiled red kidney beans in onion-tomato-ginger masala with 1 tsp cooking oil.',
      'Serve over nutty cooked brown rice with raw kachumber salad and lemon.'
    ],
    items: [
      { foodId: fid(12), baseQuantityG: 160, substitutes: [fid(11), fid(9)] },
      { foodId: fid(2), baseQuantityG: 180, substitutes: [fid(1)] },
      { foodId: fid(30), baseQuantityG: 120, substitutes: [fid(28)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [] }
    ]
  },

  // ================= DINNER TEMPLATES =================
  {
    id: 'dn-chana-sweetpotato-palak',
    mealType: 'dinner',
    name: 'Spiced Chana, Roasted Sweet Potato & Garlic Palak Bowl',
    cuisine: 'Indian / Fusion Wholesome',
    budgetTier: 'budget',
    prepTimeMinutes: 20,
    instructions: [
      'Toss boiled kabuli chana and cubed boiled sweet potato with roasted cumin, chaat spice, and 1 tsp olive oil.',
      'Serve over warm garlic-wilted spinach greens.'
    ],
    items: [
      { foodId: fid(11), baseQuantityG: 160, substitutes: [fid(12), fid(9)] },
      { foodId: fid(31), baseQuantityG: 140, substitutes: [fid(2), fid(1)] },
      { foodId: fid(27), baseQuantityG: 120, substitutes: [fid(29), fid(28)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [] }
    ]
  },
  {
    id: 'dn-tofu-brownrice-broccoli',
    mealType: 'dinner',
    name: 'Seared Firm Tofu, Steamed Broccoli & Brown Rice Stir-Fry',
    cuisine: 'Asian-Indian Fusion',
    budgetTier: 'moderate',
    prepTimeMinutes: 20,
    instructions: [
      'Press firm tofu cubes and pan-sear in 1 tsp oil with ginger, garlic, and cracked black pepper.',
      'Fold in crisp-tender steamed broccoli and serve alongside cooked brown rice.'
    ],
    items: [
      { foodId: fid(15), baseQuantityG: 150, substitutes: [fid(17), fid(11)] },
      { foodId: fid(29), baseQuantityG: 130, substitutes: [fid(28), fid(27)] },
      { foodId: fid(2), baseQuantityG: 150, substitutes: [fid(1)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [] }
    ]
  },
  {
    id: 'dn-roti-egg-bhurji',
    mealType: 'dinner',
    name: 'Egg & Egg-White Masala Bhurji with Whole Wheat Rotis & Veg',
    cuisine: 'Indian High-Protein',
    budgetTier: 'budget',
    prepTimeMinutes: 18,
    instructions: [
      'Scramble whole eggs and egg whites gently with finely chopped onions, tomatoes, coriander, and turmeric.',
      'Serve with two warm whole wheat rotis and steamed seasonal vegetables.'
    ],
    items: [
      { foodId: fid(21), baseQuantityG: 100, substitutes: [fid(17)] },
      { foodId: fid(22), baseQuantityG: 120, substitutes: [fid(16)] },
      { foodId: fid(3), baseQuantityG: 80, substitutes: [fid(1), fid(2)] },
      { foodId: fid(28), baseQuantityG: 120, substitutes: [fid(29), fid(30)] }
    ]
  },
  {
    id: 'dn-chicken-roti-veg',
    mealType: 'dinner',
    name: 'Herb-Grilled Chicken, Whole Wheat Rotis & Steamed Broccoli',
    cuisine: 'Lean Athletic',
    budgetTier: 'moderate',
    prepTimeMinutes: 22,
    instructions: [
      'Season skinless chicken breast with garlic, black pepper, coriander, and 1 tsp oil; sear 5–6 mins per side.',
      'Serve with whole wheat rotis and steamed broccoli florets.'
    ],
    items: [
      { foodId: fid(23), baseQuantityG: 140, substitutes: [fid(24), fid(25)] },
      { foodId: fid(3), baseQuantityG: 80, substitutes: [fid(2), fid(31)] },
      { foodId: fid(29), baseQuantityG: 120, substitutes: [fid(28), fid(27)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [] }
    ]
  },
  {
    id: 'dn-paneer-tikka-salad-rice',
    mealType: 'dinner',
    name: 'Tawa Paneer Tikka with Steamed Rice, Dal & Mixed Vegetables',
    cuisine: 'North Indian Vegetarian',
    budgetTier: 'moderate',
    prepTimeMinutes: 22,
    instructions: [
      'Marinate paneer cubes in spiced curd, sear on a non-stick tawa until lightly charred.',
      'Serve with a portion of steamed rice, cooked dal, and mixed vegetables.'
    ],
    items: [
      { foodId: fid(17), baseQuantityG: 90, substitutes: [fid(15), fid(14)] },
      { foodId: fid(16), baseQuantityG: 60, substitutes: [] },
      { foodId: fid(1), baseQuantityG: 140, substitutes: [fid(2), fid(3)] },
      { foodId: fid(28), baseQuantityG: 120, substitutes: [fid(29), fid(30)] }
    ]
  },
  {
    id: 'dn-salmon-sweetpotato-greens',
    mealType: 'dinner',
    name: 'Baked Salmon (or Rohu) with Sweet Potato & Spinach',
    cuisine: 'Pescatarian Recovery',
    budgetTier: 'moderate',
    prepTimeMinutes: 22,
    instructions: [
      'Bake fish fillet at 200°C for 12–14 minutes with lemon juice and herbs.',
      'Plate alongside boiled sweet potato and sautéed spinach.'
    ],
    items: [
      { foodId: fid(25), baseQuantityG: 140, substitutes: [fid(26)] },
      { foodId: fid(31), baseQuantityG: 150, substitutes: [fid(2), fid(1)] },
      { foodId: fid(27), baseQuantityG: 120, substitutes: [fid(29), fid(28)] },
      { foodId: fid(37), baseQuantityG: 5, substitutes: [] }
    ]
  },

  // ================= SNACK TEMPLATES =================
  {
    id: 'sn-roasted-chana-apple',
    mealType: 'snacks',
    name: 'Crunchy Roasted Chana & Fresh Apple',
    cuisine: 'Indian Everyday',
    budgetTier: 'budget',
    prepTimeMinutes: 3,
    instructions: [
      'Portion dry-roasted chana into a bowl with a squeeze of lemon and pair with sliced fresh apple.'
    ],
    items: [
      { foodId: fid(39), baseQuantityG: 45, substitutes: [fid(13), fid(34)] },
      { foodId: fid(33), baseQuantityG: 150, substitutes: [fid(32)] }
    ]
  },
  {
    id: 'sn-sprouts-chaat-banana',
    mealType: 'snacks',
    name: 'Steamed Moong Sprouts Chaat & Ripe Banana',
    cuisine: 'Indian Plant-Based',
    budgetTier: 'budget',
    prepTimeMinutes: 5,
    instructions: [
      'Toss steamed moong sprouts with chopped cucumber, tomato, and lemon juice; pair with a banana.'
    ],
    items: [
      { foodId: fid(13), baseQuantityG: 110, substitutes: [fid(39)] },
      { foodId: fid(30), baseQuantityG: 80, substitutes: [] },
      { foodId: fid(32), baseQuantityG: 118, substitutes: [fid(33)] }
    ]
  },
  {
    id: 'sn-whey-banana',
    mealType: 'snacks',
    name: 'Whey Protein Isolate Recovery Shake & Banana',
    cuisine: 'Post-Workout',
    budgetTier: 'moderate',
    prepTimeMinutes: 3,
    instructions: [
      'Shake 1 scoop of whey isolate in chilled water and enjoy with a medium banana.'
    ],
    items: [
      { foodId: fid(20), baseQuantityG: 30, substitutes: [fid(40), fid(16)] },
      { foodId: fid(32), baseQuantityG: 118, substitutes: [fid(33)] }
    ]
  },
  {
    id: 'sn-curd-almonds-apple',
    mealType: 'snacks',
    name: 'Chilled Dahi Bowl with Raw Almonds & Apple',
    cuisine: 'Indian Vegetarian',
    budgetTier: 'budget',
    prepTimeMinutes: 4,
    instructions: [
      'Whisk plain toned curd until smooth and top with diced apple and chopped raw almonds.'
    ],
    items: [
      { foodId: fid(16), baseQuantityG: 150, substitutes: [fid(19)] },
      { foodId: fid(36), baseQuantityG: 18, substitutes: [fid(34)] },
      { foodId: fid(33), baseQuantityG: 120, substitutes: [fid(32)] }
    ]
  },
  {
    id: 'sn-pb-banana',
    mealType: 'snacks',
    name: 'Sliced Banana with Natural Unsweetened Peanut Butter',
    cuisine: 'Quick Energy',
    budgetTier: 'budget',
    prepTimeMinutes: 3,
    instructions: [
      'Slice ripe banana and drizzle with 1 tbsp natural unsweetened peanut butter.'
    ],
    items: [
      { foodId: fid(32), baseQuantityG: 118, substitutes: [fid(33)] },
      { foodId: fid(35), baseQuantityG: 20, substitutes: [fid(36)] }
    ]
  }
];

function normalizeToken(val: string): string {
  return val.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

export function isFoodCompatible(
  food: FoodItem,
  dietaryPreference: DietaryPreference,
  allergies: string[],
  excludedFoods: string[]
): boolean {
  if (!food.diet_tags.includes(dietaryPreference)) {
    return false;
  }

  const normalizedAllergies = allergies.map(normalizeToken).filter(Boolean);
  const normalizedExclusions = excludedFoods.map(normalizeToken).filter(Boolean);
  const foodNameLower = normalizeToken(food.name);
  const foodAllergens = food.allergen_tags.map(normalizeToken);

  for (const allergy of normalizedAllergies) {
    if (
      foodAllergens.some((tag) => tag.includes(allergy) || allergy.includes(tag)) ||
      foodNameLower.includes(allergy)
    ) {
      return false;
    }
  }

  for (const excluded of normalizedExclusions) {
    if (foodNameLower.includes(excluded)) {
      return false;
    }
  }

  return true;
}

function buildPlannedIngredient(
  food: FoodItem,
  quantityG: number,
  substitutes: string[],
  dietaryPreference: DietaryPreference,
  allergies: string[],
  excludedFoods: string[]
): PlannedIngredient {
  // Round to practical 5g culinary increments (min 5g)
  const roundedG = Math.max(5, Math.round(quantityG / 5) * 5);
  const calc = calculateFoodNutrition(food, roundedG);
  const validSubs = substitutes.filter((subId) => {
    const subFood = VERIFIED_FOODS_BY_ID.get(subId);
    return subFood
      ? isFoodCompatible(subFood, dietaryPreference, allergies, excludedFoods)
      : false;
  });

  return {
    foodId: food.id,
    foodName: food.name,
    source: food.source,
    sourceFoodId: food.source_food_id,
    category: food.category,
    quantityG: roundedG,
    calories: calc.calories,
    proteinG: calc.proteinG,
    carbsG: calc.carbsG,
    fatG: calc.fatG,
    fiberG: calc.fiberG,
    allergenTags: food.allergen_tags,
    substituteFoodIds: validSubs
  };
}

export function recalculateMealTotals(ingredients: PlannedIngredient[]): PlannedMeal['totals'] {
  const sum = ingredients.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
      fiberG: acc.fiberG + (item.fiberG ?? 0)
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  );

  return {
    calories: Math.round(sum.calories),
    proteinG: roundTo(sum.proteinG, 1),
    carbsG: roundTo(sum.carbsG, 1),
    fatG: roundTo(sum.fatG, 1),
    fiberG: roundTo(sum.fiberG, 1)
  };
}

export function recalculateDayTotals(meals: PlannedMeal[]): PlannedDay['totals'] {
  const sum = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.totals.calories,
      proteinG: acc.proteinG + meal.totals.proteinG,
      carbsG: acc.carbsG + meal.totals.carbsG,
      fatG: acc.fatG + meal.totals.fatG,
      fiberG: acc.fiberG + meal.totals.fiberG
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 }
  );

  return {
    calories: Math.round(sum.calories),
    proteinG: roundTo(sum.proteinG, 1),
    carbsG: roundTo(sum.carbsG, 1),
    fatG: roundTo(sum.fatG, 1),
    fiberG: roundTo(sum.fiberG, 1)
  };
}

function instantiateMealTemplate(
  template: MealTemplate,
  targetSlotCalories: number,
  dayIdx: number,
  slotIdx: number,
  dietaryPreference: DietaryPreference,
  allergies: string[],
  excludedFoods: string[]
): PlannedMeal {
  const baseCalories = template.items.reduce((acc, item) => {
    const food = VERIFIED_FOODS_BY_ID.get(item.foodId);
    if (!food) {
      throw new Error(`Missing verified food definition for ${item.foodId}`);
    }
    return acc + (food.calories_per_100g * item.baseQuantityG) / 100;
  }, 0);

  // Clamp scale factor to culinary sensible bounds (0.55x to 2.1x)
  const rawScale = baseCalories > 0 ? targetSlotCalories / baseCalories : 1;
  const scale = Math.min(2.1, Math.max(0.55, rawScale));

  const ingredients = template.items.map((item) => {
    const food = VERIFIED_FOODS_BY_ID.get(item.foodId)!;
    // Cooking oils scale gently so high-calorie plans don't get flooded with pure oil
    const effectiveScale = food.category === 'Nuts, Seeds & Oils' ? Math.min(1.4, scale) : scale;
    return buildPlannedIngredient(
      food,
      item.baseQuantityG * effectiveScale,
      item.substitutes,
      dietaryPreference,
      allergies,
      excludedFoods
    );
  });

  return {
    id: `day-${dayIdx + 1}-${template.mealType}-${slotIdx + 1}-${template.id}`,
    templateId: template.id,
    mealType: template.mealType,
    name: template.name,
    cuisine: template.cuisine,
    budgetTier: template.budgetTier,
    prepTimeMinutes: template.prepTimeMinutes,
    instructions: template.instructions,
    ingredients,
    totals: recalculateMealTotals(ingredients),
    eaten: false
  };
}

/**
 * Hard validation guard: throws an error if ANY ingredient in the meal plan
 * violates dietary preference, allergen hard-exclusions, excluded foods,
 * or lacks verified database backing.
 */
export function validateMealPlan(
  planData: MealPlanData,
  dietaryPreference: DietaryPreference,
  allergies: string[],
  excludedFoods: string[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const day of planData.days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const food = VERIFIED_FOODS_BY_ID.get(ing.foodId);
        if (!food || !food.is_verified) {
          violations.push(
            `Unverified or unknown food item "${ing.foodName}" in ${meal.name}.`
          );
          continue;
        }
        if (!isFoodCompatible(food, dietaryPreference, allergies, excludedFoods)) {
          violations.push(
            `Ingredient "${food.name}" in "${meal.name}" conflicts with diet (${dietaryPreference}), allergies (${allergies.join(', ')}), or exclusions.`
          );
        }
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

export interface DietPlannerOptions {
  planType: 'daily' | 'weekly';
  targetCalories: number;
  targetMacros: {
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  dietaryPreference: DietaryPreference;
  allergies?: string[];
  excludedFoods?: string[];
  preferredFoods?: string[];
  mealsPerDay?: number;
  budgetFriendlyOnly?: boolean;
}

const DAY_NAMES = [
  'Day 1 — Monday',
  'Day 2 — Tuesday',
  'Day 3 — Wednesday',
  'Day 4 — Thursday',
  'Day 5 — Friday',
  'Day 6 — Saturday',
  'Day 7 — Sunday'
];

export function generatePersonalizedMealPlan(options: DietPlannerOptions): MealPlanData {
  const allergies = options.allergies ?? [];
  const excludedFoods = options.excludedFoods ?? [];
  const preferredFoods = (options.preferredFoods ?? []).map(normalizeToken).filter(Boolean);
  const mealsPerDay = Math.min(6, Math.max(2, options.mealsPerDay ?? 4));
  const numDays = options.planType === 'weekly' ? 7 : 1;

  const isTemplateCompatible = (tpl: MealTemplate): boolean => {
    if (options.budgetFriendlyOnly && tpl.budgetTier !== 'budget') {
      return false;
    }
    return tpl.items.every((it) => {
      const food = VERIFIED_FOODS_BY_ID.get(it.foodId);
      return food
        ? isFoodCompatible(food, options.dietaryPreference, allergies, excludedFoods)
        : false;
    });
  };

  const getPool = (slot: MealType): MealTemplate[] => {
    let matches = MEAL_TEMPLATES.filter(
      (t) => t.mealType === slot && isTemplateCompatible(t)
    );
    // Fallback without strict budget Tier if budget filter left 0 templates, while NEVER relaxing allergies/diet!
    if (matches.length === 0 && options.budgetFriendlyOnly) {
      matches = MEAL_TEMPLATES.filter((t) => {
        if (t.mealType !== slot) return false;
        return t.items.every((it) => {
          const food = VERIFIED_FOODS_BY_ID.get(it.foodId);
          return food
            ? isFoodCompatible(food, options.dietaryPreference, allergies, excludedFoods)
            : false;
        });
      });
    }

    if (matches.length === 0) {
      throw new Error(
        `No verified ${slot} meal templates remain after applying hard exclusions for diet "${options.dietaryPreference}", allergies [${allergies.join(', ')}], and excluded foods [${excludedFoods.join(', ')}]. Reduce overlapping exclusions to generate a plan.`
      );
    }

    // Prioritize templates containing preferred foods at the front
    if (preferredFoods.length > 0) {
      matches = [...matches].sort((a, b) => {
        const aScore = a.items.reduce((acc, it) => {
          const fname = normalizeToken(VERIFIED_FOODS_BY_ID.get(it.foodId)?.name ?? '');
          return acc + (preferredFoods.some((pf) => fname.includes(pf)) ? 1 : 0);
        }, 0);
        const bScore = b.items.reduce((acc, it) => {
          const fname = normalizeToken(VERIFIED_FOODS_BY_ID.get(it.foodId)?.name ?? '');
          return acc + (preferredFoods.some((pf) => fname.includes(pf)) ? 1 : 0);
        }, 0);
        return bScore - aScore;
      });
    }

    return matches;
  };

  // Build slot schedule according to mealsPerDay
  let slotWeights: Array<{ slot: MealType; share: number }>;
  if (mealsPerDay === 2) {
    slotWeights = [
      { slot: 'lunch', share: 0.52 },
      { slot: 'dinner', share: 0.48 }
    ];
  } else if (mealsPerDay === 3) {
    slotWeights = [
      { slot: 'breakfast', share: 0.3 },
      { slot: 'lunch', share: 0.38 },
      { slot: 'dinner', share: 0.32 }
    ];
  } else if (mealsPerDay === 4) {
    slotWeights = [
      { slot: 'breakfast', share: 0.25 },
      { slot: 'lunch', share: 0.34 },
      { slot: 'snacks', share: 0.13 },
      { slot: 'dinner', share: 0.28 }
    ];
  } else if (mealsPerDay === 5) {
    slotWeights = [
      { slot: 'breakfast', share: 0.23 },
      { slot: 'snacks', share: 0.11 },
      { slot: 'lunch', share: 0.31 },
      { slot: 'snacks', share: 0.11 },
      { slot: 'dinner', share: 0.24 }
    ];
  } else {
    slotWeights = [
      { slot: 'breakfast', share: 0.2 },
      { slot: 'snacks', share: 0.1 },
      { slot: 'lunch', share: 0.28 },
      { slot: 'snacks', share: 0.1 },
      { slot: 'dinner', share: 0.22 },
      { slot: 'snacks', share: 0.1 }
    ];
  }

  const days: PlannedDay[] = [];

  for (let d = 0; d < numDays; d++) {
    const meals: PlannedMeal[] = slotWeights.map((sw, sIdx) => {
      const pool = getPool(sw.slot);
      const chosenTemplate = pool[(d + sIdx) % pool.length]!;
      const slotCalorieBudget = options.targetCalories * sw.share;
      return instantiateMealTemplate(
        chosenTemplate,
        slotCalorieBudget,
        d,
        sIdx,
        options.dietaryPreference,
        allergies,
        excludedFoods
      );
    });

    days.push({
      dayIndex: d,
      dayLabel: numDays === 1 ? 'Daily Nutrition Plan' : DAY_NAMES[d] ?? `Day ${d + 1}`,
      meals,
      totals: recalculateDayTotals(meals)
    });
  }

  const planData: MealPlanData = {
    days,
    dietaryPreference: options.dietaryPreference,
    excludedAllergens: allergies,
    excludedFoods,
    targetMacros: {
      calories: Math.round(options.targetCalories),
      proteinG: options.targetMacros.proteinG,
      carbsG: options.targetMacros.carbsG,
      fatG: options.targetMacros.fatG,
      fiberG: options.targetMacros.fiberG
    },
    pricingNote:
      'Ingredient budget tiers reflect general staple affordability; exact local retail currency prices are omitted because grocery prices vary by city, season, and vendor.',
    generatedAtIso: new Date().toISOString()
  };

  const validation = validateMealPlan(
    planData,
    options.dietaryPreference,
    allergies,
    excludedFoods
  );
  if (!validation.valid) {
    throw new Error(`Meal plan validation failed: ${validation.violations.join(' | ')}`);
  }

  return planData;
}

export function replaceMealInPlan(
  planData: MealPlanData,
  dayIndex: number,
  mealId: string
): MealPlanData {
  const day = planData.days[dayIndex];
  if (!day) return planData;
  const mealIdx = day.meals.findIndex((m) => m.id === mealId);
  if (mealIdx === -1) return planData;

  const currentMeal = day.meals[mealIdx]!;
  const compatibleTemplates = MEAL_TEMPLATES.filter((t) => {
    if (t.mealType !== currentMeal.mealType) return false;
    return t.items.every((it) => {
      const food = VERIFIED_FOODS_BY_ID.get(it.foodId);
      return food
        ? isFoodCompatible(
            food,
            planData.dietaryPreference,
            planData.excludedAllergens,
            planData.excludedFoods
          )
        : false;
    });
  });

  if (compatibleTemplates.length === 0) return planData;

  const currentTplIdx = compatibleTemplates.findIndex(
    (t) => t.id === currentMeal.templateId
  );
  const nextTpl =
    compatibleTemplates[(currentTplIdx + 1) % compatibleTemplates.length]!;

  const replacement = instantiateMealTemplate(
    nextTpl,
    Math.max(180, currentMeal.totals.calories),
    dayIndex,
    mealIdx,
    planData.dietaryPreference,
    planData.excludedAllergens,
    planData.excludedFoods
  );

  const nextMeals = day.meals.map((m, i) => (i === mealIdx ? replacement : m));
  const nextDays = planData.days.map((d, i) =>
    i === dayIndex
      ? { ...d, meals: nextMeals, totals: recalculateDayTotals(nextMeals) }
      : d
  );

  return { ...planData, days: nextDays };
}

export function swapIngredientInMeal(
  planData: MealPlanData,
  dayIndex: number,
  mealId: string,
  ingredientIndex: number,
  newFoodId: string
): MealPlanData {
  const newFood = VERIFIED_FOODS_BY_ID.get(newFoodId);
  if (
    !newFood ||
    !isFoodCompatible(
      newFood,
      planData.dietaryPreference,
      planData.excludedAllergens,
      planData.excludedFoods
    )
  ) {
    throw new Error('Selected substitute food is incompatible with diet or allergy rules.');
  }

  const nextDays = planData.days.map((day, dIdx) => {
    if (dIdx !== dayIndex) return day;
    const nextMeals = day.meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      const currentIng = meal.ingredients[ingredientIndex];
      if (!currentIng) return meal;

      // Match approximate caloric contribution cleanly
      const targetItemCalories = Math.max(25, currentIng.calories);
      const equivalentGrams =
        newFood.calories_per_100g > 0
          ? (targetItemCalories / newFood.calories_per_100g) * 100
          : newFood.serving_size_g;

      const otherSubs = Array.from(
        new Set([currentIng.foodId, ...currentIng.substituteFoodIds])
      ).filter((id) => id !== newFood.id);

      const updatedIngredient = buildPlannedIngredient(
        newFood,
        Math.min(350, Math.max(10, equivalentGrams)),
        otherSubs,
        planData.dietaryPreference,
        planData.excludedAllergens,
        planData.excludedFoods
      );

      const nextIngredients = meal.ingredients.map((ing, idx) =>
        idx === ingredientIndex ? updatedIngredient : ing
      );
      return {
        ...meal,
        ingredients: nextIngredients,
        totals: recalculateMealTotals(nextIngredients)
      };
    });
    return {
      ...day,
      meals: nextMeals,
      totals: recalculateDayTotals(nextMeals)
    };
  });

  return { ...planData, days: nextDays };
}

export function updateIngredientQuantityInMeal(
  planData: MealPlanData,
  dayIndex: number,
  mealId: string,
  ingredientIndex: number,
  newQuantityG: number
): MealPlanData {
  if (!Number.isFinite(newQuantityG) || newQuantityG < 5 || newQuantityG > 2000) {
    throw new Error('Ingredient quantity must be between 5g and 2,000g.');
  }

  const nextDays = planData.days.map((day, dIdx) => {
    if (dIdx !== dayIndex) return day;
    const nextMeals = day.meals.map((meal) => {
      if (meal.id !== mealId) return meal;
      const currentIng = meal.ingredients[ingredientIndex];
      if (!currentIng) return meal;
      const food = VERIFIED_FOODS_BY_ID.get(currentIng.foodId);
      if (!food) return meal;

      const calc = calculateFoodNutrition(food, newQuantityG);
      const updatedIng: PlannedIngredient = {
        ...currentIng,
        quantityG: calc.quantityG,
        calories: calc.calories,
        proteinG: calc.proteinG,
        carbsG: calc.carbsG,
        fatG: calc.fatG,
        fiberG: calc.fiberG
      };

      const nextIngredients = meal.ingredients.map((ing, idx) =>
        idx === ingredientIndex ? updatedIng : ing
      );
      return {
        ...meal,
        ingredients: nextIngredients,
        totals: recalculateMealTotals(nextIngredients)
      };
    });
    return {
      ...day,
      meals: nextMeals,
      totals: recalculateDayTotals(nextMeals)
    };
  });

  return { ...planData, days: nextDays };
}

export function getCompatibleSubstituteFoods(
  currentFoodId: string,
  dietaryPreference: DietaryPreference,
  allergies: string[],
  excludedFoods: string[]
): FoodItem[] {
  const currentFood = VERIFIED_FOODS_BY_ID.get(currentFoodId);
  return VERIFIED_FOODS.filter((f) => {
    if (f.id === currentFoodId) return false;
    if (!isFoodCompatible(f, dietaryPreference, allergies, excludedFoods)) return false;
    if (!currentFood) return true;
    return f.category === currentFood.category;
  });
}
