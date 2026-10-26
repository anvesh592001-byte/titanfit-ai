'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { resetPasswordSchema } from '@/lib/validation/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { pushToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateErr } = await supabase.auth.updateUser({
        password: parsed.data.password
      });

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      pushToast({
        kind: 'success',
        title: 'Password updated',
        description: 'Your new password is now active.'
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={false} />
      <main className="flex-1 mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 shadow-card space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-crimson-600/15 text-crimson-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
                Set New Password
              </h1>
              <p className="text-xs text-zinc-500">
                Choose a strong password (min 8 characters with letters &amp; numbers)
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <ErrorBanner message={error} />

            <div>
              <label
                htmlFor="reset-password"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                New Password
              </label>
              <input
                id="reset-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="reset-confirm"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="reset-confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-crimson-600 px-4 py-3 text-sm font-bold text-white hover:bg-crimson-700 disabled:opacity-50"
            >
              {loading ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500">
            Need a new reset email?{' '}
            <Link href="/forgot-password" className="font-semibold text-crimson-500 hover:underline">
              Request recovery link
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
