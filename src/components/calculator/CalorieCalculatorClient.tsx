'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Info,
  Scale,
  ShieldAlert
} from 'lucide-react';
import {
  ACTIVITY_MULTIPLIERS,
  calculateCalorieTargets
} from '@/lib/calculations/calorie-engine';
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg
} from '@/lib/calculations/units';
import type {
  ActivityLevel,
  FitnessGoal,
  PreferredUnits,
  ProfileRow,
  SexForCalculation
} from '@/types/domain';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

interface CalorieCalculatorClientProps {
  initialProfile?: ProfileRow | null;
  isAuthenticated?: boolean;
}

export function CalorieCalculatorClient({
  initialProfile = null,
  isAuthenticated = false
}: CalorieCalculatorClientProps) {
  const { pushToast } = useToast();

  const [units, setUnits] = useState<PreferredUnits>(
    initialProfile?.preferred_units ?? 'metric'
  );
  const [inputMode, setInputMode] = useState<'dob' | 'age'>(
    initialProfile?.date_of_birth ? 'dob' : 'age'
  );
  const [dateOfBirth, setDateOfBirth] = useState<string>(
    initialProfile?.date_of_birth ?? '1996-06-15'
  );
  const [ageYears, setAgeYears] = useState<number>(28);

  const [heightCm, setHeightCm] = useState<number>(
    initialProfile?.height_cm ?? 172
  );
  const initialFtIn = cmToFeetInches(initialProfile?.height_cm ?? 172);
  const [heightFeet, setHeightFeet] = useState<number>(initialFtIn.feet);
  const [heightInches, setHeightInches] = useState<number>(initialFtIn.inches);

  const [weightKg, setWeightKg] = useState<number>(
    initialProfile?.weight_kg ?? 72
  );
  const [weightLbs, setWeightLbs] = useState<number>(
    kgToLbs(initialProfile?.weight_kg ?? 72)
  );

  const [sex, setSex] = useState<SexForCalculation>(
    initialProfile?.sex_for_calculation ?? 'male'
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activity_level ?? 'moderately_active'
  );
  const [goal, setGoal] = useState<FitnessGoal>(
    initialProfile?.fitness_goal ?? 'fat_loss'
  );
  const [saving, setSaving] = useState(false);

  const switchUnits = (next: PreferredUnits) => {
    if (next === units) return;
    if (next === 'imperial') {
      try {
        const fi = cmToFeetInches(heightCm);
        setHeightFeet(fi.feet);
        setHeightInches(fi.inches);
        setWeightLbs(kgToLbs(weightKg));
      } catch {
        // retain current imperial values if metric temporarily invalid
      }
    } else {
      try {
        setHeightCm(feetInchesToCm(heightFeet, heightInches));
        setWeightKg(lbsToKg(weightLbs));
      } catch {
        // retain current metric values
      }
    }
    setUnits(next);
  };

  const calculationOutcome = useMemo(() => {
    try {
      const effectiveHeightCm =
        units === 'metric' ? heightCm : feetInchesToCm(heightFeet, heightInches);
      const effectiveWeightKg =
        units === 'metric' ? weightKg : lbsToKg(weightLbs);

      const res = calculateCalorieTargets({
        dateOfBirth: inputMode === 'dob' ? dateOfBirth : undefined,
        ageYears: inputMode === 'age' ? ageYears : undefined,
        heightCm: effectiveHeightCm,
        weightKg: effectiveWeightKg,
        sexForCalculation: sex,
        activityLevel,
        fitnessGoal: goal
      });

      return { result: res, error: null as string | null };
    } catch (err) {
      return {
        result: null,
        error: err instanceof Error ? err.message : 'Invalid calculator inputs.'
      };
    }
  }, [
    units,
    heightCm,
    heightFeet,
    heightInches,
    weightKg,
    weightLbs,
    inputMode,
    dateOfBirth,
    ageYears,
    sex,
    activityLevel,
    goal
  ]);

  const handleSaveToProfile = async () => {
    if (!initialProfile || !calculationOutcome.result) return;
    setSaving(true);
    try {
      // Fetch existing preferences first so we preserve them cleanly
      const getRes = await fetch('/api/profile');
      const existingData = await getRes.json();
      if (!getRes.ok) {
        throw new Error(existingData.error || 'Could not load current profile.');
      }

      const dobToSave =
        inputMode === 'dob' ? dateOfBirth : initialProfile.date_of_birth;

      const putRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            full_name: initialProfile.full_name,
            date_of_birth: dobToSave,
            height_cm: calculationOutcome.result.inputsUsed.heightCm,
            weight_kg: calculationOutcome.result.inputsUsed.weightKg,
            sex_for_calculation: sex,
            fitness_goal: goal,
            activity_level: activityLevel,
            dietary_preference: initialProfile.dietary_preference,
            preferred_units: units,
            country: initialProfile.country,
            food_budget: initialProfile.food_budget
          },
          preferences: existingData.preferences ?? {
            allergies: [],
            excluded_foods: [],
            preferred_foods: [],
            meals_per_day: 4,
            workout_location: 'gym',
            equipment: [],
            training_experience: 'beginner',
            workout_days_per_week: 4,
            session_duration_minutes: 45,
            exercise_limitations: []
          }
        })
      });

      const savedJson = await putRes.json();
      if (!putRes.ok) {
        throw new Error(savedJson.error || 'Failed to save biometrics.');
      }

      pushToast({
        kind: 'success',
        title: 'Biometrics & Targets Saved',
        description: 'Updated values persisted to your Supabase profile.'
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Save failed.'
      });
    } finally {
      setSaving(false);
    }
  };

  const res = calculationOutcome.result;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-crimson-500/30 bg-crimson-600/10 px-3 py-1 text-xs font-semibold text-crimson-500">
            <Calculator className="h-3.5 w-3.5" />
            <span>Deterministic Mifflin–St Jeor Energy Engine</span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white">
            Calorie, BMR, TDEE &amp; Macronutrient Calculator
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            100% deterministic equations—never LLM-invented numbers. Transparent activity
            multipliers, metric &amp; imperial unit conversions, and built-in clinical safety floors.
          </p>
        </div>

        <div
          role="group"
          aria-label="Measurement unit system"
          className="inline-flex rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-obsidian-900 p-1 self-start"
        >
          <button
            type="button"
            onClick={() => switchUnits('metric')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              units === 'metric'
                ? 'bg-crimson-600 text-white shadow'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Metric (kg / cm)
          </button>
          <button
            type="button"
            onClick={() => switchUnits('imperial')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              units === 'imperial'
                ? 'bg-crimson-600 text-white shadow'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
            }`}
          >
            Imperial (lbs / ft-in)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Inputs */}
        <section
          aria-label="Biometric inputs"
          className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              1. Biometric &amp; Lifestyle Inputs
            </h2>
            <Scale className="h-4 w-4 text-crimson-500" />
          </div>

          {/* Age vs Date of Birth mode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                {inputMode === 'age' ? 'Age (Years)' : 'Date of Birth'}
              </label>
              <button
                type="button"
                onClick={() => setInputMode((m) => (m === 'age' ? 'dob' : 'age'))}
                className="text-xs font-medium text-crimson-500 hover:underline"
              >
                Use {inputMode === 'age' ? 'Date of Birth' : 'Age in Years'} instead
              </button>
            </div>
            {inputMode === 'age' ? (
              <input
                id="calc-age"
                aria-label="Age in years"
                type="number"
                min={10}
                max={110}
                value={ageYears}
                onChange={(e) => setAgeYears(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
              />
            ) : (
              <input
                id="calc-dob"
                aria-label="Date of birth"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
              />
            )}
          </div>

          {/* Sex for equation constant */}
          <div>
            <label
              htmlFor="calc-sex"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Metabolic Equation Reference
            </label>
            <select
              id="calc-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as SexForCalculation)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            >
              <option value="male">Male equation constant (+5)</option>
              <option value="female">Female equation constant (-161)</option>
              <option value="unspecified">Unspecified / Midpoint constant (-78)</option>
            </select>
          </div>

          {/* Height & Weight */}
          {units === 'metric' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="calc-height-cm"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Height (cm)
                </label>
                <input
                  id="calc-height-cm"
                  type="number"
                  step="0.5"
                  min={80}
                  max={260}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-weight-kg"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Weight (kg)
                </label>
                <input
                  id="calc-weight-kg"
                  type="number"
                  step="0.1"
                  min={20}
                  max={350}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label
                  htmlFor="calc-height-ft"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Feet
                </label>
                <input
                  id="calc-height-ft"
                  type="number"
                  min={2}
                  max={8}
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-height-in"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Inches
                </label>
                <input
                  id="calc-height-in"
                  type="number"
                  min={0}
                  max={11}
                  value={heightInches}
                  onChange={(e) => setHeightInches(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
                />
              </div>
              <div>
                <label
                  htmlFor="calc-weight-lbs"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
                >
                  Weight (lbs)
                </label>
                <input
                  id="calc-weight-lbs"
                  type="number"
                  step="0.5"
                  min={45}
                  max={770}
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3 py-2.5 text-sm tabular-nums text-zinc-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Activity Level */}
          <div>
            <label
              htmlFor="calc-activity"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Daily Activity Multiplier
            </label>
            <select
              id="calc-activity"
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            >
              {Object.entries(ACTIVITY_MULTIPLIERS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {ACTIVITY_MULTIPLIERS[activityLevel].description}
            </p>
          </div>

          {/* Goal */}
          <div>
            <label
              htmlFor="calc-goal"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5"
            >
              Primary Fitness Goal
            </label>
            <select
              id="calc-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as FitnessGoal)}
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white"
            >
              <option value="fat_loss">Sustainable Fat Loss (-15%, capped -500 kcal)</option>
              <option value="recomposition">Body Recomposition (-7% mild deficit)</option>
              <option value="maintenance">Weight Maintenance (TDEE)</option>
              <option value="general_fitness">General Health &amp; Energy (TDEE)</option>
              <option value="muscle_gain">Lean Muscle Hypertrophy (+10% conservative surplus)</option>
              <option value="endurance">Endurance Performance (+12% fueling)</option>
            </select>
          </div>

          {isAuthenticated && initialProfile && (
            <button
              type="button"
              disabled={saving || Boolean(calculationOutcome.error)}
              onClick={handleSaveToProfile}
              className="w-full rounded-xl bg-crimson-600 px-4 py-3 text-sm font-semibold text-white shadow-crimson hover:bg-crimson-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving to Supabase Profile...' : 'Save Inputs & Targets to My Profile'}
            </button>
          )}

          {!isAuthenticated && (
            <Link
              href="/signup"
              className="block w-full rounded-xl border border-crimson-600/50 bg-crimson-600/10 px-4 py-3 text-center text-sm font-semibold text-crimson-500 hover:bg-crimson-600 hover:text-white transition-colors"
            >
              Create Account to Persist Targets &amp; Build Meal Plans
            </Link>
          )}
        </section>

        {/* Calculated Output */}
        <section
          aria-label="Calculated energy and macronutrient results"
          className="lg:col-span-7 space-y-5"
        >
          <ErrorBanner message={calculationOutcome.error} />

          {res && (
            <>
              {res.isMinor && (
                <div
                  role="alert"
                  className="rounded-2xl border border-amber-500/45 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3"
                >
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-bold">Adolescent Under-18 Safety Protection Active</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      Because the entered age is {res.ageYears} years (under 18), adult
                      calorie-deficit targets are automatically disabled. Energy guidance is set
                      to growth-supportive nourishment ({res.targetCalories} kcal/day). Always
                      consult a pediatrician or registered dietitian for youth nutrition.
                    </p>
                  </div>
                </div>
              )}

              {/* Primary Energy Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Basal Metabolic Rate (BMR)
                  </span>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-zinc-950 dark:text-white">
                    {res.bmr}{' '}
                    <span className="text-xs font-medium text-zinc-400">kcal/day</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Resting energy at complete physical rest
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Maintenance (TDEE)
                  </span>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-zinc-950 dark:text-white">
                    {res.tdee}{' '}
                    <span className="text-xs font-medium text-zinc-400">kcal/day</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                    ±10% range: {res.uncertaintyRangeKcal.low}–{res.uncertaintyRangeKcal.high} kcal
                  </p>
                </div>

                <div className="rounded-2xl border-2 border-crimson-600 bg-white dark:bg-obsidian-900 p-5 shadow-crimson">
                  <span className="text-xs font-bold uppercase tracking-wider text-crimson-500">
                    Recommended Daily Target
                  </span>
                  <p
                    data-testid="target-calories-value"
                    className="mt-2 text-3xl font-extrabold tabular-nums text-zinc-950 dark:text-white"
                  >
                    {res.targetCalories}{' '}
                    <span className="text-xs font-medium text-zinc-400">kcal/day</span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                    Weekly energy delta:{' '}
                    {res.estimatedWeeklyEnergyDeltaKcal > 0 ? '+' : ''}
                    {res.estimatedWeeklyEnergyDeltaKcal} kcal/wk
                  </p>
                </div>
              </div>

              {/* Macronutrients & Fiber */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      Daily Macronutrient &amp; Fiber Allocation
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Protein 4 kcal/g &bull; Carbohydrates 4 kcal/g &bull; Fat 9 kcal/g
                    </p>
                  </div>
                  <Activity className="h-4 w-4 text-crimson-500" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                  <ProgressRing
                    value={res.macros.proteinG}
                    max={res.macros.proteinG}
                    size={104}
                    label={`Protein (${res.macros.proteinPct}%)`}
                    unit="g"
                    accentColor="#dc2626"
                  />
                  <ProgressRing
                    value={res.macros.carbsG}
                    max={res.macros.carbsG}
                    size={104}
                    label={`Carbs (${res.macros.carbsPct}%)`}
                    unit="g"
                    accentColor="#3b82f6"
                  />
                  <ProgressRing
                    value={res.macros.fatG}
                    max={res.macros.fatG}
                    size={104}
                    label={`Fats (${res.macros.fatPct}%)`}
                    unit="g"
                    accentColor="#f59e0b"
                  />
                  <ProgressRing
                    value={res.macros.fiberG}
                    max={res.macros.fiberG}
                    size={104}
                    label="Dietary Fiber"
                    unit="g"
                    accentColor="#10b981"
                  />
                </div>
              </div>

              {/* Transparent Formula, Inputs & Uncertainty Disclosure */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-obsidian-900/70 p-5 space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-200 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-crimson-500" />
                    Method &amp; Formula Transparency ({res.formulaName})
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    Calculated: {res.calculatedAtIso.slice(0, 10)}
                  </span>
                </div>

                <p className="rounded-lg bg-white dark:bg-obsidian-950 border border-zinc-200 dark:border-zinc-800 p-3 font-mono text-[11px] text-zinc-800 dark:text-zinc-300">
                  {res.formulaExpression}
                </p>

                <p>{res.uncertaintyExplanation}</p>

                <div className="space-y-1.5 pt-1">
                  {res.safetyNotices.map((notice, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {notice.includes('Safety') || notice.includes('Floor') ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      )}
                      <span>{notice}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
