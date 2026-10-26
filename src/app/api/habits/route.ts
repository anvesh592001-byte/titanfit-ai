import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchHabitsAndLogs } from '@/lib/db/repositories';
import {
  habitCreateSchema,
  habitToggleSchema,
  isoDateSchema
} from '@/lib/validation/schemas';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const today = getLocalIsoDate();
    const start = isoDateSchema.parse(searchParams.get('start') ?? today);
    const end = isoDateSchema.parse(searchParams.get('end') ?? today);

    const data = await fetchHabitsAndLogs(supabase, user.id, start, end);
    return NextResponse.json(data);
  } catch (err) {
    return handleApiRouteError(err);
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    data: habitCreateSchema
  }),
  z.object({
    action: z.literal('toggle'),
    data: habitToggleSchema
  })
]);

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `habits:${user.id}`, limit: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = actionSchema.parse(body);

    if (parsed.action === 'create') {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          title: parsed.data.title,
          habit_type: parsed.data.habit_type,
          is_active: true
        })
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ habit: data }, { status: 201 });
    }

    // Verify habit belongs to user before toggling
    const { data: ownHabit, error: hErr } = await supabase
      .from('habits')
      .select('id')
      .eq('id', parsed.data.habit_id)
      .eq('user_id', user.id)
      .single();

    if (hErr || !ownHabit) {
      return NextResponse.json({ error: 'Habit not found.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('habit_logs')
      .upsert(
        {
          user_id: user.id,
          habit_id: parsed.data.habit_id,
          log_date: parsed.data.log_date,
          completed: parsed.data.completed
        },
        { onConflict: 'user_id,habit_id,log_date' }
      )
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ habitLog: data });
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
      return NextResponse.json({ error: 'Habit id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
