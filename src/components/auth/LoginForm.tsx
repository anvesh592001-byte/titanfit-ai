'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, MailWarning } from 'lucide-react';
import { loginSchema } from '@/lib/validation/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { sanitizeRedirectPath } from '@/lib/security/sanitize';
import { ErrorBanner, SupabaseConfigNotice } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export function LoginForm({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const redirectTo = sanitizeRedirectPath(searchParams.get('redirectTo'), '/dashboard');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnverifiedEmail(false);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password
      });

      if (signInErr) {
        if (/email not confirmed/i.test(signInErr.message)) {
          setUnverifiedEmail(true);
        }
        setError(signInErr.message);
        return;
      }

      if (data.user && !data.user.email_confirmed_at && !data.user.confirmed_at) {
        setUnverifiedEmail(true);
        router.push(`/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
        return;
      }

      pushToast({
        kind: 'success',
        title: 'Welcome back',
        description: 'Session authenticated.'
      });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`
        }
      });
      if (resendErr) {
        setError(resendErr.message);
      } else {
        pushToast({
          kind: 'info',
          title: 'Verification email sent',
          description: `Check ${email.trim()} for the confirmation link.`
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend verification.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <SupabaseConfigNotice configured={supabaseConfigured} />

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-crimson-600/15 text-crimson-500">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
              Sign In to TitanFit AI
            </h1>
            <p className="text-xs text-zinc-500">
              Load your persisted nutrition targets, workouts &amp; analytics
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <ErrorBanner message={error} />

          {unverifiedEmail && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <MailWarning className="h-4 w-4 text-amber-500" />
                <span>Your email address has not been confirmed yet.</span>
              </div>
              <button
                type="button"
                disabled={resending}
                onClick={handleResendVerification}
                className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white hover:bg-amber-700"
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="athlete@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-crimson-500 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-crimson-600 px-4 py-3 text-sm font-bold text-white shadow-crimson hover:bg-crimson-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-center text-xs text-zinc-500">
          New to TitanFit AI?{' '}
          <Link href="/signup" className="font-semibold text-crimson-500 hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
