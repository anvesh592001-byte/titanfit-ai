import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import {
  fetchSavedMealPlans,
  fetchUserProfileAndPreferences
} from '@/lib/db/repositories';
import { calculateCalorieTargets } from '@/lib/calculations/calorie-engine';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { DietPlannerClient } from '@/components/nutrition/DietPlannerClient';

export default async function NutritionPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const todayIso = getLocalIsoDate();

  const [{ profile, preferences }, savedPlans] = await Promise.all([
    fetchUserProfileAndPreferences(supabase, user.id),
    fetchSavedMealPlans(supabase, user.id)
  ]);

  const targets = profile
    ? calculateCalorieTargets({
        dateOfBirth: profile.date_of_birth,
        heightCm: profile.height_cm,
        weightKg: profile.weight_kg,
        sexForCalculation: profile.sex_for_calculation,
        activityLevel: profile.activity_level,
        fitnessGoal: profile.fitness_goal
      })
    : null;

  return (
    <DietPlannerClient
      todayIso={todayIso}
      profile={profile}
      preferences={preferences}
      targets={targets}
      initialSavedPlans={savedPlans}
    />
  );
}
