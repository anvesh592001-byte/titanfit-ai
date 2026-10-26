'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, MailCheck, UserPlus } from 'lucide-react';
import { signUpSchema } from '@/lib/validation/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ErrorBanner, SupabaseConfigNotice } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export function SignupForm({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = signUpSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      acceptDisclaimer
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please fix the highlighted fields.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const callbackUrl = `${window.location.origin}/auth/callback?next=/onboarding`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: parsed.data.fullName
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Supabase email-confirmation behavior: session is null until email is confirmed
      if (data.user && !data.session) {
        setAwaitingEmailConfirmation(true);
        pushToast({
          kind: 'success',
          title: 'Verification email sent',
          description: 'Confirm your email link to activate your TitanFit AI account.'
        });
        return;
      }

      if (data.session) {
        pushToast({
          kind: 'success',
          title: 'Account created',
          description: 'Proceeding to your personalized onboarding.'
        });
        router.push('/onboarding');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
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
          title: 'Confirmation email resent',
          description: `Sent to ${email.trim()}`
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend confirmation.');
    } finally {
      setResending(false);
    }
  };

  if (awaitingEmailConfirmation) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-8 text-center space-y-5 shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
          <MailCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
          Verify Your Email Address
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          We sent a verification link to <strong className="text-zinc-900 dark:text-white">{email}</strong>.
          Click the confirmation link in your email to activate your session and launch
          onboarding.
        </p>
        <ErrorBanner message={error} />
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            disabled={resending}
            onClick={handleResend}
            className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:border-crimson-500 disabled:opacity-50"
          >
            {resending ? 'Resending...' : 'Resend Confirmation Email'}
          </button>
          <Link
            href="/login"
            className="rounded-xl bg-crimson-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-crimson-700"
          >
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SupabaseConfigNotice configured={supabaseConfigured} />

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 shadow-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-crimson-600/15 text-crimson-500">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
              Create Your Athlete Account
            </h1>
            <p className="text-xs text-zinc-500">
              Secured by Supabase Auth &amp; Row-Level Isolated PostgreSQL
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <ErrorBanner message={error} />

          <div>
            <label
              htmlFor="signup-name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Full Name
            </label>
            <input
              id="signup-name"
              type="text"
              required
              autoComplete="name"
              placeholder="Aarav Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Email Address
            </label>
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              placeholder="athlete@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Password (min 8 chars + number)
              </label>
              <input
                id="signup-password"
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
                htmlFor="signup-confirm"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="signup-confirm"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-1 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptDisclaimer}
              onChange={(e) => setAcceptDisclaimer(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-400 text-crimson-600 focus:ring-crimson-600"
            />
            <span>
              I acknowledge the{' '}
              <Link href="/privacy" className="text-crimson-500 underline">
                Privacy Policy &amp; Health Disclaimer
              </Link>{' '}
              and understand TitanFit AI provides educational fitness guidance rather than
              medical advice.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-crimson-600 px-4 py-3 text-sm font-bold text-white shadow-crimson hover:bg-crimson-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Email verification supported
          </span>
          <span>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-crimson-500 hover:underline">
              Log In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}
