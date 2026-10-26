import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchUserProfileAndPreferences } from '@/lib/db/repositories';
import { onboardingPayloadSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const data = await fetchUserProfileAndPreferences(supabase, user.id);
    return NextResponse.json({
      email: user.email ?? '',
      ...data
    });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();

    const rl = checkRateLimit({
      key: `profile:${user.id}`,
      limit: 20,
      windowMs: 60_000
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many updates. Retry in ${rl.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const body: unknown = await request.json();
    const parsed = onboardingPayloadSchema.parse(body);

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        ...parsed.profile
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      throw new Error(profileError.message);
    }

    const { error: prefError } = await supabase.from('user_preferences').upsert(
      {
        user_id: user.id,
        ...parsed.preferences
      },
      { onConflict: 'user_id' }
    );

    if (prefError) {
      throw new Error(prefError.message);
    }

    // Seed starter habits on first onboarding if user has zero habits yet
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) === 0) {
      await supabase.from('habits').insert([
        { user_id: user.id, title: 'Drink 2.5L Water', habit_type: 'hydration', is_active: true },
        { user_id: user.id, title: 'Hit Daily Protein Target', habit_type: 'nutrition', is_active: true },
        { user_id: user.id, title: 'Walk 8,000+ Steps', habit_type: 'movement', is_active: true },
        { user_id: user.id, title: 'Sleep 7.5+ Hours', habit_type: 'sleep', is_active: true }
      ]);
    }

    const updated = await fetchUserProfileAndPreferences(supabase, user.id);
    return NextResponse.json(updated);
  } catch (err) {
    return handleApiRouteError(err);
  }
}
