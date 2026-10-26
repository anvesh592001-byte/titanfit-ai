import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import {
  fetchFoodLogsByDateRange,
  fetchHabitsAndLogs,
  fetchProgressLogs,
  fetchSavedWorkoutPlans,
  fetchUserProfileAndPreferences,
  fetchWorkoutLogs
} from '@/lib/db/repositories';
import { calculateCalorieTargets } from '@/lib/calculations/calorie-engine';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { DashboardClient } from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const { supabase, user } = await requireAuthenticatedUser();

  const now = new Date();
  const todayIso = getLocalIsoDate(now);
  const sevenAgo = new Date(now);
  sevenAgo.setDate(sevenAgo.getDate() - 6);
  const start7Iso = getLocalIsoDate(sevenAgo);

  const [
    { profile },
    foodLogs7,
    workoutPlans,
    workoutLogsToday,
    recentProgress,
    { habits, habitLogs }
  ] = await Promise.all([
    fetchUserProfileAndPreferences(supabase, user.id),
    fetchFoodLogsByDateRange(supabase, user.id, start7Iso, todayIso),
    fetchSavedWorkoutPlans(supabase, user.id),
    fetchWorkoutLogs(supabase, user.id, todayIso),
    fetchProgressLogs(supabase, user.id, start7Iso, todayIso),
    fetchHabitsAndLogs(supabase, user.id, todayIso, todayIso)
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

  const todayFoodLogs = foodLogs7.filter((l) => l.log_date === todayIso);

  const weeklyCalorieSeries: Array<{ date: string; calories: number; proteinG: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const iso = getLocalIsoDate(d);
    const dayLogs = foodLogs7.filter((l) => l.log_date === iso);
    weeklyCalorieSeries.push({
      date: iso.slice(5),
      calories: Math.round(dayLogs.reduce((a, b) => a + b.calories, 0)),
      proteinG: Math.round(dayLogs.reduce((a, b) => a + b.protein_g, 0))
    });
  }

  // Match today's weekday against latest saved workout plan
  const jsDay = now.getDay(); // 0=Sun..6=Sat -> convert to 1=Mon..7=Sun
  const dayNumber = jsDay === 0 ? 7 : jsDay;
  const activePlan = workoutPlans[0] ?? null;
  const todaysPlannedWorkout =
    activePlan?.schedule_data?.days?.find((d) => d.dayNumber === dayNumber) ?? null;

  const todayProgress = recentProgress.find((p) => p.log_date === todayIso) ?? null;

  return (
    <DashboardClient
      todayIso={todayIso}
      profile={profile}
      targets={targets}
      todayFoodLogs={todayFoodLogs}
      weeklyCalorieSeries={weeklyCalorieSeries}
      todaysPlannedWorkout={todaysPlannedWorkout}
      todayWorkoutLogs={workoutLogsToday.filter((w) => w.workout_date === todayIso)}
      todayProgress={todayProgress}
      recentProgress={recentProgress}
      habits={habits.filter((h) => h.is_active)}
      todayHabitLogs={habitLogs}
    />
  );
}
