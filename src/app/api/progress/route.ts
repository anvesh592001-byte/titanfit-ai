import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchProgressLogs } from '@/lib/db/repositories';
import { progressLogUpsertSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') ?? undefined;
    const end = searchParams.get('end') ?? undefined;
    const logs = await fetchProgressLogs(supabase, user.id, start, end);
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `progress:${user.id}`, limit: 40, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = progressLogUpsertSchema.parse(body);

    // Merge with any existing record on the same log_date so quick water/step updates preserve weight/sleep
    const { data: existing } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', parsed.log_date)
      .maybeSingle();

    const payload = {
      user_id: user.id,
      log_date: parsed.log_date,
      weight_kg:
        parsed.weight_kg !== undefined
          ? parsed.weight_kg
          : existing?.weight_kg ?? null,
      waist_cm:
        parsed.waist_cm !== undefined
          ? parsed.waist_cm
          : existing?.waist_cm ?? null,
      steps:
        parsed.steps !== undefined ? parsed.steps : existing?.steps ?? null,
      sleep_hours:
        parsed.sleep_hours !== undefined
          ? parsed.sleep_hours
          : existing?.sleep_hours ?? null,
      water_ml:
        parsed.water_ml !== undefined
          ? parsed.water_ml
          : existing?.water_ml ?? null,
      energy_level:
        parsed.energy_level !== undefined
          ? parsed.energy_level
          : existing?.energy_level ?? null,
      notes:
        parsed.notes !== undefined ? parsed.notes : existing?.notes ?? null
    };

    const { data, error } = await supabase
      .from('progress_logs')
      .upsert(payload, { onConflict: 'user_id,log_date' })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ log: data });
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
      return NextResponse.json({ error: 'Progress log id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('progress_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
