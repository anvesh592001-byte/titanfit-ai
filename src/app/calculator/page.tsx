import React from 'react';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchUserProfileAndPreferences } from '@/lib/db/repositories';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { AppShell } from '@/components/layout/AppShell';
import { CalorieCalculatorClient } from '@/components/calculator/CalorieCalculatorClient';
import type { ProfileRow } from '@/types/domain';

export const dynamic = 'force-dynamic';

export default async function CalculatorPage() {
  const { isConfigured } = getSupabasePublicConfig();
  let isAuthenticated = false;
  let userEmail: string | undefined;
  let profile: ProfileRow | null = null;

  if (isConfigured) {
    try {
      const supabase = createServerSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (user) {
        isAuthenticated = true;
        userEmail = user.email;
        const data = await fetchUserProfileAndPreferences(supabase, user.id);
        profile = data.profile;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  if (isAuthenticated) {
    return (
      <AppShell userEmail={userEmail} userName={profile?.full_name}>
        <CalorieCalculatorClient
          initialProfile={profile}
          isAuthenticated={true}
        />
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={false} />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CalorieCalculatorClient initialProfile={null} isAuthenticated={false} />
      </main>
      <PublicFooter />
    </div>
  );
}
