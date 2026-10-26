import React from 'react';
import { Shield, HeartPulse } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PrivacyAndDisclaimerPage() {
  const { isConfigured } = getSupabasePublicConfig();
  let isAuthenticated = false;
  if (isConfigured) {
    try {
      const supabase = createServerSupabaseClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      isAuthenticated = Boolean(user);
    } catch {
      isAuthenticated = false;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={isAuthenticated} />
      <main className="flex-1 mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-crimson-500/30 bg-crimson-600/10 px-3 py-1 text-xs font-semibold text-crimson-500">
            <Shield className="h-3.5 w-3.5" />
            Data Governance &amp; Clinical Transparency
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Privacy Policy &amp; Health Disclaimer
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Last updated: October 26, 2026. This document describes the exact technical
            data-handling and safety controls implemented in TitanFit AI without making
            unverified third-party regulatory certification claims.
          </p>
        </div>

        {/* Privacy Policy */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 space-y-5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
            1. Privacy Policy &amp; Implemented Data Handling
          </h2>

          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">
              A. Account Credentials &amp; Session Cookies
            </h3>
            <p className="mt-1">
              Passwords are never stored in TitanFit AI application tables. Authentication
              credentials, password hashing, email verification tokens, and password recovery
              flows are managed by Supabase Auth. Sessions are maintained via HTTP cookies
              refreshed through Next.js server middleware (<code className="font-mono">@supabase/ssr</code>).
            </p>
          </div>

          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">
              B. Fitness, Biometric &amp; Nutrition Records Collected
            </h3>
            <p className="mt-1">
              To calculate energy targets and personalize plans, TitanFit AI stores only the
              fields you enter: name, date of birth, height, weight, optional metabolic
              equation reference, fitness goal, activity level, dietary preference, allergies,
              food logs, saved meal/workout plans, workout set logs, daily progress metrics
              (weight, waist, steps, sleep, hydration, energy), habits, and grocery lists.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">
              C. Row Level Security (RLS) &amp; Access Controls
            </h3>
            <p className="mt-1">
              Every user-owned PostgreSQL table enforces Row Level Security (<code className="font-mono">ENABLE ROW LEVEL SECURITY</code> and <code className="font-mono">FORCE ROW LEVEL SECURITY</code>)
              restricting <code className="font-mono">SELECT</code>, <code className="font-mono">INSERT</code>,{' '}
              <code className="font-mono">UPDATE</code>, and <code className="font-mono">DELETE</code> operations to{' '}
              <code className="font-mono">auth.uid()</code>, reinforced by server-side authentication checks.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">
              D. AI Fitness Coach External Provider Processing
            </h3>
            <p className="mt-1">
              When you send a message in AI Coach and an external LLM provider is configured on
              the server, TitanFit AI sends your prompt along with minimized coaching context
              (calculated calorie/macro targets, dietary/allergy tags, workout preferences, and
              aggregated 7-day nutrition/training averages). Your email address, password, and
              other users&apos; records are never sent to the LLM provider.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-zinc-900 dark:text-white">
              E. Data Export &amp; Permanent Account Deletion
            </h3>
            <p className="mt-1">
              Authenticated users can export all stored application data as a machine-readable
              JSON bundle (<code className="font-mono">GET /api/account/export</code>) or permanently
              delete all user-owned application records (<code className="font-mono">DELETE /api/account/delete</code>)
              at any time from the Settings page.
            </p>
          </div>
        </section>

        {/* Health Disclaimer */}
        <section
          id="health-disclaimer"
          className="rounded-2xl border border-crimson-500/35 bg-white dark:bg-obsidian-900 p-6 sm:p-8 space-y-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
        >
          <div className="flex items-center gap-2.5">
            <HeartPulse className="h-5 w-5 text-crimson-500" />
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
              2. Health, Nutrition &amp; Exercise Safety Disclaimer
            </h2>
          </div>

          <p>
            <strong>Educational Purpose Only:</strong> TitanFit AI provides general fitness,
            nutrition calculation, and meal/workout organization tools for educational and
            informational purposes. It does not provide medical advice, clinical diagnosis,
            medical nutrition therapy, or treatment.
          </p>

          <p>
            <strong>Predictive Formula &amp; Food Label Variance:</strong> BMR and TDEE equations
            (such as Mifflin–St Jeor) estimate average energy expenditure and carry individual
            biological variance of roughly ±10% or more. Packaged food labels, regional crop
            differences, cooking oils, and portion estimation affect actual calorie and nutrient
            intake. No specific rate of weight loss or physique change is guaranteed.
          </p>

          <p>
            <strong>Minors, Pregnancy &amp; Medical Conditions:</strong> Adult weight-loss
            deficits are disabled for users under 18. If you are pregnant, breastfeeding,
            under 18, recovering from an eating disorder, or managing diabetes, kidney disease,
            cardiovascular conditions, orthopedic injuries, or other medical concerns, consult a
            qualified physician, physiotherapist, or registered dietitian before modifying your
            diet or exercise routine. Stop exercise immediately if you experience chest pain,
            dizziness, shortness of breath, or sharp joint pain.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
