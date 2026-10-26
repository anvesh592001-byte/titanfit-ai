import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import {
  fetchSavedMealPlans,
  fetchUserProfileAndPreferences
} from '@/lib/db/repositories';
import { mealPlanSaveSchema } from '@/lib/validation/schemas';
import { validateMealPlan } from '@/lib/nutrition/diet-planner';
import type { MealPlanData } from '@/types/domain';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const plans = await fetchSavedMealPlans(supabase, user.id);
    return NextResponse.json({ plans });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `mealplan:${user.id}`, limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = mealPlanSaveSchema.parse(body);

    const { profile, preferences } = await fetchUserProfileAndPreferences(
      supabase,
      user.id
    );
    const planData = parsed.plan_data as unknown as MealPlanData;

    // Server-side validation of hard exclusions before saving
    if (Array.isArray(planData?.days)) {
      const check = validateMealPlan(
        planData,
        planData.dietaryPreference ?? profile?.dietary_preference ?? 'omnivore',
        preferences?.allergies ?? planData.excludedAllergens ?? [],
        preferences?.excluded_foods ?? planData.excludedFoods ?? []
      );
      if (!check.valid) {
        return NextResponse.json(
          { error: `Safety validation blocked save: ${check.violations[0]}` },
          { status: 400 }
        );
      }
    }

    if (parsed.id) {
      const { data, error } = await supabase
        .from('meal_plans')
        .update({
          title: parsed.title,
          plan_date: parsed.plan_date,
          plan_type: parsed.plan_type,
          target_calories: parsed.target_calories,
          plan_data: parsed.plan_data
        })
        .eq('id', parsed.id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ plan: data });
    }

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        title: parsed.title,
        plan_date: parsed.plan_date,
        plan_type: parsed.plan_type,
        target_calories: parsed.target_calories,
        plan_data: parsed.plan_data
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ plan: data }, { status: 201 });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Meal plan id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
