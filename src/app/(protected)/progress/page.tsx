import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import {
  fetchFoodLogsByDateRange,
  fetchHabitsAndLogs,
  fetchProgressLogs,
  fetchWorkoutLogs
} from '@/lib/db/repositories';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { ProgressAnalyticsClient } from '@/components/progress/ProgressAnalyticsClient';

export default async function ProgressPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const now = new Date();
  const todayIso = getLocalIsoDate(now);
  const start90 = new Date(now);
  start90.setDate(start90.getDate() - 90);
  const start90Iso = getLocalIsoDate(start90);

  const [progressLogs, foodLogs, workoutLogs, { habits, habitLogs }] =
    await Promise.all([
      fetchProgressLogs(supabase, user.id),
      fetchFoodLogsByDateRange(supabase, user.id, start90Iso, todayIso),
      fetchWorkoutLogs(supabase, user.id, start90Iso),
      fetchHabitsAndLogs(supabase, user.id, start90Iso, todayIso)
    ]);

  return (
    <ProgressAnalyticsClient
      todayIso={todayIso}
      initialProgressLogs={progressLogs}
      foodLogs={foodLogs}
      workoutLogs={workoutLogs}
      initialHabits={habits}
      habitLogs={habitLogs}
    />
  );
}
