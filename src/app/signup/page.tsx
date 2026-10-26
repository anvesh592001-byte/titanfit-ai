import React from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { SignupForm } from '@/components/auth/SignupForm';
import { getSupabasePublicConfig } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  const { isConfigured } = getSupabasePublicConfig();

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={false} />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
        <SignupForm supabaseConfigured={isConfigured} />
      </main>
      <PublicFooter />
    </div>
  );
}
