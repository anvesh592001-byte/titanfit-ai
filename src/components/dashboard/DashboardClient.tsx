'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Bot,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Dumbbell,
  Footprints,
  Moon,
  Plus,
  Sparkles,
  Utensils
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type {
  CalorieCalculationResult,
  FoodLogRow,
  HabitLogRow,
  HabitRow,
  PlannedWorkoutDay,
  ProfileRow,
  ProgressLogRow,
  WorkoutLogRow
} from '@/types/domain';
import { aggregateFoodLogs } from '@/lib/nutrition/nutrition-engine';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface DashboardClientProps {
  todayIso: string;
  profile: ProfileRow | null;
  targets: CalorieCalculationResult | null;
  todayFoodLogs: FoodLogRow[];
  weeklyCalorieSeries: Array<{ date: string; calories: number; proteinG: number }>;
  todaysPlannedWorkout: PlannedWorkoutDay | null;
  todayWorkoutLogs: WorkoutLogRow[];
  todayProgress: ProgressLogRow | null;
  recentProgress: ProgressLogRow[];
  habits: HabitRow[];
  todayHabitLogs: HabitLogRow[];
}

export function DashboardClient({
  todayIso,
  profile,
  targets,
  todayFoodLogs,
  weeklyCalorieSeries,
  todaysPlannedWorkout,
  todayWorkoutLogs,
  todayProgress,
  recentProgress,
  habits,
  todayHabitLogs
}: DashboardClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [waterMl, setWaterMl] = useState<number>(todayProgress?.water_ml ?? 0);
  const [steps, setSteps] = useState<number>(todayProgress?.steps ?? 0);
  const [sleepHours, setSleepHours] = useState<number>(todayProgress?.sleep_hours ?? 0);
  const [savingVitals, setSavingVitals] = useState(false);

  const [habitStates, setHabitStates] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const hl of todayHabitLogs) {
      map[hl.habit_id] = hl.completed;
    }
    return map;
  });

  const nutritionAgg = aggregateFoodLogs(
    todayFoodLogs,
    targets
      ? {
          calories: targets.targetCalories,
          proteinG: targets.macros.proteinG,
          carbsG: targets.macros.carbsG,
          fatG: targets.macros.fatG,
          fiberG: targets.macros.fiberG
        }
      : null
  );

  const saveQuickVitals = async (overrides?: {
    water_ml?: number;
    steps?: number;
    sleep_hours?: number;
  }) => {
    setSavingVitals(true);
    const nextWater = overrides?.water_ml ?? waterMl;
    const nextSteps = overrides?.steps ?? steps;
    const nextSleep = overrides?.sleep_hours ?? sleepHours;

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: todayIso,
          water_ml: nextWater,
          steps: nextSteps,
          sleep_hours: nextSleep
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update daily metrics.');

      setWaterMl(nextWater);
      setSteps(nextSteps);
      setSleepHours(nextSleep);
      pushToast({
        kind: 'success',
        title: 'Daily metrics saved',
        description: 'Hydration, steps & sleep persisted to Supabase.'
      });
      router.refresh();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Save failed.'
      });
    } finally {
      setSavingVitals(false);
    }
  };

  const toggleHabit = async (habitId: string) => {
    const nextVal = !habitStates[habitId];
    setHabitStates((prev) => ({ ...prev, [habitId]: nextVal }));

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle',
          data: {
            habit_id: habitId,
            log_date: todayIso,
            completed: nextVal
          }
        })
      });
      if (!res.ok) {
        throw new Error('Failed to update habit');
      }
      router.refresh();
    } catch {
      setHabitStates((prev) => ({ ...prev, [habitId]: !nextVal }));
      pushToast({
        kind: 'error',
        title: 'Habit update failed',
        description: 'Could not save habit completion.'
      });
    }
  };

  const formattedDate = new Date(`${todayIso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const hasAnyWeeklyNutrition = weeklyCalorieSeries.some((d) => d.calories > 0);
  const completedHabitsCount = habits.filter((h) => habitStates[h.id]).length;

  return (
    <div className="space-y-7">
      {/* Greeting & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-crimson-500">
            {formattedDate}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Welcome back, {profile?.full_name || 'Athlete'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Live telemetry calculated strictly from your authenticated Supabase logs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/food-tracker"
            className="inline-flex items-center gap-1.5 rounded-xl bg-crimson-600 px-4 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700"
          >
            <Plus className="h-4 w-4" />
            Log Food
          </Link>
          <Link
            href="/workouts"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-4 py-2.5 text-xs font-semibold hover:border-crimson-500"
          >
            <Dumbbell className="h-4 w-4 text-crimson-500" />
            Workouts
          </Link>
          <Link
            href="/nutrition"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-4 py-2.5 text-xs font-semibold hover:border-crimson-500"
          >
            <Utensils className="h-4 w-4 text-crimson-500" />
            Diet Plan
          </Link>
          <Link
            href="/ai-coach"
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-4 py-2.5 text-xs font-semibold hover:border-crimson-500"
          >
            <Bot className="h-4 w-4 text-crimson-500" />
            AI Coach
          </Link>
        </div>
      </div>

      {/* Incomplete Onboarding Banner (no redirect loops!) */}
      {!profile && (
        <div className="rounded-2xl border-2 border-crimson-600 bg-crimson-600/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-6 w-6 shrink-0 text-crimson-500 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Complete Onboarding to Unlock Personalized Calorie &amp; Macro Targets
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Set your height, weight, dietary preferences, allergies, and training schedule
                in under 60 seconds.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700"
          >
            Complete Onboarding &rarr;
          </Link>
        </div>
      )}

      {/* Calorie & Macro Rings */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Today&apos;s Energy &amp; Macronutrient Intake
            </h2>
            <p className="text-xs text-zinc-500">
              {targets
                ? `Remaining today: ${nutritionAgg.remaining?.calories ?? 0} kcal | Protein remaining: ${nutritionAgg.remaining?.proteinG ?? 0}g`
                : 'Complete onboarding to compare intake against personalized targets'}
            </p>
          </div>
          <Link
            href="/food-tracker"
            className="text-xs font-semibold text-crimson-500 hover:underline"
          >
            Open Food Tracker &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <ProgressRing
            value={nutritionAgg.totals.calories}
            max={targets?.targetCalories ?? Math.max(2000, nutritionAgg.totals.calories)}
            label="Calories"
            unit=" kcal"
            accentColor="#dc2626"
          />
          <ProgressRing
            value={nutritionAgg.totals.proteinG}
            max={targets?.macros.proteinG ?? 140}
            label="Protein"
            unit="g"
            accentColor="#ef4444"
          />
          <ProgressRing
            value={nutritionAgg.totals.carbsG}
            max={targets?.macros.carbsG ?? 220}
            label="Carbs"
            unit="g"
            accentColor="#3b82f6"
          />
          <ProgressRing
            value={nutritionAgg.totals.fatG}
            max={targets?.macros.fatG ?? 65}
            label="Fats"
            unit="g"
            accentColor="#f59e0b"
          />
        </div>
      </section>

      {/* Vitals (Water, Steps, Sleep) + Habits + Today's Workout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hydration, Steps & Sleep Quick Tracker */}
        <section className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Water, Steps &amp; Sleep Today
            </h2>
            <span className="text-xs text-zinc-500">Live Supabase Sync</span>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Droplets className="h-5 w-5 text-sky-400" />
              <div>
                <p className="text-xs font-semibold text-zinc-500">Hydration</p>
                <p className="text-lg font-extrabold tabular-nums">{waterMl} ml</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={savingVitals}
                onClick={() => saveQuickVitals({ water_ml: waterMl + 250 })}
                className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-500 hover:bg-sky-500/25"
              >
                +250 ml
              </button>
              <button
                type="button"
                disabled={savingVitals}
                onClick={() => saveQuickVitals({ water_ml: waterMl + 500 })}
                className="rounded-lg bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-500 hover:bg-sky-500/25"
              >
                +500 ml
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                <Footprints className="h-3.5 w-3.5 text-emerald-500" />
                Steps Today
              </label>
              <input
                type="number"
                min={0}
                max={150000}
                value={steps}
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mb-1">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                Sleep (Hours)
              </label>
              <input
                type="number"
                min={0}
                max={24}
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={savingVitals}
            onClick={() => saveQuickVitals()}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-bold hover:border-crimson-500 disabled:opacity-50"
          >
            {savingVitals ? 'Saving...' : 'Save Steps & Sleep'}
          </button>
        </section>

        {/* Today's Workout */}
        <section className="lg:col-span-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Today&apos;s Training
              </h2>
              {todayWorkoutLogs.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed ({todayWorkoutLogs.length})
                </span>
              ) : (
                <span className="text-xs text-zinc-500">Pending</span>
              )}
            </div>

            {todaysPlannedWorkout ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-bold text-crimson-500">
                  {todaysPlannedWorkout.dayName}: {todaysPlannedWorkout.focus}
                </p>
                <p className="text-xs text-zinc-500">
                  {todaysPlannedWorkout.isRestDay
                    ? 'Active recovery day scheduled.'
                    : `${todaysPlannedWorkout.exercises.length} exercises • ~${todaysPlannedWorkout.estimatedDurationMinutes} min`}
                </p>
                {!todaysPlannedWorkout.isRestDay && (
                  <ul className="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {todaysPlannedWorkout.exercises.slice(0, 4).map((ex) => (
                      <li key={ex.id} className="truncate">
                        &bull; {ex.name} ({ex.sets} &times; {ex.reps})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
                No active workout plan saved yet. Generate a customized gym or home
                split in Workout Plans.
              </p>
            )}
          </div>

          <Link
            href="/workouts"
            className="block w-full rounded-xl bg-crimson-600 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-crimson-700"
          >
            {todaysPlannedWorkout ? 'Open Workout & Log Sets' : 'Generate Workout Plan'}
          </Link>
        </section>

        {/* Daily Habits */}
        <section className="lg:col-span-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Daily Habits
            </h2>
            <span className="text-xs font-bold tabular-nums text-crimson-500">
              {completedHabitsCount}/{habits.length}
            </span>
          </div>

          {habits.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Complete onboarding or visit Progress to configure daily habits.
            </p>
          ) : (
            <div className="space-y-2">
              {habits.map((h) => {
                const done = Boolean(habitStates[h.id]);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleHabit(h.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      done
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className={done ? 'line-through' : ''}>{h.title}</span>
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${
                        done ? 'text-emerald-500' : 'text-zinc-500/40'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Today's Food Logs + 7-Day Real Stored Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-950 dark:text-white">
              Today&apos;s Logged Foods
            </h2>
            <span className="text-xs text-zinc-500">{todayFoodLogs.length} items</span>
          </div>

          {todayFoodLogs.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-5 w-5" />}
              title="No foods logged today"
              description="Log breakfast, lunch, dinner, or snacks in the Food Tracker to populate your real-time totals."
              actionLabel="Log First Meal"
              actionHref="/food-tracker"
            />
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {todayFoodLogs.slice(0, 6).map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white">
                      {item.food_name_snapshot}
                    </p>
                    <p className="text-zinc-500 capitalize">
                      {item.meal_type} &bull; {item.quantity_g}g
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-bold text-crimson-500">{Math.round(item.calories)} kcal</p>
                    <p className="text-zinc-500">P {item.protein_g}g</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                7-Day Calorie Trend (Actual Stored Logs)
              </h2>
              <p className="text-xs text-zinc-500">
                Recent weight entries recorded: {recentProgress.filter((p) => p.weight_kg !== null).length}
              </p>
            </div>
            <Link
              href="/progress"
              className="text-xs font-semibold text-crimson-500 hover:underline"
            >
              Full Analytics &rarr;
            </Link>
          </div>

          {!hasAnyWeeklyNutrition ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title="No 7-day nutrition logs yet"
              description="TitanFit AI never generates fake chart numbers. As you log meals across days, your weekly trend chart renders automatically."
              actionLabel="Go to Food Tracker"
              actionHref="/food-tracker"
            />
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyCalorieSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717a" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111117',
                      borderColor: '#272732',
                      borderRadius: '12px',
                      color: '#fafafa',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="calories" fill="#dc2626" radius={[6, 6, 0, 0]} name="Calories (kcal)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
