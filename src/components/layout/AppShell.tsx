'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  Calculator,
  ClipboardList,
  Dumbbell,
  Flame,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  User as UserIcon,
  Utensils,
  X
} from 'lucide-react';
import { ThemeToggleButton } from '@/components/ui/ThemeProvider';
import { useToast } from '@/components/ui/ToastProvider';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/nutrition', label: 'Nutrition', icon: Utensils },
  { href: '/food-tracker', label: 'Food Tracker', icon: ClipboardList },
  { href: '/calculator', label: 'Calorie Engine', icon: Calculator },
  { href: '/workouts', label: 'Workout Plans', icon: Dumbbell },
  { href: '/workout-history', label: 'Workout History', icon: History },
  { href: '/ai-coach', label: 'AI Coach', icon: Bot },
  { href: '/progress', label: 'Progress', icon: Activity },
  { href: '/grocery-list', label: 'Grocery List', icon: ShoppingCart },
  { href: '/profile', label: 'Profile', icon: UserIcon },
  { href: '/settings', label: 'Settings', icon: Settings }
];

export function AppShell({
  userEmail,
  userName,
  children
}: {
  userEmail?: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      pushToast({
        kind: 'info',
        title: 'Signed out',
        description: 'Your session has been securely closed.'
      });
      router.push('/login');
      router.refresh();
    } catch {
      pushToast({
        kind: 'error',
        title: 'Sign-out failed',
        description: 'Please refresh and try again.'
      });
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-900 dark:text-zinc-100 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-white/70 dark:border-white/10 bg-white/70 dark:bg-obsidian-900/60 backdrop-blur-xl z-30 shadow-[1px_0_40px_-24px_rgba(124,58,237,0.6)]">
        <div className="flex h-16 items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800/80">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 via-crimson-600 to-violet-600 text-white shadow-crimson">
              <Flame className="h-4 w-4" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-zinc-950 dark:text-white">
              TITANFIT <span className="grad-text">AI</span>
            </span>
          </Link>
          <ThemeToggleButton />
        </div>

        <nav
          aria-label="Workspace navigation"
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-crimson-600 text-white shadow-crimson ring-1 ring-white/25'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-white/10 hover:text-zinc-950 dark:hover:text-white hover:shadow-[0_0_0_1px_rgba(124,58,237,0.28)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-4">
          <div className="mb-3 truncate">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
              {userName || 'TitanFit Athlete'}
            </p>
            {userEmail && (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {userEmail}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-crimson-600 hover:text-crimson-500 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white dark:bg-obsidian-900 border-r border-zinc-200 dark:border-zinc-800">
            <div className="flex h-16 items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-base font-extrabold text-zinc-950 dark:text-white">
                TITANFIT <span className="grad-text">AI</span>
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-zinc-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                      active
                        ? 'bg-crimson-600 text-white'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
              <button
                type="button"
                disabled={signingOut}
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 px-3 py-2.5 text-xs font-semibold text-white"
              >
                <LogOut className="h-4 w-4" />
                <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/60 dark:border-white/10 bg-white/75 dark:bg-obsidian-950/75 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-lg border border-zinc-300 dark:border-zinc-800 p-2 text-zinc-700 dark:text-zinc-200"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-crimson-500" />
            <span className="text-sm font-extrabold tracking-tight">
              TITANFIT <span className="grad-text">AI</span>
            </span>
          </Link>
          <ThemeToggleButton />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
