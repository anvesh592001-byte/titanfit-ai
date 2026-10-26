'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Download,
  KeyRound,
  Shield,
  Trash2
} from 'lucide-react';
import { resetPasswordSchema } from '@/lib/validation/schemas';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/ui/ThemeProvider';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export function SettingsClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { pushToast } = useToast();

  // Password update
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Account deletion
  const [confirmationText, setConfirmationText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    const parsed = resetPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword
    });
    if (!parsed.success) {
      setPwError(parsed.error.issues[0]?.message ?? 'Invalid password.');
      return;
    }

    setPwLoading(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password
      });
      if (error) {
        setPwError(error.message);
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      pushToast({
        kind: 'success',
        title: 'Password updated',
        description: 'Your Supabase Auth password has been updated.'
      });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleExportData = () => {
    window.location.href = '/api/account/export';
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (confirmationText !== 'DELETE MY ACCOUNT') {
      setDeleteError('Type DELETE MY ACCOUNT in uppercase to confirm permanent deletion.');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationText })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Account deletion failed.');
      }

      pushToast({
        kind: 'info',
        title: 'Account & Data Deleted',
        description: json.message
      });
      router.push('/');
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unable to delete account.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
          Account &amp; Security Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your appearance, authentication password, JSON data portability, and permanent
          account deletion.
        </p>
      </div>

      {/* Account Overview & Theme */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Authenticated Email
            </p>
            <p className="mt-0.5 text-sm font-bold text-zinc-950 dark:text-white">
              {userEmail}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold hover:border-crimson-500"
            >
              Theme: {theme === 'dark' ? 'Obsidian Dark' : 'Clean Light'} (Switch)
            </button>
            <Link
              href="/profile"
              className="rounded-xl bg-crimson-600 px-4 py-2 text-xs font-bold text-white hover:bg-crimson-700"
            >
              Edit Fitness Profile
            </Link>
          </div>
        </div>
      </section>

      {/* Change Password */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-crimson-500" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">
            Change Password
          </h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <ErrorBanner message={pwError} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                placeholder="Min 8 chars + number"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="rounded-xl bg-zinc-900 dark:bg-zinc-100 px-4 py-2.5 text-xs font-bold text-white dark:text-zinc-950 disabled:opacity-50"
          >
            {pwLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </section>

      {/* Data Export & Privacy */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-500" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">
            Data Portability &amp; Privacy
          </h2>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Download a complete machine-readable JSON export of your profile, preferences,
          food logs, meal plans, workout plans, exercise sets, progress logs, habits, and
          grocery lists. Review our{' '}
          <Link href="/privacy" className="text-crimson-500 underline">
            Privacy Policy &amp; Health Disclaimer
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={handleExportData}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-xs font-bold hover:border-crimson-500"
        >
          <Download className="h-4 w-4 text-crimson-500" />
          Export All My Data (.json)
        </button>
      </section>

      {/* Danger Zone: Account Deletion */}
      <section className="rounded-2xl border border-crimson-500/45 bg-crimson-950/10 p-6 space-y-4">
        <div className="flex items-center gap-2 text-crimson-500">
          <Trash2 className="h-4 w-4" />
          <h2 className="text-base font-bold">Permanent Account &amp; Data Deletion</h2>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          This permanently deletes all your stored profiles, preferences, logs, plans,
          analytics, and grocery lists from Supabase and terminates your session. This
          action cannot be undone.
        </p>

        <form onSubmit={handleDeleteAccount} className="space-y-3">
          <ErrorBanner message={deleteError} />
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">
              Type <code className="font-mono font-bold text-crimson-500">DELETE MY ACCOUNT</code>{' '}
              to confirm:
            </label>
            <input
              type="text"
              placeholder="DELETE MY ACCOUNT"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-crimson-500/40 bg-white dark:bg-obsidian-950 px-3.5 py-2 text-xs font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={deleting || confirmationText !== 'DELETE MY ACCOUNT'}
            className="rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-crimson-700 disabled:opacity-40"
          >
            {deleting ? 'Deleting Account Data...' : 'Permanently Delete My Account'}
          </button>
        </form>
      </section>
    </div>
  );
}
