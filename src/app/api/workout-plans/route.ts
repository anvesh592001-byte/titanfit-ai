import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchSavedWorkoutPlans } from '@/lib/db/repositories';
import { workoutPlanSaveSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const plans = await fetchSavedWorkoutPlans(supabase, user.id);
    return NextResponse.json({ plans });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `workoutplan:${user.id}`, limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = workoutPlanSaveSchema.parse(body);

    if (parsed.id) {
      const { data, error } = await supabase
        .from('workout_plans')
        .update({
          title: parsed.title,
          goal: parsed.goal,
          difficulty: parsed.difficulty,
          schedule_data: parsed.schedule_data
        })
        .eq('id', parsed.id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ plan: data });
    }

    const { data, error } = await supabase
      .from('workout_plans')
      .insert({
        user_id: user.id,
        title: parsed.title,
        goal: parsed.goal,
        difficulty: parsed.difficulty,
        schedule_data: parsed.schedule_data
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
      return NextResponse.json({ error: 'Workout plan id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
