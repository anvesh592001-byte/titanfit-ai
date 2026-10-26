'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KeyRound } from 'lucide-react';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export default function ForgotPasswordPage() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
        }
      );

      if (resetErr) {
        setError(resetErr.message);
        return;
      }

      setSent(true);
      pushToast({
        kind: 'success',
        title: 'Recovery instructions sent',
        description: 'Check your email for the password reset link.'
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send recovery email.');
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
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
                Recover Password
              </h1>
              <p className="text-xs text-zinc-500">
                Receive a one-time Supabase recovery link via email
              </p>
            </div>
          </div>

          {sent ? (
            <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
              If an account exists for <strong>{email}</strong>, a password reset link has
              been dispatched. Follow the link in your inbox to set a new password.
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <ErrorBanner message={error} />
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Account Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="athlete@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-crimson-600 px-4 py-3 text-sm font-bold text-white hover:bg-crimson-700 disabled:opacity-50"
              >
                {loading ? 'Sending Recovery Link...' : 'Send Recovery Link'}
              </button>
            </form>
          )}

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500">
            <Link href="/login" className="font-semibold text-crimson-500 hover:underline">
              &larr; Return to Sign In
            </Link>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
