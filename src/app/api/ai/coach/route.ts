import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { aiCoachRequestSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';
import {
  fetchFoodCatalogForUser,
  fetchFoodLogsByDateRange,
  fetchProgressLogs,
  fetchUserProfileAndPreferences,
  fetchWorkoutLogs
} from '@/lib/db/repositories';
import { calculateCalorieTargets } from '@/lib/calculations/calorie-engine';
import {
  generateCoachReply,
  getLlmRuntimeConfig,
  matchFoodsForPrompt
} from '@/lib/ai/coach-service';
import { getLocalIsoDate } from '@/lib/security/sanitize';

export async function GET() {
  try {
    await requireAuthenticatedUser();
    const llm = getLlmRuntimeConfig();
    return NextResponse.json({
      configured: llm.isConfigured,
      model: llm.model
    });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();

    const rl = checkRateLimit({
      key: `aicoach:${user.id}`,
      limit: 15,
      windowMs: 5 * 60_000
    });
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error: `AI Coach rate limit reached (15 messages per 5 minutes). Please retry in ${rl.retryAfterSeconds}s.`,
          code: 'RATE_LIMITED'
        },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    const parsed = aiCoachRequestSchema.parse(body);

    const now = new Date();
    const todayStr = getLocalIsoDate(now);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const start7Str = getLocalIsoDate(sevenDaysAgo);

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    const start14Str = getLocalIsoDate(fourteenDaysAgo);

    // Fetch strictly authenticated user's own summaries
    const [{ profile, preferences }, catalog, foodLogs7, progress7, workouts14] =
      await Promise.all([
        fetchUserProfileAndPreferences(supabase, user.id),
        fetchFoodCatalogForUser(supabase, user.id),
        fetchFoodLogsByDateRange(supabase, user.id, start7Str, todayStr),
        fetchProgressLogs(supabase, user.id, start7Str, todayStr),
        fetchWorkoutLogs(supabase, user.id, start14Str)
      ]);

    const deterministicTargets = profile
      ? calculateCalorieTargets({
          dateOfBirth: profile.date_of_birth,
          heightCm: profile.height_cm,
          weightKg: profile.weight_kg,
          sexForCalculation: profile.sex_for_calculation,
          activityLevel: profile.activity_level,
          fitnessGoal: profile.fitness_goal
        })
      : null;

    // Summarize 7-day nutrition deterministically
    const byDay = new Map<string, { cal: number; pro: number }>();
    for (const log of foodLogs7) {
      const prev = byDay.get(log.log_date) ?? { cal: 0, pro: 0 };
      prev.cal += log.calories;
      prev.pro += log.protein_g;
      byDay.set(log.log_date, prev);
    }
    const dayCount = byDay.size;
    const avgCal =
      dayCount > 0
        ? Math.round(
            Array.from(byDay.values()).reduce((a, b) => a + b.cal, 0) / dayCount
          )
        : null;
    const avgPro =
      dayCount > 0
        ? Math.round(
            Array.from(byDay.values()).reduce((a, b) => a + b.pro, 0) / dayCount
          )
        : null;

    const sleepRows = progress7.filter((p) => p.sleep_hours !== null);
    const avgSleep =
      sleepRows.length > 0
        ? Math.round(
            (sleepRows.reduce((a, b) => a + (b.sleep_hours ?? 0), 0) /
              sleepRows.length) *
              10
          ) / 10
        : null;

    const stepRows = progress7.filter((p) => p.steps !== null);
    const avgSteps =
      stepRows.length > 0
        ? Math.round(
            stepRows.reduce((a, b) => a + (b.steps ?? 0), 0) / stepRows.length
          )
        : null;

    const weightRows = progress7.filter((p) => p.weight_kg !== null);
    const latestWeight =
      weightRows.length > 0
        ? weightRows[weightRows.length - 1]!.weight_kg
        : profile?.weight_kg ?? null;

    const matchedFoods = matchFoodsForPrompt(parsed.message, catalog.foods);

    const coachResponse = await generateCoachReply({
      message: parsed.message,
      history: parsed.history,
      context: {
        profile: profile
          ? {
              fitness_goal: profile.fitness_goal,
              activity_level: profile.activity_level,
              dietary_preference: profile.dietary_preference,
              preferred_units: profile.preferred_units,
              country: profile.country,
              food_budget: profile.food_budget
            }
          : null,
        preferences: preferences
          ? {
              allergies: preferences.allergies,
              excluded_foods: preferences.excluded_foods,
              meals_per_day: preferences.meals_per_day,
              workout_location: preferences.workout_location,
              equipment: preferences.equipment,
              training_experience: preferences.training_experience,
              workout_days_per_week: preferences.workout_days_per_week,
              session_duration_minutes: preferences.session_duration_minutes
            }
          : null,
        deterministicTargets,
        recentSummary: {
          loggedFoodDaysLast7: dayCount,
          avgDailyCaloriesLast7: avgCal,
          avgDailyProteinGLast7: avgPro,
          workoutsCompletedLast14: workouts14.filter((w) => w.completed).length,
          latestWeightKg: latestWeight,
          avgSleepHoursLast7: avgSleep,
          avgStepsLast7: avgSteps
        },
        matchedVerifiedFoods: matchedFoods
      }
    });

    return NextResponse.json(coachResponse);
  } catch (err) {
    return handleApiRouteError(err);
  }
}
