export type SexForCalculation = 'male' | 'female' | 'unspecified';

export type FitnessGoal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintenance'
  | 'recomposition'
  | 'endurance'
  | 'general_fitness';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type DietaryPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'eggetarian'
  | 'pescatarian';

export type PreferredUnits = 'metric' | 'imperial';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export type WorkoutLocation = 'gym' | 'home' | 'outdoor' | 'hybrid';

export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

export type HabitType =
  | 'hydration'
  | 'nutrition'
  | 'movement'
  | 'sleep'
  | 'recovery'
  | 'mindfulness'
  | 'custom';

export interface ProfileRow {
  id: string;
  full_name: string;
  date_of_birth: string; // YYYY-MM-DD
  height_cm: number;
  weight_kg: number;
  sex_for_calculation: SexForCalculation | null;
  fitness_goal: FitnessGoal;
  activity_level: ActivityLevel;
  dietary_preference: DietaryPreference;
  preferred_units: PreferredUnits;
  country: string;
  food_budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRow {
  id: string;
  user_id: string;
  allergies: string[];
  excluded_foods: string[];
  preferred_foods: string[];
  meals_per_day: number;
  workout_location: WorkoutLocation;
  equipment: string[];
  training_experience: TrainingExperience;
  workout_days_per_week: number;
  session_duration_minutes: number;
  exercise_limitations?: string[];
  created_at: string;
  updated_at: string;
}

export type FoodSource = 'USDA_FDC' | 'IFCT_2017' | 'USER_CUSTOM';

export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  source: FoodSource;
  source_food_id: string | null;
  category: string;
  diet_tags: DietaryPreference[];
  allergen_tags: string[];
  region_tags?: string[];
  budget_tier?: 'budget' | 'moderate' | 'premium';
  serving_size_g: number;
  serving_label?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  is_verified: boolean;
  created_at?: string;
}

export interface FoodLogRow {
  id: string;
  user_id: string;
  food_id: string | null;
  food_name_snapshot: string;
  log_date: string;
  meal_type: MealType;
  quantity_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
  created_at: string;
}

export interface UserCustomFoodRow {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: string;
  serving_size_g: number;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  created_at: string;
}

export interface PlannedIngredient {
  foodId: string;
  foodName: string;
  source: FoodSource;
  sourceFoodId: string | null;
  category: string;
  quantityG: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  allergenTags: string[];
  substituteFoodIds: string[];
}

export interface PlannedMeal {
  id: string;
  templateId: string;
  mealType: MealType;
  name: string;
  cuisine: string;
  budgetTier: 'budget' | 'moderate';
  prepTimeMinutes: number;
  instructions: string[];
  ingredients: PlannedIngredient[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  eaten?: boolean;
}

export interface PlannedDay {
  dayIndex: number;
  dayLabel: string;
  meals: PlannedMeal[];
  totals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
}

export interface MealPlanData {
  days: PlannedDay[];
  dietaryPreference: DietaryPreference;
  excludedAllergens: string[];
  excludedFoods: string[];
  targetMacros: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  pricingNote: string;
  generatedAtIso: string;
}

export interface MealPlanRow {
  id: string;
  user_id: string;
  title: string;
  plan_date: string | null;
  plan_type: 'daily' | 'weekly';
  target_calories: number;
  plan_data: MealPlanData;
  created_at: string;
  updated_at: string;
}

export interface PlannedExercise {
  id: string;
  name: string;
  targetMuscles: string[];
  equipment: string;
  sets: number;
  reps: string;
  durationSeconds?: number;
  restSeconds: number;
  difficulty: TrainingExperience;
  instructions: string[];
  alternatives: string[];
}

export interface PlannedWorkoutDay {
  dayNumber: number;
  dayName: string;
  focus: string;
  isRestDay: boolean;
  estimatedDurationMinutes: number;
  warmup: string[];
  exercises: PlannedExercise[];
  cooldown: string[];
  progressionNote: string;
}

export interface WorkoutScheduleData {
  splitType: string;
  location: WorkoutLocation;
  daysPerWeek: number;
  sessionDurationMinutes: number;
  limitationsApplied: string[];
  safetyGuidance: string[];
  days: PlannedWorkoutDay[];
  generatedAtIso: string;
}

export interface WorkoutPlanRow {
  id: string;
  user_id: string;
  title: string;
  goal: FitnessGoal;
  difficulty: TrainingExperience;
  schedule_data: WorkoutScheduleData;
  created_at: string;
  updated_at: string;
}

export interface ExerciseLogRow {
  id: string;
  user_id: string;
  workout_log_id: string;
  exercise_name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface WorkoutLogRow {
  id: string;
  user_id: string;
  workout_plan_id: string | null;
  workout_name: string;
  workout_date: string;
  duration_minutes: number;
  notes: string | null;
  completed: boolean;
  created_at: string;
  exercise_logs?: ExerciseLogRow[];
}

export interface ProgressLogRow {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  steps: number | null;
  sleep_hours: number | null;
  water_ml: number | null;
  energy_level: number | null;
  notes: string | null;
  created_at: string;
}

export interface HabitRow {
  id: string;
  user_id: string;
  title: string;
  habit_type: HabitType;
  is_active: boolean;
  created_at: string;
}

export interface HabitLogRow {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  completed: boolean;
  created_at: string;
}

export interface GroceryItem {
  id: string;
  foodId: string | null;
  name: string;
  category: string;
  totalQuantityG: number;
  displayApproxNote: string;
  isQuantityVerified: boolean;
  purchased: boolean;
  estimatedPriceNote: string | null;
}

export interface GroceryListRow {
  id: string;
  user_id: string;
  meal_plan_id: string | null;
  title: string;
  items: GroceryItem[];
  created_at: string;
  updated_at: string;
}

export interface CalorieCalculationInput {
  dateOfBirth?: string;
  ageYears?: number;
  heightCm: number;
  weightKg: number;
  sexForCalculation: SexForCalculation | null;
  activityLevel: ActivityLevel;
  fitnessGoal: FitnessGoal;
  referenceDate?: Date;
}

export interface CalorieCalculationResult {
  ageYears: number;
  isMinor: boolean;
  bmr: number;
  tdee: number;
  maintenanceCalories: number;
  targetCalories: number;
  activityMultiplier: number;
  goalAdjustmentKcal: number;
  estimatedWeeklyEnergyDeltaKcal: number;
  uncertaintyRangeKcal: {
    low: number;
    high: number;
  };
  macros: {
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    proteinPct: number;
    carbsPct: number;
    fatPct: number;
  };
  formulaName: string;
  formulaExpression: string;
  inputsUsed: {
    ageYears: number;
    heightCm: number;
    weightKg: number;
    sexForCalculation: SexForCalculation;
    activityLevel: ActivityLevel;
    fitnessGoal: FitnessGoal;
    effectiveGoalApplied: FitnessGoal;
  };
  safetyNotices: string[];
  uncertaintyExplanation: string;
  calculatedAtIso: string;
}
