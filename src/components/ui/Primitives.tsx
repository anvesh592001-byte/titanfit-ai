import React from 'react';
import Link from 'next/link';
import { AlertCircle, Database } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/70',
        className
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/70 dark:bg-obsidian-900/50 px-6 py-10 text-center">
      {icon && (
        <div className="mb-3 rounded-xl bg-crimson-600/10 p-3 text-crimson-500">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-700 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white hover:bg-crimson-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SupabaseConfigNotice({ configured }: { configured: boolean }) {
  if (configured) return null;

  return (
    <div
      role="region"
      aria-label="Supabase Configuration Status"
      className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200"
    >
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-semibold">
            Supabase Connection Pending (.env.local Required for Auth & Persistence)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300/90">
            TitanFit AI never simulates database operations or stores fake user sessions.
            To enable account registration, login, and cross-device PostgreSQL persistence,
            copy <code className="font-mono font-semibold">.env.example</code> to{' '}
            <code className="font-mono font-semibold">.env.local</code>, add{' '}
            <code className="font-mono font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="font-mono font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            (or <code className="font-mono font-semibold">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>),
            and run the SQL migrations in <code className="font-mono font-semibold">supabase/migrations/</code>.
            Meanwhile, you can test the deterministic{' '}
            <Link href="/calculator" className="underline font-semibold hover:text-white">
              Calorie, BMR & Macro Engine
            </Link>{' '}
            right now.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-crimson-500/40 bg-crimson-950/30 p-3.5 text-sm text-crimson-700 dark:text-crimson-300"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-crimson-500" />
      <span>{message}</span>
    </div>
  );
}
