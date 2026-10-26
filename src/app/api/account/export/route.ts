import { NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `export:${user.id}`, limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Export rate limit exceeded.' }, { status: 429 });
    }

    const [
      profile,
      preferences,
      customFoods,
      foodLogs,
      mealPlans,
      workoutPlans,
      workoutLogs,
      exerciseLogs,
      progressLogs,
      habits,
      habitLogs,
      groceryLists
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('user_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_custom_foods').select('*').eq('user_id', user.id),
      supabase.from('food_logs').select('*').eq('user_id', user.id),
      supabase.from('meal_plans').select('*').eq('user_id', user.id),
      supabase.from('workout_plans').select('*').eq('user_id', user.id),
      supabase.from('workout_logs').select('*').eq('user_id', user.id),
      supabase.from('exercise_logs').select('*').eq('user_id', user.id),
      supabase.from('progress_logs').select('*').eq('user_id', user.id),
      supabase.from('habits').select('*').eq('user_id', user.id),
      supabase.from('habit_logs').select('*').eq('user_id', user.id),
      supabase.from('grocery_lists').select('*').eq('user_id', user.id)
    ]);

    const exportBundle = {
      exportedAtIso: new Date().toISOString(),
      platform: 'TitanFit AI',
      account: {
        id: user.id,
        email: user.email
      },
      profile: profile.data ?? null,
      preferences: preferences.data ?? null,
      customFoods: customFoods.data ?? [],
      foodLogs: foodLogs.data ?? [],
      mealPlans: mealPlans.data ?? [],
      workoutPlans: workoutPlans.data ?? [],
      workoutLogs: workoutLogs.data ?? [],
      exerciseLogs: exerciseLogs.data ?? [],
      progressLogs: progressLogs.data ?? [],
      habits: habits.data ?? [],
      habitLogs: habitLogs.data ?? [],
      groceryLists: groceryLists.data ?? []
    };

    return new NextResponse(JSON.stringify(exportBundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="titanfit-data-export-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`
      }
    });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
