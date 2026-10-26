import React, { Suspense } from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { LoginForm } from '@/components/auth/LoginForm';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { Skeleton } from '@/components/ui/Primitives';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const { isConfigured } = getSupabasePublicConfig();

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={false} />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <LoginForm supabaseConfigured={isConfigured} />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
