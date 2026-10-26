import React from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-obsidian-950 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-crimson-600 text-white">
                <Flame className="h-4 w-4" />
              </div>
              <span className="text-base font-extrabold tracking-tight text-zinc-950 dark:text-white">
                TITANFIT <span className="text-crimson-500">AI</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
              Evidence-based digital fitness coaching combining deterministic energy
              mathematics, verified USDA &amp; ICMR-NIN Indian food composition tables,
              structured strength programming, and row-level secured Supabase persistence.
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              Educational wellness platform — never a substitute for licensed medical
              diagnosis, dietetics therapy, or emergency healthcare.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Platform Tools
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/calculator" className="hover:text-crimson-500 transition-colors">
                  Calorie, BMR &amp; TDEE Calculator
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-crimson-500 transition-colors">
                  Personalized Diet &amp; Workout Onboarding
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-crimson-500 transition-colors">
                  Member Sign In
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-200">
              Trust, Safety &amp; Privacy
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/privacy" className="hover:text-crimson-500 transition-colors">
                  Privacy Policy &amp; Data Handling
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy#health-disclaimer"
                  className="hover:text-crimson-500 transition-colors"
                >
                  Health &amp; Safety Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-crimson-500 transition-colors">
                  Data Export &amp; Account Deletion
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-zinc-200 dark:border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>&copy; {new Date().getFullYear()} TitanFit AI. All rights reserved.</span>
          <span>Mifflin–St Jeor Energy Engine &bull; USDA FDC &amp; ICMR-NIN IFCT 2017</span>
        </div>
      </div>
    </footer>
  );
}
