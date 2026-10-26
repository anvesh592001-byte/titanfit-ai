import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchWorkoutLogs } from '@/lib/db/repositories';
import { workoutLogCreateSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') ?? undefined;
    const logs = await fetchWorkoutLogs(supabase, user.id, startDate);
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `workoutlog:${user.id}`, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = workoutLogCreateSchema.parse(body);

    const { data: workoutLog, error: wlErr } = await supabase
      .from('workout_logs')
      .insert({
        user_id: user.id,
        workout_plan_id: parsed.workout_plan_id,
        workout_name: parsed.workout_name,
        workout_date: parsed.workout_date,
        duration_minutes: parsed.duration_minutes,
        notes: parsed.notes,
        completed: parsed.completed
      })
      .select('*')
      .single();

    if (wlErr || !workoutLog) {
      throw new Error(wlErr?.message ?? 'Failed to save workout log.');
    }

    if (parsed.exercises.length > 0) {
      const exerciseRows = parsed.exercises.map((ex) => ({
        user_id: user.id,
        workout_log_id: workoutLog.id,
        exercise_name: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        weight_kg: ex.weight_kg,
        duration_seconds: ex.duration_seconds
      }));

      const { error: exErr } = await supabase
        .from('exercise_logs')
        .insert(exerciseRows);

      if (exErr) throw new Error(exErr.message);
    }

    const logs = await fetchWorkoutLogs(supabase, user.id);
    return NextResponse.json({ workoutLog, logs }, { status: 201 });
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
      return NextResponse.json({ error: 'Workout log id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
