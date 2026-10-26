import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-transparent px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-crimson-600 text-white shadow-crimson mb-4">
        <Flame className="h-6 w-6" />
      </div>
      <h1 className="text-3xl font-extrabold text-zinc-950 dark:text-white">
        404 — Route Not Found
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        The page you requested does not exist or has moved.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-xl bg-crimson-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-crimson-700"
        >
          Back to Home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-semibold"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
