'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MailCheck } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const initialEmail = searchParams.get('email') ?? '';
  const statusParam = searchParams.get('status');
  const messageParam = searchParams.get('message');

  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(
    statusParam === 'error' ? messageParam ?? 'Verification link failed or expired.' : null
  );
  const [loading, setLoading] = useState(false);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter the email address used during registration.');
      return;
    }

    setLoading(true);
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
          kind: 'success',
          title: 'Verification link sent',
          description: `Sent a fresh confirmation email to ${email.trim()}.`
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 shadow-card space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-crimson-600/15 text-crimson-500">
          <MailCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950 dark:text-white">
            Email Verification
          </h1>
          <p className="text-xs text-zinc-500">
            Confirm your email address to unlock protected TitanFit AI routes
          </p>
        </div>
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
        Open the verification email sent by Supabase Auth and click the confirmation
        link. If the link expired or did not arrive, request a fresh verification email below.
      </p>

      <ErrorBanner message={error} />

      <form onSubmit={handleResend} className="space-y-3">
        <label
          htmlFor="verify-email-input"
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          Account Email Address
        </label>
        <input
          id="verify-email-input"
          type="email"
          required
          placeholder="athlete@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-crimson-600 px-4 py-3 text-sm font-bold text-white hover:bg-crimson-700 disabled:opacity-50"
        >
          {loading ? 'Sending Verification Link...' : 'Resend Verification Email'}
        </button>
      </form>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 flex items-center justify-between text-xs text-zinc-500">
        <Link href="/login" className="font-semibold text-crimson-500 hover:underline">
          &larr; Back to Login
        </Link>
        <Link href="/signup" className="hover:underline">
          Register different email
        </Link>
      </div>
    </div>
  );
}
