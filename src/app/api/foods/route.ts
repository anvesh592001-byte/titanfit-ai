import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchFoodCatalogForUser } from '@/lib/db/repositories';
import { customFoodCreateSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const catalog = await fetchFoodCatalogForUser(supabase, user.id);
    return NextResponse.json(catalog);
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `customfood:${user.id}`, limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = customFoodCreateSchema.parse(body);

    const { data, error } = await supabase
      .from('user_custom_foods')
      .insert({
        user_id: user.id,
        ...parsed
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ customFood: data }, { status: 201 });
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
      return NextResponse.json({ error: 'Custom food id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_custom_foods')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
