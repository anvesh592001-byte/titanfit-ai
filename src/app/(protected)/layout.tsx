import React from 'react';
import { redirect } from 'next/navigation';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchUserProfileAndPreferences } from '@/lib/db/repositories';
import { AppShell } from '@/components/layout/AppShell';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { isConfigured } = getSupabasePublicConfig();
  if (!isConfigured) {
    redirect('/login');
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  let fullName = (user.user_metadata?.full_name as string | undefined) ?? '';
  try {
    const { profile } = await fetchUserProfileAndPreferences(supabase, user.id);
    if (profile?.full_name) {
      fullName = profile.full_name;
    }
  } catch {
    // Allow page to surface helpful setup or onboarding prompt if tables aren't migrated yet
  }

  return (
    <AppShell userEmail={user.email} userName={fullName}>
      {children}
    </AppShell>
  );
}
