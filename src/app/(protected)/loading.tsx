import React from 'react';
import { Skeleton } from '@/components/ui/Primitives';

export default function ProtectedLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading workspace">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
