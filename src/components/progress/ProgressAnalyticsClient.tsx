'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type {
  FoodLogRow,
  HabitLogRow,
  HabitRow,
  HabitType,
  ProgressLogRow,
  WorkoutLogRow
} from '@/types/domain';
import { computeMovingAverage } from '@/lib/nutrition/nutrition-engine';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState, ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface ProgressAnalyticsClientProps {
  todayIso: string;
  initialProgressLogs: ProgressLogRow[];
  foodLogs: FoodLogRow[];
  workoutLogs: WorkoutLogRow[];
  initialHabits: HabitRow[];
  habitLogs: HabitLogRow[];
}

export function ProgressAnalyticsClient({
  todayIso,
  initialProgressLogs,
  foodLogs,
  workoutLogs,
  initialHabits,
  habitLogs
}: ProgressAnalyticsClientProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [progressLogs, setProgressLogs] =
    useState<ProgressLogRow[]>(initialProgressLogs);
  const [habits, setHabits] = useState<HabitRow[]>(initialHabits);

  // Date range filter
  const [rangeMode, setRangeMode] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date(`${todayIso}T00:00:00`);
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(todayIso);

  // Add/Edit progress entry form
  const [logDate, setLogDate] = useState(todayIso);
  const [weightKg, setWeightKg] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [steps, setSteps] = useState<string>('');
  const [sleepHours, setSleepHours] = useState<string>('');
  const [waterMl, setWaterMl] = useState<string>('');
  const [energyLevel, setEnergyLevel] = useState<string>('7');
  const [notes, setNotes] = useState<string>('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Add habit form
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitType, setNewHabitType] = useState<HabitType>('hydration');

  const { startIso, endIso } = useMemo(() => {
    if (rangeMode === 'custom') {
      return { startIso: customStart, endIso: customEnd };
    }
    const days = rangeMode === '7d' ? 6 : rangeMode === '30d' ? 29 : 89;
    const d = new Date(`${todayIso}T00:00:00`);
    d.setDate(d.getDate() - days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { startIso: `${yyyy}-${mm}-${dd}`, endIso: todayIso };
  }, [rangeMode, customStart, customEnd, todayIso]);

  const filteredProgress = useMemo(
    () =>
      progressLogs
        .filter((p) => p.log_date >= startIso && p.log_date <= endIso)
        .sort((a, b) => a.log_date.localeCompare(b.log_date)),
    [progressLogs, startIso, endIso]
  );

  // Weight + 7-day moving average
  const weightSeries = useMemo(() => {
    const raw = filteredProgress
      .filter((p) => p.weight_kg !== null)
      .map((p) => ({
        date: p.log_date.slice(5),
        value: Number(p.weight_kg),
        weightKg: Number(p.weight_kg)
      }));
    return computeMovingAverage(raw, 7);
  }, [filteredProgress]);

  // Steps, Sleep & Hydration series
  const recoverySeries = useMemo(
    () =>
      filteredProgress.map((p) => ({
        date: p.log_date.slice(5),
        steps: p.steps ?? 0,
        waterMl: p.water_ml ?? 0,
        sleepHours: p.sleep_hours ?? 0
      })),
    [filteredProgress]
  );

  // Nutrition daily totals in range
  const nutritionSeries = useMemo(() => {
    const map = new Map<string, { calories: number; proteinG: number }>();
    for (const fl of foodLogs) {
      if (fl.log_date < startIso || fl.log_date > endIso) continue;
      const cur = map.get(fl.log_date) ?? { calories: 0, proteinG: 0 };
      cur.calories += fl.calories;
      cur.proteinG += fl.protein_g;
      map.set(fl.log_date, cur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date: date.slice(5),
        calories: Math.round(val.calories),
        proteinG: Math.round(val.proteinG)
      }));
  }, [foodLogs, startIso, endIso]);

  // Workout consistency in range
  const workoutSeries = useMemo(() => {
    const filtered = workoutLogs
      .filter((w) => w.workout_date >= startIso && w.workout_date <= endIso)
      .sort((a, b) => a.workout_date.localeCompare(b.workout_date));
    return filtered.map((w) => ({
      date: w.workout_date.slice(5),
      durationMinutes: w.duration_minutes,
      name: w.workout_name
    }));
  }, [workoutLogs, startIso, endIso]);

  // Habit completion in range
  const habitSeries = useMemo(() => {
    const activeCount = Math.max(1, habits.filter((h) => h.is_active).length);
    const byDate = new Map<string, number>();
    for (const hl of habitLogs) {
      if (!hl.completed || hl.log_date < startIso || hl.log_date > endIso) continue;
      byDate.set(hl.log_date, (byDate.get(hl.log_date) ?? 0) + 1);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: date.slice(5),
        completed: count,
        completionPct: Math.min(100, Math.round((count / activeCount) * 100))
      }));
  }, [habitLogs, habits, startIso, endIso]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavingEntry(true);

    try {
      const payload = {
        log_date: logDate,
        weight_kg: weightKg.trim() ? Number(weightKg) : undefined,
        waist_cm: waistCm.trim() ? Number(waistCm) : undefined,
        steps: steps.trim() ? Number(steps) : undefined,
        sleep_hours: sleepHours.trim() ? Number(sleepHours) : undefined,
        water_ml: waterMl.trim() ? Number(waterMl) : undefined,
        energy_level: energyLevel.trim() ? Number(energyLevel) : undefined,
        notes: notes.trim() || null
      };

      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save progress entry.');

      const savedRow: ProgressLogRow = {
        ...json.log,
        weight_kg: json.log.weight_kg !== null ? Number(json.log.weight_kg) : null,
        waist_cm: json.log.waist_cm !== null ? Number(json.log.waist_cm) : null,
        sleep_hours: json.log.sleep_hours !== null ? Number(json.log.sleep_hours) : null
      };

      setProgressLogs((prev) => {
        const exists = prev.some((p) => p.log_date === savedRow.log_date);
        return exists
          ? prev.map((p) => (p.log_date === savedRow.log_date ? savedRow : p))
          : [...prev, savedRow];
      });

      pushToast({
        kind: 'success',
        title: 'Progress entry saved',
        description: `Logged metrics for ${savedRow.log_date}.`
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save progress.');
    } finally {
      setSavingEntry(false);
    }
  };

  const populateForEdit = (row: ProgressLogRow) => {
    setLogDate(row.log_date);
    setWeightKg(row.weight_kg !== null ? String(row.weight_kg) : '');
    setWaistCm(row.waist_cm !== null ? String(row.waist_cm) : '');
    setSteps(row.steps !== null ? String(row.steps) : '');
    setSleepHours(row.sleep_hours !== null ? String(row.sleep_hours) : '');
    setWaterMl(row.water_ml !== null ? String(row.water_ml) : '');
    setEnergyLevel(row.energy_level !== null ? String(row.energy_level) : '7');
    setNotes(row.notes ?? '');
  };

  const handleDeleteEntry = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/progress?id=${encodeURIComponent(deleteId)}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Delete failed');
      setProgressLogs((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
      pushToast({ kind: 'info', title: 'Progress entry deleted' });
      router.refresh();
    } catch {
      pushToast({ kind: 'error', title: 'Could not delete progress entry' });
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          data: { title: newHabitTitle.trim(), habit_type: newHabitType }
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create habit.');
      setHabits((prev) => [...prev, json.habit]);
      setNewHabitTitle('');
      pushToast({ kind: 'success', title: 'Habit added' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Habit error',
        description: err instanceof Error ? err.message : 'Could not add habit.'
      });
    }
  };

  const handleDeleteHabit = async (id: string) => {
    const res = await fetch(`/api/habits?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      pushToast({ kind: 'info', title: 'Habit removed' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + Date Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            Progress Charts &amp; Analytics
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Smoothed moving averages and longitudinal trends calculated strictly from your stored data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['7d', '30d', '90d', 'custom'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeMode(r)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase transition-colors ${
                rangeMode === r
                  ? 'bg-crimson-600 text-white shadow-crimson'
                  : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900'
              }`}
            >
              {r === 'custom' ? 'Custom Range' : `Last ${r}`}
            </button>
          ))}
        </div>
      </div>

      {rangeMode === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-4 text-xs">
          <label className="font-semibold">From:</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 tabular-nums"
          />
          <label className="font-semibold">To:</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-1.5 tabular-nums"
          />
        </div>
      )}

      {/* Log / Edit Progress Entry Form */}
      <form
        onSubmit={handleSaveEntry}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-950 dark:text-white">
            Record or Update Daily Check-In
          </h2>
          <span className="text-xs text-zinc-500">
            Daily fluctuations from hydration, glycogen &amp; digestion are normal—focus on multi-week trends.
          </span>
        </div>

        <ErrorBanner message={error} />

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Date
            </label>
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              min={20}
              max={350}
              placeholder="e.g. 71.4"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Waist (cm)
            </label>
            <input
              type="number"
              step="0.5"
              min={35}
              max={250}
              placeholder="e.g. 81"
              value={waistCm}
              onChange={(e) => setWaistCm(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Steps
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 8500"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Sleep (hrs)
            </label>
            <input
              type="number"
              step="0.5"
              min={0}
              max={24}
              placeholder="e.g. 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Water (ml)
            </label>
            <input
              type="number"
              step={250}
              min={0}
              placeholder="e.g. 2500"
              value={waterMl}
              onChange={(e) => setWaterMl(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-zinc-500 mb-1">
              Energy (1–10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={energyLevel}
              onChange={(e) => setEnergyLevel(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs tabular-nums"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Optional daily reflection or recovery note..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={savingEntry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-crimson-600 px-5 py-2.5 text-xs font-bold text-white shadow-crimson hover:bg-crimson-700"
          >
            <Plus className="h-4 w-4" />
            {savingEntry ? 'Saving...' : 'Save Progress Entry'}
          </button>
        </div>
      </form>

      {/* Interactive Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Body Weight + 7-Day Moving Average */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              Weight Trend &amp; 7-Entry Moving Average
            </h3>
            <p className="text-xs text-zinc-500">
              Moving average smooths day-to-day water &amp; sodium swings.
            </p>
          </div>
          {weightSeries.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title="No weight entries in selected range"
              description="Log your weight above to view raw weigh-ins alongside a smoothed moving average."
            />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#71717a" />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} stroke="#71717a" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111117',
                      borderColor: '#272732',
                      borderRadius: '12px',
                      color: '#fafafa',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="weightKg"
                    stroke="#71717a"
                    strokeWidth={1.5}
                    dot={{ r: 3 }}
                    name="Scale Weight (kg)"
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    stroke="#dc2626"
                    strokeWidth={2.5}
                    dot={false}
                    name="7-Point Moving Avg (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* 2. Nutrition Logs (Calories & Protein) */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              Logged Calorie &amp; Protein Intake
            </h3>
            <p className="text-xs text-zinc-500">
              Aggregated from Food Tracker records ({startIso} to {endIso}).
            </p>
          </div>
          {nutritionSeries.length === 0 ? (
            <EmptyState
              title="No nutrition logs in range"
              description="Meals logged in Food Tracker or Diet Planner appear here automatically."
              actionLabel="Open Food Tracker"
              actionHref="/food-tracker"
            />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionSeries}>
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
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="calories" fill="#dc2626" radius={[5, 5, 0, 0]} name="Calories (kcal)" />
                  <Bar dataKey="proteinG" fill="#3b82f6" radius={[5, 5, 0, 0]} name="Protein (g)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* 3. Daily Steps & Hydration */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              Daily Steps, Hydration &amp; Sleep Duration
            </h3>
            <p className="text-xs text-zinc-500">
              Movement and recovery consistency across logged check-ins.
            </p>
          </div>
          {recoverySeries.length === 0 ? (
            <EmptyState
              title="No steps, water, or sleep logged in range"
              description="Save a daily check-in above or on the Dashboard."
            />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recoverySeries}>
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
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="steps" fill="#10b981" radius={[5, 5, 0, 0]} name="Steps" />
                  <Bar dataKey="waterMl" fill="#38bdf8" radius={[5, 5, 0, 0]} name="Water (ml)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* 4. Workout Consistency & Habit Completion */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950 dark:text-white">
              Workout Consistency &amp; Habit Adherence
            </h3>
            <p className="text-xs text-zinc-500">
              {workoutSeries.length} workouts logged &bull; {habitSeries.length} habit days recorded in range
            </p>
          </div>
          {workoutSeries.length === 0 && habitSeries.length === 0 ? (
            <EmptyState
              title="No workout or habit logs in range"
              description="Complete workouts or check off habits to track consistency."
            />
          ) : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workoutSeries.length > 0 ? workoutSeries : habitSeries}>
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
                  {workoutSeries.length > 0 ? (
                    <Bar
                      dataKey="durationMinutes"
                      fill="#dc2626"
                      radius={[5, 5, 0, 0]}
                      name="Workout Duration (min)"
                    />
                  ) : (
                    <Bar
                      dataKey="completionPct"
                      fill="#10b981"
                      radius={[5, 5, 0, 0]}
                      name="Habit Completion (%)"
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      {/* Habit Manager + Stored Progress Entries Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            Manage Active Habits
          </h3>
          <form onSubmit={handleAddHabit} className="flex gap-2">
            <input
              type="text"
              placeholder="New habit (e.g. 10 min mobility)"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2 text-xs"
            />
            <select
              value={newHabitType}
              onChange={(e) => setNewHabitType(e.target.value as HabitType)}
              className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-2.5 py-2 text-xs"
            >
              <option value="hydration">Hydration</option>
              <option value="nutrition">Nutrition</option>
              <option value="movement">Movement</option>
              <option value="sleep">Sleep</option>
              <option value="recovery">Recovery</option>
              <option value="custom">Custom</option>
            </select>
            <button
              type="submit"
              className="rounded-xl bg-crimson-600 px-3 py-2 text-xs font-bold text-white"
            >
              Add
            </button>
          </form>

          <ul className="space-y-2 text-xs">
            {habits.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2"
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-crimson-500" />
                  {h.title}
                </span>
                <button
                  type="button"
                  aria-label={`Remove habit ${h.title}`}
                  onClick={() => void handleDeleteHabit(h.id)}
                  className="text-zinc-400 hover:text-crimson-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 space-y-4">
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            Recorded Check-Ins ({filteredProgress.length})
          </h3>
          {filteredProgress.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No progress entries recorded in the selected date window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Weight</th>
                    <th className="py-2 pr-3">Steps</th>
                    <th className="py-2 pr-3">Sleep</th>
                    <th className="py-2 pr-3">Water</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {[...filteredProgress].reverse().map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-3 font-semibold">{row.log_date}</td>
                      <td className="py-2.5 pr-3">
                        {row.weight_kg !== null ? `${row.weight_kg} kg` : '—'}
                      </td>
                      <td className="py-2.5 pr-3">{row.steps ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        {row.sleep_hours !== null ? `${row.sleep_hours}h` : '—'}
                      </td>
                      <td className="py-2.5 pr-3">
                        {row.water_ml !== null ? `${row.water_ml}ml` : '—'}
                      </td>
                      <td className="py-2.5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => populateForEdit(row)}
                          aria-label={`Edit entry ${row.log_date}`}
                          className="inline-flex p-1 text-zinc-400 hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteId(row.id)}
                          aria-label={`Delete entry ${row.log_date}`}
                          className="inline-flex p-1 text-zinc-400 hover:text-crimson-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Progress Entry?"
        description="This daily check-in will be permanently removed from your Supabase progress logs."
        confirmLabel="Delete Entry"
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
