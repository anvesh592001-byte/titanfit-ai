import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  Dumbbell,
  Lock,
  ShoppingCart,
  Utensils
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { VerifiedFoodExplorer } from '@/components/landing/VerifiedFoodExplorer';
import { SupabaseConfigNotice } from '@/components/ui/Primitives';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
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

  const features = [
    {
      icon: Calculator,
      title: 'Deterministic Energy & Macro Math',
      description:
        'Mifflin–St Jeor BMR & TDEE equations with transparent activity multipliers, metric/imperial conversions, adolescent safety gates, and minimum calorie floors.'
    },
    {
      icon: Utensils,
      title: 'Indian & Global Diet Planner',
      description:
        'Daily & 7-day meal plans across Omnivore, Vegetarian, Vegan, Eggetarian & Pescatarian diets—featuring idli, dosa, roti, poha, dal, sambar, paneer, soya, eggs, fish & chicken with hard allergen exclusions.'
    },
    {
      icon: Dumbbell,
      title: 'Adaptive Strength & Conditioning',
      description:
        'Personalized Full-Body, Upper/Lower, and Push-Pull-Legs splits tailored to home or gym equipment, session length, joint limitations, and logged history.'
    },
    {
      icon: Activity,
      title: 'Telemetry Progress & Moving Averages',
      description:
        'Track body weight with 7-day moving averages, hydration, sleep, daily steps, workout consistency, and habits using real stored records.'
    },
    {
      icon: ShoppingCart,
      title: 'Smart Grocery Aggregation',
      description:
        'Convert any saved daily or weekly meal plan into a categorized, deduplicated shopping list separating verified gram totals from household estimates.'
    },
    {
      icon: Bot,
      title: 'Guardrailed AI Fitness Coach',
      description:
        'Server-protected coaching chat grounded in your calculated targets and verified food tables—never inventing calories or making clinical diagnoses.'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-transparent">
      <PublicHeader isAuthenticated={isAuthenticated} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800/80 py-16 sm:py-24">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[420px] w-[780px] rounded-full bg-crimson-600/15 blur-3xl"
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <SupabaseConfigNotice configured={isConfigured} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-crimson-500/35 bg-crimson-600/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-crimson-500">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Supabase RLS Secured &bull; Deterministic Nutrition &amp; Training</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.08]">
                  Precision Fitness Coaching Built on{' '}
                  <span className="text-crimson-500">Real Science &amp; Real Data.</span>
                </h1>

                <p className="max-w-2xl text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  TitanFit AI unifies deterministic BMR &amp; TDEE calculation, verified
                  ICMR-NIN Indian &amp; USDA food tracking, allergen-safe meal planning,
                  progressive strength programming, and AI coaching into one disciplined platform.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href={isAuthenticated ? '/dashboard' : '/signup'}
                    className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-6 py-3.5 text-sm font-bold text-white shadow-crimson hover:bg-crimson-700 transition-all"
                  >
                    <span>{isAuthenticated ? 'Go to Dashboard' : 'Create Athlete Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/calculator"
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-6 py-3.5 text-sm font-semibold text-zinc-900 dark:text-white hover:border-crimson-500 transition-colors"
                  >
                    <Calculator className="h-4 w-4 text-crimson-500" />
                    <span>Try Calorie &amp; Macro Calculator</span>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 max-w-lg">
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-zinc-950 dark:text-white">
                      40+
                    </p>
                    <p className="text-xs text-zinc-500">Verified USDA &amp; IFCT Foods</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-zinc-950 dark:text-white">
                      100%
                    </p>
                    <p className="text-xs text-zinc-500">Row-Level Security Isolated</p>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-crimson-500">
                      0
                    </p>
                    <p className="text-xs text-zinc-500">Simulated or Fake Metrics</p>
                  </div>
                </div>
              </div>

              {/* Telemetry Preview Card */}
              <div className="lg:col-span-5">
                <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 shadow-card space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-widest text-crimson-500">
                        Engine Architecture
                      </span>
                      <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                        How TitanFit AI Coaches Safely
                      </h2>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                      Verified Stack
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-sm">
                    {[
                      'Mifflin–St Jeor resting expenditure + transparent activity multipliers',
                      'Hard allergen & dietary preference validation before displaying or saving plans',
                      'Under-18 minor protection & minimum calorie floors against extreme deficits',
                      'Joint & injury limitation filters across home, outdoor, and gym programs',
                      'PostgreSQL Row Level Security (auth.uid()) + full JSON export & account deletion'
                    ].map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-zinc-700 dark:text-zinc-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-crimson-500" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-2xl bg-zinc-100 dark:bg-obsidian-950 p-4 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
                    Already registered?{' '}
                    <Link
                      href="/login"
                      className="font-semibold text-crimson-500 hover:underline"
                    >
                      Sign in to load your persisted plans &amp; logs &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Verified Food Explorer */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <VerifiedFoodExplorer />
        </section>

        {/* Core Platform Capabilities */}
        <section className="border-t border-zinc-200 dark:border-zinc-800/80 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-crimson-500">
                Complete Full-Stack System
              </span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
                Every Workflow Connected End to End
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                From onboarding biometrics to daily macro tracking, progressive overload logging,
                and grocery generation.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 transition-all hover:border-crimson-500/60"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-crimson-600/15 text-crimson-500">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-zinc-950 dark:text-white">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
