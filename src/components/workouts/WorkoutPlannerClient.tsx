'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Dumbbell,
  History,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2
} from 'lucide-react';
import type {
  FitnessGoal,
  PlannedWorkoutDay,
  ProfileRow,
  TrainingExperience,
  UserPreferencesRow,
  WorkoutLocation,
  WorkoutPlanRow,
  WorkoutScheduleData
} from '@/types/domain';
import {
  generatePersonalizedWorkoutPlan,
  replaceExerciseInSchedule
} from '@/lib/workouts/workout-generator';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface WorkoutPlannerClientProps {
  todayIso: string;
  profile: ProfileRow | null;
  preferences: UserPreferencesRow | null;
  initialPlans: WorkoutPlanRow[];
  recentWorkoutsCount14d: number;
}

export function WorkoutPlannerClient({
  todayIso,
  profile,
  preferences,
  initialPlans,
  recentWorkoutsCount14d
}: WorkoutPlannerClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [plans, setPlans] = useState<WorkoutPlanRow[]>(initialPlans);
  const [activePlanId, setActivePlanId] = useState<string | null>(
    initialPlans[0]?.id ?? null
  );
  const [title, setTitle] = useState<string>(
    initialPlans[0]?.title ?? 'Personalized Strength & Conditioning Program'
  );

  // Generator controls
  const [goal, setGoal] = useState<FitnessGoal>(
    profile?.fitness_goal ?? initialPlans[0]?.goal ?? 'fat_loss'
  );
  const [experience, setExperience] = useState<TrainingExperience>(
    preferences?.training_experience ?? initialPlans[0]?.difficulty ?? 'beginner'
  );
  const [location, setLocation] = useState<WorkoutLocation>(
    preferences?.workout_location ?? 'gym'
  );
  const [daysPerWeek, setDaysPerWeek] = useState<number>(
    preferences?.workout_days_per_week ?? 4
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    preferences?.session_duration_minutes ?? 45
  );

  const [schedule, setSchedule] = useState<WorkoutScheduleData | null>(
    initialPlans[0]?.schedule_data ?? null
  );
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  // Active workout logger state
  const [logModalDay, setLogModalDay] = useState<PlannedWorkoutDay | null>(null);
  const [logDuration, setLogDuration] = useState<number>(45);
  const [logNotes, setLogNotes] = useState<string>('');
  const [logExercises, setLogExercises] = useState<
    Array<{
      exercise_name: string;
      sets: number;
      reps: number;
      weight_kg: number;
    }>
  >([]);
  const [loggingWorkout, setLoggingWorkout] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    const generated = generatePersonalizedWorkoutPlan({
      goal,
      experience,
      daysPerWeek,
      sessionDurationMinutes: durationMinutes,
      location,
      equipment: preferences?.equipment ?? ['bodyweight', 'dumbbells'],
      limitations: preferences?.exercise_limitations ?? [],
      recentCompletedWorkoutsLast14Days: recentWorkoutsCount14d
    });

    setActivePlanId(null);
    setTitle(`${generated.splitType} (${location.toUpperCase()})`);
    setSchedule(generated);
    setSelectedDayNum(1);
    pushToast({
      kind: 'success',
      title: 'Workout Program Generated',
      description: `${generated.splitType} tailored to your equipment & limitations.`
    });
  };

  const handleSavePlan = async () => {
    if (!schedule) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/workout-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activePlanId ?? undefined,
          title: title.trim() || 'Workout Program',
          goal,
          difficulty: experience,
          schedule_data: schedule
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save workout plan.');

      const savedRow: WorkoutPlanRow = json.plan;
      setActivePlanId(savedRow.id);
      setPlans((prev) => {
        const exists = prev.some((p) => p.id === savedRow.id);
        return exists
          ? prev.map((p) => (p.id === savedRow.id ? savedRow : p))
          : [savedRow, ...prev];
      });
      pushToast({
        kind: 'success',
        title: 'Workout Plan Saved',
        description: 'Persisted to Supabase.'
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save plan.');
    } finally {
      setSaving(false);
    }
  };

  const openLogModal = (day: PlannedWorkoutDay) => {
    setLogModalDay(day);
    setLogDuration(day.estimatedDurationMinutes);
    setLogNotes('');
    setLogExercises(
      day.exercises.map((ex) => {
        const parsedRepMatch = ex.reps.match(/\d+/);
        const defaultReps = parsedRepMatch ? Number(parsedRepMatch[0]) : 10;
        return {
          exercise_name: ex.name,
          sets: ex.sets,
          reps: defaultReps,
          weight_kg: ex.equipment === 'bodyweight' ? 0 : 12.5
        };
      })
    );
  };

  const submitWorkoutLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logModalDay) return;
    setLoggingWorkout(true);
    try {
      const res = await fetch('/api/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_plan_id: activePlanId,
          workout_name: `${logModalDay.dayName} — ${logModalDay.focus}`,
          workout_date: todayIso,
          duration_minutes: Number(logDuration),
          notes: logNotes.trim() || null,
          completed: true,
          exercises: logExercises.map((ex) => ({
            exercise_name: ex.exercise_name,
            sets: Math.max(1, Number(ex.sets) || 1),
            reps: Math.max(1, Number(ex.reps) || 1),
            weight_kg: Math.max(0, Number(ex.weight_kg) || 0),
            duration_seconds: null
          }))
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not log workout.');

      setLogModalDay(null);
      pushToast({
        kind: 'success',
        title: 'Workout Logged!',
        description: 'Session & set weights recorded in Workout History.'
      });
      router.refresh();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Workout log failed',
        description: err instanceof Error ? err.message : 'Unable to save workout.'
      });
    } finally {
      setLoggingWorkout(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/workout-plans?id=${encodeURIComponent(deleteId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      const next = plans.filter((p) => p.id !== deleteId);
      setPlans(next);
      if (activePlanId === deleteId) {
        setActivePlanId(next[0]?.id ?? null);
        setSchedule(next[0]?.schedule_data ?? null);
      }
      setDeleteId(null);
      pushToast({ kind: 'info', title: 'Workout plan deleted' });
    } catch {
      pushToast({ kind: 'error', title: 'Could not delete workout plan' });
    }
  };

  const currentDay =
    schedule?.days.find((d) => d.dayNumber === selectedDayNum) ?? schedule?.days[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Personalized Workout Planner
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Structured splits with warm-ups, technique cues, joint-friendly swaps,
            recovery days, and conservative progression.
          </p>
        </div>

        <Link
          href="/workout-history"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 px-4 py-2.5 text-xs font-bold hover:border-crimson-500 self-start"
        >
          <History className="h-4 w-4 text-crimson-500" />
          View Workout History ({recentWorkoutsCount14d} in 14d)
        </Link>
      </div>

      {/* Generator Controls */}
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as FitnessGoal)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            >
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="recomposition">Recomposition</option>
              <option value="maintenance">Maintenance</option>
              <option value="endurance">Endurance</option>
              <option value="general_fitness">General Fitness</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Experience
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value as TrainingExperience)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as WorkoutLocation)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            >
              <option value="gym">Gym</option>
              <option value="home">Home</option>
              <option value="outdoor">Outdoor</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Days / Week
            </label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} days / wk
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Session Length
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            >
              {[25, 35, 45, 60, 75].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-crimson-600 px-4 py-2 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate
            </button>
          </div>
        </div>

        {plans.length > 0 && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Saved Programs:</span>
            {plans.map((wp) => (
              <div
                key={wp.id}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs ${
                  activePlanId === wp.id
                    ? 'border-crimson-600 bg-crimson-600/15 text-crimson-500 font-bold'
                    : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActivePlanId(wp.id);
                    setTitle(wp.title);
                    setGoal(wp.goal);
                    setExperience(wp.difficulty);
                    setSchedule(wp.schedule_data);
                    setSelectedDayNum(1);
                  }}
                >
                  {wp.title}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${wp.title}`}
                  onClick={() => setDeleteId(wp.id)}
                  className="text-zinc-400 hover:text-crimson-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ErrorBanner message={error} />

      {!schedule ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="No training program generated yet"
          description="Click Generate above to create a 7-day training and recovery schedule customized to your equipment, experience, and joint sensitivities."
          actionLabel="Generate Workout Plan"
          onAction={handleGenerate}
        />
      ) : (
        <div className="space-y-5">
          {/* Save Header */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full max-w-md rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2 text-sm font-bold"
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleSavePlan}
              className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : activePlanId ? 'Update Saved Plan' : 'Save Plan'}
            </button>
          </div>

          {/* 7-Day Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
            {schedule.days.map((d) => {
              const active = d.dayNumber === selectedDayNum;
              return (
                <button
                  key={d.dayNumber}
                  type="button"
                  onClick={() => setSelectedDayNum(d.dayNumber)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? 'border-crimson-600 bg-crimson-600 text-white shadow-crimson'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900'
                  }`}
                >
                  <span className="block text-[10px] font-bold uppercase opacity-80">
                    {d.dayName.slice(0, 3)}
                  </span>
                  <span className="mt-0.5 block text-xs font-bold truncate">
                    {d.isRestDay ? 'Recovery' : d.focus.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Day Detail */}
          {currentDay && (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-crimson-500">
                    {currentDay.dayName} &bull; ~{currentDay.estimatedDurationMinutes} min
                  </span>
                  <h2 className="mt-1 text-xl font-extrabold text-zinc-950 dark:text-white">
                    {currentDay.focus}
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">{currentDay.progressionNote}</p>
                </div>

                {!currentDay.isRestDay && (
                  <button
                    type="button"
                    onClick={() => openLogModal(currentDay)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Complete &amp; Log Workout
                  </button>
                )}
              </div>

              {/* Warmup */}
              <div className="rounded-xl bg-zinc-50 dark:bg-obsidian-950 p-4 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <p className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Warm-Up Protocol
                </p>
                {currentDay.warmup.map((w, idx) => (
                  <p key={idx} className="text-zinc-600 dark:text-zinc-400">
                    &bull; {w}
                  </p>
                ))}
              </div>

              {/* Exercises */}
              {!currentDay.isRestDay && (
                <div className="space-y-4">
                  {currentDay.exercises.map((ex, idx) => (
                    <div
                      key={ex.id}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold uppercase text-crimson-500">
                            Exercise {idx + 1} &bull; {ex.targetMuscles.join(', ')} &bull;{' '}
                            {ex.equipment}
                          </span>
                          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                            {ex.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              aria-label={`Sets for ${ex.name}`}
                              value={ex.sets}
                              onChange={(e) => {
                                const nextSets = Math.max(1, Number(e.target.value) || 1);
                                setSchedule((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        days: prev.days.map((d) =>
                                          d.dayNumber === currentDay.dayNumber
                                            ? {
                                                ...d,
                                                exercises: d.exercises.map((item) =>
                                                  item.id === ex.id
                                                    ? { ...item, sets: nextSets }
                                                    : item
                                                )
                                              }
                                            : d
                                        )
                                      }
                                    : prev
                                );
                              }}
                              className="w-14 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2 py-1 text-center font-bold tabular-nums"
                            />
                            <span className="text-zinc-500">
                              sets &times; {ex.reps} (Rest {ex.restSeconds}s)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSchedule((prev) =>
                                prev
                                  ? replaceExerciseInSchedule(
                                      prev,
                                      currentDay.dayNumber,
                                      ex.id
                                    )
                                  : prev
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2.5 py-1 text-xs font-semibold hover:border-crimson-500"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Swap
                          </button>
                        </div>
                      </div>

                      <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {ex.instructions.map((cue, cIdx) => (
                          <li key={cIdx}>&bull; {cue}</li>
                        ))}
                      </ul>
                      <p className="text-[11px] text-zinc-500">
                        Alternatives: {ex.alternatives.join(' | ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cooldown & Safety */}
              <div className="rounded-xl bg-zinc-50 dark:bg-obsidian-950 p-4 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <p className="font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Cooldown &amp; Recovery
                </p>
                {currentDay.cooldown.map((c, idx) => (
                  <p key={idx} className="text-zinc-600 dark:text-zinc-400">
                    &bull; {c}
                  </p>
                ))}
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                {schedule.safetyGuidance.map((sg, i) => (
                  <p key={i} className="flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <span>{sg}</span>
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Completed Workout Modal */}
      {logModalDay && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Log completed workout"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={submitWorkoutLog}
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4 shadow-card"
          >
            <h2 className="text-lg font-extrabold text-zinc-950 dark:text-white">
              Log Completed Session: {logModalDay.dayName}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={logDuration}
                  onChange={(e) => setLogDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">
                  Session Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="RPE 8, felt strong..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Set, Rep &amp; Load Records
              </p>
              {logExercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center rounded-xl border border-zinc-200 dark:border-zinc-800 p-2.5 text-xs"
                >
                  <span className="col-span-5 font-semibold truncate">
                    {ex.exercise_name}
                  </span>
                  <input
                    type="number"
                    min={1}
                    aria-label="Sets"
                    value={ex.sets}
                    onChange={(e) =>
                      setLogExercises((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, sets: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="col-span-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2 py-1 tabular-nums"
                  />
                  <input
                    type="number"
                    min={1}
                    aria-label="Reps"
                    value={ex.reps}
                    onChange={(e) =>
                      setLogExercises((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, reps: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="col-span-2 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2 py-1 tabular-nums"
                  />
                  <div className="col-span-3 flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      aria-label="Weight kg"
                      value={ex.weight_kg}
                      onChange={(e) =>
                        setLogExercises((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, weight_kg: Number(e.target.value) }
                              : item
                          )
                        )
                      }
                      className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2 py-1 tabular-nums"
                    />
                    <span className="text-[10px] text-zinc-500">kg</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLogModalDay(null)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loggingWorkout}
                className="rounded-xl bg-crimson-600 px-5 py-2 text-xs font-bold text-white hover:bg-crimson-700"
              >
                {loggingWorkout ? 'Saving Workout...' : 'Save Workout Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Workout Program?"
        description="This saved training plan will be removed from your account. Logged workout history is preserved."
        confirmLabel="Delete Plan"
        onConfirm={handleDeletePlan}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
