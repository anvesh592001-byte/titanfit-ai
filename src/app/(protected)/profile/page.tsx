import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { fetchUserProfileAndPreferences } from '@/lib/db/repositories';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export default async function ProfilePage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const { profile, preferences } = await fetchUserProfileAndPreferences(
    supabase,
    user.id
  );

  return (
    <OnboardingWizard
      initialProfile={profile}
      initialPreferences={preferences}
      defaultName={(user.user_metadata?.full_name as string | undefined) ?? ''}
      mode="profile"
    />
  );
}
