'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4 text-center">
      <AlertCircle className="h-10 w-10 text-crimson-500 mb-3" />
      <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        {error.message || 'An unexpected error occurred while rendering this view.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl bg-crimson-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-crimson-700"
      >
        Try Again
      </button>
    </div>
  );
}
