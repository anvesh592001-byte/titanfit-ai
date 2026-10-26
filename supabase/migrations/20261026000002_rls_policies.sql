-- ============================================================================
-- TITANFIT AI — MIGRATION 002: ROW LEVEL SECURITY (RLS) & LEAST-PRIVILEGE GRANTS
-- Enforces strict per-user isolation via auth.uid() across all user tables.
-- ============================================================================

-- 1. Least-Privilege Schema & Table Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Shared verified foods catalog is read-only for authenticated users; writes restricted to admin/service_role
GRANT SELECT ON public.foods TO authenticated;

-- User-owned tables allow authenticated operations strictly mediated by RLS policies
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.profiles,
  public.user_preferences,
  public.user_custom_foods,
  public.food_logs,
  public.meal_plans,
  public.workout_plans,
  public.workout_logs,
  public.exercise_logs,
  public.progress_logs,
  public.habits,
  public.habit_logs,
  public.grocery_lists
TO authenticated;

-- 2. Enable and Force Row Level Security on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_custom_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_foods FORCE ROW LEVEL SECURITY;

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans FORCE ROW LEVEL SECURITY;

ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits FORCE ROW LEVEL SECURITY;

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_lists FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Shared Catalog: public.foods (SELECT only for authenticated; no client writes)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS foods_select_authenticated ON public.foods;
CREATE POLICY foods_select_authenticated
  ON public.foods
  FOR SELECT
  TO authenticated
  USING (true);

-- ----------------------------------------------------------------------------
-- A. public.profiles (ownership via id = auth.uid())
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own
  ON public.profiles FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = id);

-- ----------------------------------------------------------------------------
-- B. public.user_preferences
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS user_preferences_select_own ON public.user_preferences;
CREATE POLICY user_preferences_select_own
  ON public.user_preferences FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_preferences_insert_own ON public.user_preferences;
CREATE POLICY user_preferences_insert_own
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_preferences_update_own ON public.user_preferences;
CREATE POLICY user_preferences_update_own
  ON public.user_preferences FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_preferences_delete_own ON public.user_preferences;
CREATE POLICY user_preferences_delete_own
  ON public.user_preferences FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- C2. public.user_custom_foods
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS user_custom_foods_select_own ON public.user_custom_foods;
CREATE POLICY user_custom_foods_select_own
  ON public.user_custom_foods FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_custom_foods_insert_own ON public.user_custom_foods;
CREATE POLICY user_custom_foods_insert_own
  ON public.user_custom_foods FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_custom_foods_update_own ON public.user_custom_foods;
CREATE POLICY user_custom_foods_update_own
  ON public.user_custom_foods FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS user_custom_foods_delete_own ON public.user_custom_foods;
CREATE POLICY user_custom_foods_delete_own
  ON public.user_custom_foods FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- D. public.food_logs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS food_logs_select_own ON public.food_logs;
CREATE POLICY food_logs_select_own
  ON public.food_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS food_logs_insert_own ON public.food_logs;
CREATE POLICY food_logs_insert_own
  ON public.food_logs FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS food_logs_update_own ON public.food_logs;
CREATE POLICY food_logs_update_own
  ON public.food_logs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS food_logs_delete_own ON public.food_logs;
CREATE POLICY food_logs_delete_own
  ON public.food_logs FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- E. public.meal_plans
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS meal_plans_select_own ON public.meal_plans;
CREATE POLICY meal_plans_select_own
  ON public.meal_plans FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS meal_plans_insert_own ON public.meal_plans;
CREATE POLICY meal_plans_insert_own
  ON public.meal_plans FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS meal_plans_update_own ON public.meal_plans;
CREATE POLICY meal_plans_update_own
  ON public.meal_plans FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS meal_plans_delete_own ON public.meal_plans;
CREATE POLICY meal_plans_delete_own
  ON public.meal_plans FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- F. public.workout_plans
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS workout_plans_select_own ON public.workout_plans;
CREATE POLICY workout_plans_select_own
  ON public.workout_plans FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS workout_plans_insert_own ON public.workout_plans;
CREATE POLICY workout_plans_insert_own
  ON public.workout_plans FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS workout_plans_update_own ON public.workout_plans;
