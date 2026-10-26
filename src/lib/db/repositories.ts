import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  FoodItem,
  FoodLogRow,
  GroceryListRow,
  HabitLogRow,
  HabitRow,
  MealPlanRow,
  ProfileRow,
  ProgressLogRow,
  UserCustomFoodRow,
  UserPreferencesRow,
  WorkoutLogRow,
  WorkoutPlanRow
} from '@/types/domain';
import { VERIFIED_FOODS } from '@/lib/nutrition/verified-foods';

/**
 * Server-side data-access layer enforcing explicit `.eq('user_id', userId)`
 * (or `.eq('id', userId)` on `profiles`) in addition to PostgreSQL RLS.
 */

export async function fetchUserProfileAndPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  profile: ProfileRow | null;
  preferences: UserPreferencesRow | null;
}> {
  const [profileRes, prefRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (prefRes.error) throw new Error(prefRes.error.message);

  const profile = profileRes.data
    ? ({
        ...profileRes.data,
        height_cm: Number(profileRes.data.height_cm),
        weight_kg: Number(profileRes.data.weight_kg),
        food_budget:
          profileRes.data.food_budget !== null && profileRes.data.food_budget !== undefined
            ? Number(profileRes.data.food_budget)
            : null
      } as ProfileRow)
    : null;

  return {
    profile,
    preferences: (prefRes.data as UserPreferencesRow | null) ?? null
  };
}

export async function fetchFoodCatalogForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  foods: FoodItem[];
  customFoods: UserCustomFoodRow[];
}> {
  const [foodsRes, customRes] = await Promise.all([
    supabase.from('foods').select('*').order('name', { ascending: true }),
    supabase
      .from('user_custom_foods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  ]);

  // If the shared foods table hasn't had migration 003 seeded yet, surface verified foods seamlessly
  const dbFoods: FoodItem[] =
    !foodsRes.error && foodsRes.data && foodsRes.data.length > 0
      ? foodsRes.data.map((f) => ({
          id: f.id,
          name: f.name,
          brand: f.brand,
          source: f.source,
          source_food_id: f.source_food_id,
          category: f.category || 'General',
          diet_tags: f.diet_tags || [],
          allergen_tags: f.allergen_tags || [],
          serving_size_g: Number(f.serving_size_g),
          calories_per_100g: Number(f.calories_per_100g),
          protein_per_100g: Number(f.protein_per_100g),
          carbs_per_100g: Number(f.carbs_per_100g),
          fat_per_100g: Number(f.fat_per_100g),
          fiber_per_100g:
            f.fiber_per_100g === null || f.fiber_per_100g === undefined
              ? null
              : Number(f.fiber_per_100g),
          is_verified: Boolean(f.is_verified),
          created_at: f.created_at
        }))
      : VERIFIED_FOODS;

  const customFoods: UserCustomFoodRow[] = (customRes.data ?? []).map((c) => ({
    ...c,
    serving_size_g: Number(c.serving_size_g),
    calories_per_100g: Number(c.calories_per_100g),
    protein_per_100g: Number(c.calories_per_100g !== undefined ? c.protein_per_100g : 0),
    carbs_per_100g: Number(c.carbs_per_100g),
    fat_per_100g: Number(c.fat_per_100g),
    fiber_per_100g:
      c.fiber_per_100g === null || c.fiber_per_100g === undefined
        ? null
        : Number(c.fiber_per_100g)
  }));

  return { foods: dbFoods, customFoods };
}

export async function fetchFoodLogsByDateRange(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<FoodLogRow[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    quantity_g: Number(row.quantity_g),
    calories: Number(row.calories),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
    fiber_g:
      row.fiber_g === null || row.fiber_g === undefined ? null : Number(row.fiber_g)
  })) as FoodLogRow[];
}

export async function fetchSavedMealPlans(
  supabase: SupabaseClient,
  userId: string
): Promise<MealPlanRow[]> {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    target_calories: Number(row.target_calories)
  })) as MealPlanRow[];
}

export async function fetchSavedWorkoutPlans(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkoutPlanRow[]> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutPlanRow[];
}

export async function fetchWorkoutLogs(
  supabase: SupabaseClient,
  userId: string,
  startDate?: string
): Promise<WorkoutLogRow[]> {
  let query = supabase
    .from('workout_logs')
    .select('*, exercise_logs(*)')
    .eq('user_id', userId)
    .order('workout_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('workout_date', startDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutLogRow[];
}

export async function fetchProgressLogs(
  supabase: SupabaseClient,
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<ProgressLogRow[]> {
  let query = supabase
    .from('progress_logs')
    .select('*')
    .eq('user_id', userId)
    .order('log_date', { ascending: true });

  if (startDate) query = query.gte('log_date', startDate);
  if (endDate) query = query.lte('log_date', endDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    ...r,
    weight_kg: r.weight_kg !== null ? Number(r.weight_kg) : null,
    waist_cm: r.waist_cm !== null ? Number(r.waist_cm) : null,
    sleep_hours: r.sleep_hours !== null ? Number(r.sleep_hours) : null
  })) as ProgressLogRow[];
}

export async function fetchHabitsAndLogs(
  supabase: SupabaseClient,
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ habits: HabitRow[]; habitLogs: HabitLogRow[] }> {
  const [habitsRes, logsRes] = await Promise.all([
    supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
  ]);

  if (habitsRes.error) throw new Error(habitsRes.error.message);
  if (logsRes.error) throw new Error(logsRes.error.message);

  return {
    habits: (habitsRes.data ?? []) as HabitRow[],
    habitLogs: (logsRes.data ?? []) as HabitLogRow[]
  };
}

export async function fetchGroceryLists(
  supabase: SupabaseClient,
  userId: string
): Promise<GroceryListRow[]> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GroceryListRow[];
}
