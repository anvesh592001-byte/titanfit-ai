import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import {
  fetchSavedWorkoutPlans,
  fetchUserProfileAndPreferences,
  fetchWorkoutLogs
} from '@/lib/db/repositories';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { WorkoutPlannerClient } from '@/components/workouts/WorkoutPlannerClient';

export default async function WorkoutsPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const now = new Date();
  const todayIso = getLocalIsoDate(now);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 13);

  const [{ profile, preferences }, plans, recentLogs] = await Promise.all([
    fetchUserProfileAndPreferences(supabase, user.id),
    fetchSavedWorkoutPlans(supabase, user.id),
    fetchWorkoutLogs(supabase, user.id, getLocalIsoDate(twoWeeksAgo))
  ]);

  return (
    <WorkoutPlannerClient
      todayIso={todayIso}
      profile={profile}
      preferences={preferences}
      initialPlans={plans}
      recentWorkoutsCount14d={recentLogs.filter((l) => l.completed).length}
    />
  );
}
