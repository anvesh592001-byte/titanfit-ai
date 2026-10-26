import { NextResponse, type NextRequest } from 'next/server';
import {
  createOptionalAdminSupabaseClient,
  requireAuthenticatedUser
} from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { accountDeleteSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `deleteacct:${user.id}`, limit: 3, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    accountDeleteSchema.parse(body);

    // Delete all user-owned records across application tables explicitly (respects RLS delete policies)
    const userTables = [
      'habit_logs',
      'habits',
      'exercise_logs',
      'workout_logs',
      'workout_plans',
      'grocery_lists',
      'meal_plans',
      'food_logs',
      'user_custom_foods',
      'progress_logs',
      'user_preferences'
    ] as const;

    for (const tbl of userTables) {
      const { error } = await supabase.from(tbl).delete().eq('user_id', user.id);
      if (error) throw new Error(error.message);
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    if (profErr) throw new Error(profErr.message);

    // If server admin key is configured, also purge auth.users identity
    const adminClient = createOptionalAdminSupabaseClient();
    let authUserDeleted = false;
    if (adminClient) {
      const { error: adminErr } = await adminClient.auth.admin.deleteUser(user.id);
      if (!adminErr) {
        authUserDeleted = true;
      }
    }

    await supabase.auth.signOut();

    return NextResponse.json({
      ok: true,
      authUserDeleted,
      message: authUserDeleted
        ? 'Your TitanFit AI account and all associated data have been permanently deleted.'
        : 'All your TitanFit AI fitness, nutrition, profile, and progress records have been permanently deleted and your session has been signed out.'
    });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
