'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Menu, X } from 'lucide-react';
import { ThemeToggleButton } from '@/components/ui/ThemeProvider';

export function PublicHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Platform' },
    { href: '/calculator', label: 'Calorie & Macro Engine' },
    { href: '/privacy', label: 'Privacy & Safety' }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/85 dark:bg-obsidian-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-crimson-600 text-white shadow-crimson transition-transform group-hover:scale-105">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-extrabold tracking-tight text-zinc-950 dark:text-white">
              TITANFIT <span className="text-crimson-500">AI</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Precision Coaching
            </span>
          </div>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7"
        >
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? 'text-crimson-600 dark:text-crimson-400'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggleButton />
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-700 transition-colors"
            >
              Open Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-zinc-300 dark:border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:border-crimson-600 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white shadow-crimson hover:bg-crimson-700 transition-colors"
              >
                Start Coaching
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 p-2 text-zinc-700 dark:text-zinc-200"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg bg-crimson-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-center text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-crimson-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                  >
                    Start Coaching
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
