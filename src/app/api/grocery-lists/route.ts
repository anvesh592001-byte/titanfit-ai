import { NextResponse, type NextRequest } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchGroceryLists } from '@/lib/db/repositories';
import { groceryListSaveSchema } from '@/lib/validation/schemas';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const lists = await fetchGroceryLists(supabase, user.id);
    return NextResponse.json({ lists });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `grocery:${user.id}`, limit: 40, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = groceryListSaveSchema.parse(body);

    if (parsed.id) {
      const { data, error } = await supabase
        .from('grocery_lists')
        .update({
          title: parsed.title,
          meal_plan_id: parsed.meal_plan_id,
          items: parsed.items
        })
        .eq('id', parsed.id)
        .eq('user_id', user.id)
        .select('*')
        .single();

      if (error) throw new Error(error.message);
      return NextResponse.json({ list: data });
    }

    const { data, error } = await supabase
      .from('grocery_lists')
      .insert({
        user_id: user.id,
        meal_plan_id: parsed.meal_plan_id,
        title: parsed.title,
        items: parsed.items
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ list: data }, { status: 201 });
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
      return NextResponse.json({ error: 'Grocery list id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('grocery_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
