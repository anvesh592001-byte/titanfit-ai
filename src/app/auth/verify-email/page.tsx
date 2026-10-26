import React, { Suspense } from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { VerifyEmailClient } from '@/components/auth/VerifyEmailClient';
import { Skeleton } from '@/components/ui/Primitives';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={false} />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <VerifyEmailClient />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}
