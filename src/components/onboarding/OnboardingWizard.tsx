'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type {
  ActivityLevel,
  DietaryPreference,
  FitnessGoal,
  PreferredUnits,
  ProfileRow,
  SexForCalculation,
  TrainingExperience,
  UserPreferencesRow,
  WorkoutLocation
} from '@/types/domain';
import { ErrorBanner } from '@/components/ui/Primitives';
import { useToast } from '@/components/ui/ToastProvider';

const COMMON_ALLERGENS = [
  'peanuts',
  'tree_nuts',
  'dairy',
  'eggs',
  'soy',
  'gluten',
  'fish',
  'shellfish',
  'sesame'
];

const EQUIPMENT_OPTIONS = [
  'bodyweight',
  'dumbbells',
  'barbell',
  'resistance_bands',
  'pullup_bar',
  'kettlebell',
  'machines'
];

const LIMITATION_OPTIONS = [
  'knee_pain',
  'lower_back',
  'shoulder',
  'wrist',
  'high_impact'
];

interface OnboardingWizardProps {
  initialProfile: ProfileRow | null;
  initialPreferences: UserPreferencesRow | null;
  defaultName?: string;
  mode?: 'onboarding' | 'profile';
}

export function OnboardingWizard({
  initialProfile,
  initialPreferences,
  defaultName = '',
  mode = 'onboarding'
}: OnboardingWizardProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Biometrics & Units
  const [fullName, setFullName] = useState(initialProfile?.full_name || defaultName || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialProfile?.date_of_birth ?? '1997-06-15'
  );
  const [heightCm, setHeightCm] = useState(initialProfile?.height_cm ?? 170);
  const [weightKg, setWeightKg] = useState(initialProfile?.weight_kg ?? 70);
  const [sex, setSex] = useState<SexForCalculation>(
    initialProfile?.sex_for_calculation ?? 'unspecified'
  );
  const [preferredUnits, setPreferredUnits] = useState<PreferredUnits>(
    initialProfile?.preferred_units ?? 'metric'
  );
  const [country, setCountry] = useState(initialProfile?.country ?? 'IN');

  // Step 2: Goals & Nutrition Preferences
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>(
    initialProfile?.fitness_goal ?? 'fat_loss'
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(
    initialProfile?.activity_level ?? 'moderately_active'
  );
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(
    initialProfile?.dietary_preference ?? 'vegetarian'
  );
  const [allergies, setAllergies] = useState<string[]>(
    initialPreferences?.allergies ?? []
  );
  const [excludedFoodsText, setExcludedFoodsText] = useState(
    (initialPreferences?.excluded_foods ?? []).join(', ')
  );
  const [preferredFoodsText, setPreferredFoodsText] = useState(
    (initialPreferences?.preferred_foods ?? []).join(', ')
  );
  const [mealsPerDay, setMealsPerDay] = useState(
    initialPreferences?.meals_per_day ?? 4
  );
  const [foodBudget, setFoodBudget] = useState<string>(
    initialProfile?.food_budget !== null && initialProfile?.food_budget !== undefined
      ? String(initialProfile.food_budget)
      : ''
  );

  // Step 3: Training Setup
  const [trainingExperience, setTrainingExperience] = useState<TrainingExperience>(
    initialPreferences?.training_experience ?? 'beginner'
  );
  const [workoutLocation, setWorkoutLocation] = useState<WorkoutLocation>(
    initialPreferences?.workout_location ?? 'gym'
  );
  const [equipment, setEquipment] = useState<string[]>(
    initialPreferences?.equipment ?? ['bodyweight', 'dumbbells']
  );
  const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState(
    initialPreferences?.workout_days_per_week ?? 4
  );
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(
    initialPreferences?.session_duration_minutes ?? 45
  );
  const [limitations, setLimitations] = useState<string[]>(
    initialPreferences?.exercise_limitations ?? []
  );

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const handleSave = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your name.');
      setStep(1);
      return;
    }

    setSaving(true);
    try {
      const parseCommaList = (txt: string) =>
        txt
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            full_name: fullName.trim(),
            date_of_birth: dateOfBirth,
            height_cm: Number(heightCm),
            weight_kg: Number(weightKg),
            sex_for_calculation: sex,
            fitness_goal: fitnessGoal,
            activity_level: activityLevel,
            dietary_preference: dietaryPreference,
            preferred_units: preferredUnits,
            country: country.trim() || 'IN',
            food_budget: foodBudget.trim() ? Number(foodBudget) : null
          },
          preferences: {
            allergies,
            excluded_foods: parseCommaList(excludedFoodsText),
            preferred_foods: parseCommaList(preferredFoodsText),
            meals_per_day: Number(mealsPerDay),
            workout_location: workoutLocation,
            equipment,
            training_experience: trainingExperience,
            workout_days_per_week: Number(workoutDaysPerWeek),
            session_duration_minutes: Number(sessionDurationMinutes),
            exercise_limitations: limitations
          }
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to save profile.');
      }

      pushToast({
        kind: 'success',
        title: mode === 'onboarding' ? 'Onboarding Complete!' : 'Profile Updated',
        description: 'Your biometrics, nutrition filters & training setup are saved to Supabase.'
      });

      if (mode === 'onboarding') {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-crimson-500">
            <Sparkles className="h-3.5 w-3.5" />
            {mode === 'onboarding' ? 'Personalized Athlete Onboarding' : 'Athlete Profile & Preferences'}
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-white">
            {mode === 'onboarding'
              ? 'Configure Your Coaching Profile'
              : 'Manage Biometrics, Diet & Training'}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Optional fields can be skipped now and updated anytime.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`h-9 w-9 rounded-xl text-xs font-bold transition-all ${
                step === s
                  ? 'bg-crimson-600 text-white shadow-crimson'
                  : 'border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-obsidian-900 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-obsidian-900 p-6 sm:p-8 shadow-card space-y-6">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Step 1 of 3 — Biometrics, Units &amp; Region
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Height (cm) *
                </label>
                <input
                  type="number"
                  min={80}
                  max={260}
                  step="0.5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Current Weight (kg) *
                </label>
                <input
                  type="number"
                  min={20}
                  max={350}
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Calorie Equation Constant (Optional)
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as SexForCalculation)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="unspecified">Prefer not to specify (midpoint)</option>
                  <option value="male">Male (+5 Mifflin–St Jeor)</option>
                  <option value="female">Female (-161 Mifflin–St Jeor)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Preferred Display Units
                </label>
                <select
                  value={preferredUnits}
                  onChange={(e) => setPreferredUnits(e.target.value as PreferredUnits)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="metric">Metric (kg, cm, ml)</option>
                  <option value="imperial">Imperial (lbs, ft/in, fl oz)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Country / Regional Cuisine Focus
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="IN">India (Indian &amp; Global Staples)</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="SG">Singapore</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Step 2 of 3 — Goal, Diet, Allergies &amp; Budget
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Fitness Goal *
                </label>
                <select
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value as FitnessGoal)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="fat_loss">Sustainable Fat Loss</option>
                  <option value="recomposition">Body Recomposition</option>
                  <option value="muscle_gain">Lean Muscle Gain</option>
                  <option value="maintenance">Weight Maintenance</option>
                  <option value="endurance">Endurance Conditioning</option>
                  <option value="general_fitness">General Health &amp; Consistency</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Daily Activity Level *
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="sedentary">Sedentary (1.20x)</option>
                  <option value="lightly_active">Lightly Active (1.375x)</option>
                  <option value="moderately_active">Moderately Active (1.55x)</option>
                  <option value="very_active">Very Active (1.725x)</option>
                  <option value="extra_active">Extra Active (1.90x)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Dietary Preference *
                </label>
                <select
                  value={dietaryPreference}
                  onChange={(e) =>
                    setDietaryPreference(e.target.value as DietaryPreference)
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="vegetarian">Vegetarian (Lacto-Veg)</option>
                  <option value="eggetarian">Eggetarian (Veg + Eggs)</option>
                  <option value="omnivore">Non-Vegetarian / Omnivore</option>
                  <option value="pescatarian">Pescatarian (Veg + Fish/Eggs)</option>
                  <option value="vegan">Vegan (100% Plant-Based)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Meals Per Day
                </label>
                <select
                  value={mealsPerDay}
                  onChange={(e) => setMealsPerDay(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} meals / day
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Monthly Food Budget (Optional)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 6000"
                  value={foodBudget}
                  onChange={(e) => setFoodBudget(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Food Allergies (Hard Exclusions — Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_ALLERGENS.map((item) => {
                  const selected = allergies.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleItem(allergies, item, setAllergies)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        selected
                          ? 'border-crimson-600 bg-crimson-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {item.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Additional Excluded Foods (comma-separated, optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. broccoli, salmon"
                  value={excludedFoodsText}
                  onChange={(e) => setExcludedFoodsText(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Preferred Staples (comma-separated, optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. idli, paneer, dal, chicken"
                  value={preferredFoodsText}
                  onChange={(e) => setPreferredFoodsText(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3">
              Step 3 of 3 — Training Experience, Equipment &amp; Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Training Experience
                </label>
                <select
                  value={trainingExperience}
                  onChange={(e) =>
                    setTrainingExperience(e.target.value as TrainingExperience)
                  }
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="beginner">Beginner (0–1 yr structured lifting)</option>
                  <option value="intermediate">Intermediate (1–3 yrs consistent)</option>
                  <option value="advanced">Advanced (3+ yrs progressive training)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Workout Location
                </label>
                <select
                  value={workoutLocation}
                  onChange={(e) => setWorkoutLocation(e.target.value as WorkoutLocation)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  <option value="gym">Commercial / Equipped Gym</option>
                  <option value="home">Home Workout Space</option>
                  <option value="outdoor">Outdoor / Calisthenics</option>
                  <option value="hybrid">Hybrid (Home + Gym)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Training Days Per Week
                </label>
                <select
                  value={workoutDaysPerWeek}
                  onChange={(e) => setWorkoutDaysPerWeek(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  {[2, 3, 4, 5, 6].map((d) => (
                    <option key={d} value={d}>
                      {d} days / week (with scheduled recovery)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Session Duration (Minutes)
                </label>
                <select
                  value={sessionDurationMinutes}
                  onChange={(e) => setSessionDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 px-3.5 py-2.5 text-sm"
                >
                  {[25, 35, 45, 60, 75, 90].map((m) => (
                    <option key={m} value={m}>
                      {m} minutes / session
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Available Equipment
              </label>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const selected = equipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleItem(equipment, eq, setEquipment)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        selected
                          ? 'border-crimson-600 bg-crimson-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {eq.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Joint / Movement Sensitivities to Protect (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {LIMITATION_OPTIONS.map((lim) => {
                  const selected = limitations.includes(lim);
                  return (
                    <button
                      key={lim}
                      type="button"
                      onClick={() => toggleItem(limitations, lim, setLimitations)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                        selected
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-obsidian-950 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {lim.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-5">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {mode === 'onboarding' && step < 3 && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
              >
                Skip Optional &amp; Save Now
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-crimson-600 px-5 py-2.5 text-sm font-bold text-white shadow-crimson hover:bg-crimson-700"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-xl bg-crimson-600 px-6 py-2.5 text-sm font-bold text-white shadow-crimson hover:bg-crimson-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving
                  ? 'Saving to Supabase...'
                  : mode === 'onboarding'
                  ? 'Complete Onboarding'
                  : 'Save Profile Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