CREATE POLICY workout_plans_update_own
  ON public.workout_plans FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS workout_plans_delete_own ON public.workout_plans;
CREATE POLICY workout_plans_delete_own
  ON public.workout_plans FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- G. public.workout_logs (also verifies workout_plan_id ownership when non-null)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS workout_logs_select_own ON public.workout_logs;
CREATE POLICY workout_logs_select_own
  ON public.workout_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS workout_logs_insert_own ON public.workout_logs;
CREATE POLICY workout_logs_insert_own
  ON public.workout_logs FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      workout_plan_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.workout_plans wp
        WHERE wp.id = workout_plan_id AND wp.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS workout_logs_update_own ON public.workout_logs;
CREATE POLICY workout_logs_update_own
  ON public.workout_logs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      workout_plan_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.workout_plans wp
        WHERE wp.id = workout_plan_id AND wp.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS workout_logs_delete_own ON public.workout_logs;
CREATE POLICY workout_logs_delete_own
  ON public.workout_logs FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- H. public.exercise_logs (also verifies parent workout_log_id belongs to user)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS exercise_logs_select_own ON public.exercise_logs;
CREATE POLICY exercise_logs_select_own
  ON public.exercise_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS exercise_logs_insert_own ON public.exercise_logs;
CREATE POLICY exercise_logs_insert_own
  ON public.exercise_logs FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_log_id AND wl.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS exercise_logs_update_own ON public.exercise_logs;
CREATE POLICY exercise_logs_update_own
  ON public.exercise_logs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.workout_logs wl
      WHERE wl.id = workout_log_id AND wl.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS exercise_logs_delete_own ON public.exercise_logs;
CREATE POLICY exercise_logs_delete_own
  ON public.exercise_logs FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- I. public.progress_logs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS progress_logs_select_own ON public.progress_logs;
CREATE POLICY progress_logs_select_own
  ON public.progress_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS progress_logs_insert_own ON public.progress_logs;
CREATE POLICY progress_logs_insert_own
  ON public.progress_logs FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS progress_logs_update_own ON public.progress_logs;
CREATE POLICY progress_logs_update_own
  ON public.progress_logs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS progress_logs_delete_own ON public.progress_logs;
CREATE POLICY progress_logs_delete_own
  ON public.progress_logs FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- J. public.habits
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS habits_select_own ON public.habits;
CREATE POLICY habits_select_own
  ON public.habits FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS habits_insert_own ON public.habits;
CREATE POLICY habits_insert_own
  ON public.habits FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS habits_update_own ON public.habits;
CREATE POLICY habits_update_own
  ON public.habits FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS habits_delete_own ON public.habits;
CREATE POLICY habits_delete_own
  ON public.habits FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- K. public.habit_logs (also verifies parent habit_id belongs to user)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS habit_logs_select_own ON public.habit_logs;
CREATE POLICY habit_logs_select_own
  ON public.habit_logs FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS habit_logs_insert_own ON public.habit_logs;
CREATE POLICY habit_logs_insert_own
  ON public.habit_logs FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS habit_logs_update_own ON public.habit_logs;
CREATE POLICY habit_logs_update_own
  ON public.habit_logs FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.habits h
      WHERE h.id = habit_id AND h.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS habit_logs_delete_own ON public.habit_logs;
CREATE POLICY habit_logs_delete_own
  ON public.habit_logs FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- L. public.grocery_lists
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS grocery_lists_select_own ON public.grocery_lists;
CREATE POLICY grocery_lists_select_own
  ON public.grocery_lists FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS grocery_lists_insert_own ON public.grocery_lists;
CREATE POLICY grocery_lists_insert_own
  ON public.grocery_lists FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND (
      meal_plan_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.meal_plans mp
        WHERE mp.id = meal_plan_id AND mp.user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS grocery_lists_update_own ON public.grocery_lists;
CREATE POLICY grocery_lists_update_own
  ON public.grocery_lists FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS grocery_lists_delete_own ON public.grocery_lists;
CREATE POLICY grocery_lists_delete_own
  ON public.grocery_lists FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
