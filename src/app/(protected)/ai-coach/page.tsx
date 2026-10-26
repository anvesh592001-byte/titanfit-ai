import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { fetchUserProfileAndPreferences } from '@/lib/db/repositories';
import { calculateCalorieTargets } from '@/lib/calculations/calorie-engine';
import { getLlmRuntimeConfig } from '@/lib/ai/coach-service';
import { AiCoachClient } from '@/components/coach/AiCoachClient';

export default async function AiCoachPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const { profile, preferences } = await fetchUserProfileAndPreferences(
    supabase,
    user.id
  );
  const llm = getLlmRuntimeConfig();

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
    <AiCoachClient
      llmConfigured={llm.isConfigured}
      llmModel={llm.model}
      profile={profile}
      preferences={preferences}
      targets={targets}
    />
  );
}
