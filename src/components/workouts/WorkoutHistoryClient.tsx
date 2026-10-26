'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Dumbbell, Plus, Trash2 } from 'lucide-react';
import type { WorkoutLogRow } from '@/types/domain';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

export function WorkoutHistoryClient({
  todayIso,
  initialLogs
}: {
  todayIso: string;
  initialLogs: WorkoutLogRow[];
}) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [logs, setLogs] = useState<WorkoutLogRow[]>(initialLogs);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Quick standalone session log form
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDate, setWorkoutDate] = useState(todayIso);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [exerciseName, setExerciseName] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weightKg, setWeightKg] = useState(20);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workoutName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workout-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_name: workoutName.trim(),
          workout_date: workoutDate,
          duration_minutes: Number(durationMinutes),
          notes: notes.trim() || null,
          completed: true,
          exercises: exerciseName.trim()
            ? [
                {
                  exercise_name: exerciseName.trim(),
                  sets: Number(sets),
                  reps: Number(reps),
                  weight_kg: Number(weightKg)
                }
              ]
            : []
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to log workout.');

      setLogs(json.logs ?? []);
      setWorkoutName('');
      setExerciseName('');
      setNotes('');
      setShowQuickForm(false);
      pushToast({ kind: 'success', title: 'Workout session recorded' });
      router.refresh();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save log.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/workout-logs?id=${encodeURIComponent(deleteId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      setLogs((prev) => prev.filter((l) => l.id !== deleteId));
      setDeleteId(null);
      pushToast({ kind: 'info', title: 'Workout log deleted' });
      router.refresh();
    } catch {
      pushToast({ kind: 'error', title: 'Could not delete workout log' });
    }
  };

  const totalMinutes = logs.reduce((acc, l) => acc + l.duration_minutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Workout &amp; Exercise History
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Complete chronological log of training sessions, sets, repetitions, and weights.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowQuickForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-4 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700 self-start"
        >
          <Plus className="h-4 w-4" />
          {showQuickForm ? 'Close Log Form' : 'Log Custom Workout'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-xs text-zinc-500">Completed Sessions</span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{logs.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-xs text-zinc-500">Cumulative Training Time</span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums">{totalMinutes} min</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4">
          <span className="text-xs text-zinc-500">Logged Exercise Sets</span>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-crimson-500">
            {logs.reduce(
              (acc, l) =>
                acc +
                (l.exercise_logs ?? []).reduce((s, e) => s + (e.sets ?? 1), 0),
              0
            )}
          </p>
        </div>
      </div>

      {showQuickForm && (
        <form
          onSubmit={handleQuickLog}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4"
        >
          <h2 className="text-base font-bold">Record Standalone Workout</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              placeholder="Session name (e.g. Upper Body Strength)"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            />
            <input
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
            />
            <input
              type="number"
              min={5}
              max={300}
              placeholder="Duration (min)"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Primary Exercise (optional)"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            />
            <input
              type="number"
              min={1}
              placeholder="Sets"
              value={sets}
              onChange={(e) => setSets(Number(e.target.value))}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
            />
            <input
              type="number"
              min={1}
              placeholder="Reps"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
            />
            <input
              type="number"
              min={0}
              step="0.5"
              placeholder="Weight (kg)"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs tabular-nums"
            />
          </div>

          <input
            type="text"
            placeholder="Session notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-crimson-700"
          >
            {saving ? 'Saving...' : 'Save Workout Entry'}
          </button>
        </form>
      )}

      {logs.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-6 w-6" />}
          title="No workouts logged yet"
          description="Complete a scheduled session in Workout Plans or record a standalone session above."
          actionLabel="Open Workout Plans"
          actionHref="/workouts"
        />
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                    {log.workout_name}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-500 tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-crimson-500" />
                      {log.workout_date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-crimson-500" />
                      {log.duration_minutes} min
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${log.workout_name}`}
                  onClick={() => setDeleteId(log.id)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-crimson-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {log.notes && (
                <p className="text-xs italic text-zinc-600 dark:text-zinc-400">
                  &ldquo;{log.notes}&rdquo;
                </p>
              )}

              {log.exercise_logs && log.exercise_logs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {log.exercise_logs.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold truncate pr-2">
                        {ex.exercise_name}
                      </span>
                      <span className="tabular-nums text-zinc-500 shrink-0">
                        {ex.sets ?? 1} &times; {ex.reps ?? 1}
                        {ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Workout Log?"
        description="This session and its recorded exercise sets will be permanently deleted."
        confirmLabel="Delete Session"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
