import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import {
  fetchFoodCatalogForUser,
  fetchFoodLogsByDateRange,
  fetchUserProfileAndPreferences
} from '@/lib/db/repositories';
import { calculateCalorieTargets } from '@/lib/calculations/calorie-engine';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { FoodTrackerClient } from '@/components/nutrition/FoodTrackerClient';

export default async function FoodTrackerPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const todayIso = getLocalIsoDate();

  const [{ profile }, catalog, logs] = await Promise.all([
    fetchUserProfileAndPreferences(supabase, user.id),
    fetchFoodCatalogForUser(supabase, user.id),
    fetchFoodLogsByDateRange(supabase, user.id, todayIso, todayIso)
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
    <FoodTrackerClient
      initialDate={todayIso}
      initialLogs={logs}
      foods={catalog.foods}
      initialCustomFoods={catalog.customFoods}
      targets={targets}
    />
  );
}
