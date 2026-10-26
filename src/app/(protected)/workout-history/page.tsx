import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { fetchWorkoutLogs } from '@/lib/db/repositories';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { WorkoutHistoryClient } from '@/components/workouts/WorkoutHistoryClient';

export default async function WorkoutHistoryPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const todayIso = getLocalIsoDate();
  const logs = await fetchWorkoutLogs(supabase, user.id);

  return <WorkoutHistoryClient todayIso={todayIso} initialLogs={logs} />;
}
