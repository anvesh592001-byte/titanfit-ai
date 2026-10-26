-- ============================================================================
-- TITANFIT AI — MIGRATION 001: INITIAL CORE SCHEMA
-- Idempotent, non-destructive DDL for Supabase PostgreSQL (PG 14+).
-- Note: gen_random_uuid() is native in PostgreSQL 13+ without external extensions.
-- ============================================================================

-- Trigger helper to automatically maintain updated_at UTC timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- A. profiles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 1 AND 120),
  date_of_birth DATE NOT NULL CHECK (date_of_birth <= CURRENT_DATE AND date_of_birth >= DATE '1905-01-01'),
  height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm BETWEEN 80 AND 260),
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 350),
  sex_for_calculation TEXT NULL CHECK (
    sex_for_calculation IS NULL OR sex_for_calculation IN ('male', 'female', 'unspecified')
  ),
  fitness_goal TEXT NOT NULL DEFAULT 'general_fitness' CHECK (
    fitness_goal IN ('fat_loss', 'muscle_gain', 'maintenance', 'recomposition', 'endurance', 'general_fitness')
  ),
  activity_level TEXT NOT NULL DEFAULT 'moderately_active' CHECK (
    activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')
  ),
  dietary_preference TEXT NOT NULL DEFAULT 'omnivore' CHECK (
    dietary_preference IN ('omnivore', 'vegetarian', 'vegan', 'eggetarian', 'pescatarian')
  ),
  preferred_units TEXT NOT NULL DEFAULT 'metric' CHECK (
    preferred_units IN ('metric', 'imperial')
  ),
  country TEXT NOT NULL DEFAULT 'IN' CHECK (char_length(trim(country)) BETWEEN 2 AND 64),
  food_budget NUMERIC(10,2) NULL CHECK (food_budget IS NULL OR food_budget >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- B. user_preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  allergies TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  excluded_foods TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  preferred_foods TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  meals_per_day INTEGER NOT NULL DEFAULT 4 CHECK (meals_per_day BETWEEN 2 AND 7),
  workout_location TEXT NOT NULL DEFAULT 'gym' CHECK (
    workout_location IN ('gym', 'home', 'outdoor', 'hybrid')
  ),
  equipment TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  training_experience TEXT NOT NULL DEFAULT 'beginner' CHECK (
    training_experience IN ('beginner', 'intermediate', 'advanced')
  ),
  workout_days_per_week INTEGER NOT NULL DEFAULT 4 CHECK (workout_days_per_week BETWEEN 1 AND 7),
  session_duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (session_duration_minutes BETWEEN 15 AND 180),
  exercise_limitations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- C. foods (Shared verified food composition catalog; admin-writable only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  brand TEXT NULL,
  source TEXT NOT NULL CHECK (source IN ('USDA_FDC', 'IFCT_2017', 'USER_CUSTOM')),
  source_food_id TEXT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  diet_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  allergen_tags TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  serving_size_g NUMERIC(8,2) NOT NULL CHECK (serving_size_g > 0 AND serving_size_g <= 2000),
  calories_per_100g NUMERIC(8,2) NOT NULL CHECK (calories_per_100g >= 0 AND calories_per_100g <= 950),
  protein_per_100g NUMERIC(8,2) NOT NULL CHECK (protein_per_100g >= 0 AND protein_per_100g <= 100),
  carbs_per_100g NUMERIC(8,2) NOT NULL CHECK (carbs_per_100g >= 0 AND carbs_per_100g <= 100),
  fat_per_100g NUMERIC(8,2) NOT NULL CHECK (fat_per_100g >= 0 AND fat_per_100g <= 100),
  fiber_per_100g NUMERIC(8,2) NULL CHECK (fiber_per_100g IS NULL OR (fiber_per_100g >= 0 AND fiber_per_100g <= 100)),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_foods_source_external_id UNIQUE (source, source_food_id)
);

CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON public.foods (lower(name));
CREATE INDEX IF NOT EXISTS idx_foods_category ON public.foods (category);

-- ----------------------------------------------------------------------------
-- C2. user_custom_foods (User-owned reusable custom food definitions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_custom_foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 200),
  brand TEXT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  serving_size_g NUMERIC(8,2) NOT NULL CHECK (serving_size_g > 0 AND serving_size_g <= 2000),
  calories_per_100g NUMERIC(8,2) NOT NULL CHECK (calories_per_100g >= 0 AND calories_per_100g <= 950),
  protein_per_100g NUMERIC(8,2) NOT NULL CHECK (protein_per_100g >= 0 AND protein_per_100g <= 100),
  carbs_per_100g NUMERIC(8,2) NOT NULL CHECK (carbs_per_100g >= 0 AND carbs_per_100g <= 100),
  fat_per_100g NUMERIC(8,2) NOT NULL CHECK (fat_per_100g >= 0 AND fat_per_100g <= 100),
  fiber_per_100g NUMERIC(8,2) NULL CHECK (fiber_per_100g IS NULL OR (fiber_per_100g >= 0 AND fiber_per_100g <= 100)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_user_custom_foods_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_custom_foods_user_id ON public.user_custom_foods(user_id);

-- ----------------------------------------------------------------------------
-- D. food_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id UUID NULL REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name_snapshot TEXT NOT NULL CHECK (char_length(trim(food_name_snapshot)) BETWEEN 1 AND 200),
  log_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  quantity_g NUMERIC(8,2) NOT NULL CHECK (quantity_g > 0 AND quantity_g <= 5000),
  calories NUMERIC(8,2) NOT NULL CHECK (calories >= 0),
  protein_g NUMERIC(8,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g NUMERIC(8,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g NUMERIC(8,2) NOT NULL CHECK (fat_g >= 0),
  fiber_g NUMERIC(8,2) NULL CHECK (fiber_g IS NULL OR fiber_g >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON public.food_logs(user_id, log_date DESC);

-- ----------------------------------------------------------------------------
-- E. meal_plans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  plan_date DATE NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('daily', 'weekly')),
  target_calories NUMERIC(8,2) NOT NULL CHECK (target_calories BETWEEN 800 AND 10000),
  plan_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_created ON public.meal_plans(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_meal_plans_updated_at ON public.meal_plans;
CREATE TRIGGER trg_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- F. workout_plans
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  goal TEXT NOT NULL CHECK (
    goal IN ('fat_loss', 'muscle_gain', 'maintenance', 'recomposition', 'endurance', 'general_fitness')
  ),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  schedule_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user_created ON public.workout_plans(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_workout_plans_updated_at ON public.workout_plans;
CREATE TRIGGER trg_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- G. workout_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id UUID NULL REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL CHECK (char_length(trim(workout_name)) BETWEEN 1 AND 160),
  workout_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0 AND duration_minutes <= 600),
  notes TEXT NULL CHECK (notes IS NULL OR char_length(notes) <= 2000),
  completed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON public.workout_logs(user_id, workout_date DESC);

-- ----------------------------------------------------------------------------
-- H. exercise_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_log_id UUID NOT NULL REFERENCES public.workout_logs(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL CHECK (char_length(trim(exercise_name)) BETWEEN 1 AND 160),
  sets INTEGER NULL CHECK (sets IS NULL OR (sets BETWEEN 1 AND 50)),
  reps INTEGER NULL CHECK (reps IS NULL OR (reps BETWEEN 1 AND 500)),
  weight_kg NUMERIC(6,2) NULL CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg <= 1000)),
  duration_seconds INTEGER NULL CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 36000)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_exercise_logs_workout_log ON public.exercise_logs(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_user_id ON public.exercise_logs(user_id);

-- ----------------------------------------------------------------------------
-- I. progress_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  weight_kg NUMERIC(5,2) NULL CHECK (weight_kg IS NULL OR (weight_kg BETWEEN 20 AND 350)),
  waist_cm NUMERIC(5,2) NULL CHECK (waist_cm IS NULL OR (waist_cm BETWEEN 35 AND 250)),
  steps INTEGER NULL CHECK (steps IS NULL OR (steps >= 0 AND steps <= 150000)),
  sleep_hours NUMERIC(4,2) NULL CHECK (sleep_hours IS NULL OR (sleep_hours >= 0 AND sleep_hours <= 24)),
  water_ml INTEGER NULL CHECK (water_ml IS NULL OR (water_ml >= 0 AND water_ml <= 15000)),
  energy_level INTEGER NULL CHECK (energy_level IS NULL OR (energy_level BETWEEN 1 AND 10)),
  notes TEXT NULL CHECK (notes IS NULL OR char_length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_progress_logs_user_date UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_progress_logs_user_date ON public.progress_logs(user_id, log_date DESC);

-- ----------------------------------------------------------------------------
-- J. habits
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  habit_type TEXT NOT NULL DEFAULT 'custom' CHECK (
    habit_type IN ('hydration', 'nutrition', 'movement', 'sleep', 'recovery', 'mindfulness', 'custom')
  ),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_habits_user_title UNIQUE (user_id, title)
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);

-- ----------------------------------------------------------------------------
-- K. habit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_habit_logs_user_habit_date UNIQUE (user_id, habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date DESC);

-- ----------------------------------------------------------------------------
-- L. grocery_lists (Persisted grocery lists derived from saved meal plans)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id UUID NULL REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_created ON public.grocery_lists(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_grocery_lists_updated_at ON public.grocery_lists;
CREATE TRIGGER trg_grocery_lists_updated_at
  BEFORE UPDATE ON public.grocery_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
