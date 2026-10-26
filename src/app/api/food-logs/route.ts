import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import { handleApiRouteError } from '@/lib/supabase/api-helpers';
import { fetchFoodLogsByDateRange } from '@/lib/db/repositories';
import {
  foodLogCreateSchema,
  foodLogUpdateSchema,
  isoDateSchema
} from '@/lib/validation/schemas';
import { calculateFoodNutrition } from '@/lib/nutrition/nutrition-engine';
import { getLocalIsoDate } from '@/lib/security/sanitize';
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const today = getLocalIsoDate();
    const startDate = isoDateSchema.parse(searchParams.get('start') ?? searchParams.get('date') ?? today);
    const endDate = isoDateSchema.parse(searchParams.get('end') ?? searchParams.get('date') ?? today);

    const logs = await fetchFoodLogsByDateRange(supabase, user.id, startDate, endDate);
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

const batchOrSingleSchema = z.union([
  foodLogCreateSchema,
  z.object({ entries: z.array(foodLogCreateSchema).min(1).max(20) })
]);

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const rl = checkRateLimit({ key: `foodlog:${user.id}`, limit: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body: unknown = await request.json();
    const parsed = batchOrSingleSchema.parse(body);
    const items = 'entries' in parsed ? parsed.entries : [parsed];

    // Server deterministically recalculates nutrients from per-100g & quantity_g
    const rowsToInsert = items.map((item) => {
      const calc = calculateFoodNutrition(
        {
          calories_per_100g: item.calories_per_100g,
          protein_per_100g: item.protein_per_100g,
          carbs_per_100g: item.carbs_per_100g,
          fat_per_100g: item.fat_per_100g,
          fiber_per_100g: item.fiber_per_100g,
          is_verified: Boolean(item.food_id)
        },
        item.quantity_g
      );

      return {
        user_id: user.id,
        food_id: item.food_id,
        food_name_snapshot: item.food_name_snapshot,
        log_date: item.log_date,
        meal_type: item.meal_type,
        quantity_g: calc.quantityG,
        calories: calc.calories,
        protein_g: calc.proteinG,
        carbs_g: calc.carbsG,
        fat_g: calc.fatG,
        fiber_g: calc.fiberG
      };
    });

    const { data, error } = await supabase
      .from('food_logs')
      .insert(rowsToInsert)
      .select('*');

    if (error) throw new Error(error.message);
    return NextResponse.json({ logs: data }, { status: 201 });
  } catch (err) {
    return handleApiRouteError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await requireAuthenticatedUser();
    const body: unknown = await request.json();
    const parsed = foodLogUpdateSchema.parse(body);

    const { data: existing, error: fetchErr } = await supabase
      .from('food_logs')
      .select('*')
      .eq('id', parsed.id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Food log entry not found.' }, { status: 404 });
    }

    const oldQty = Number(existing.quantity_g) || 100;
    const scale = parsed.quantity_g / oldQty;

    const updatedPayload = {
      meal_type: parsed.meal_type ?? existing.meal_type,
      quantity_g: parsed.quantity_g,
      calories: Math.round(Number(existing.calories) * scale * 10) / 10,
      protein_g: Math.round(Number(existing.protein_g) * scale * 10) / 10,
      carbs_g: Math.round(Number(existing.carbs_g) * scale * 10) / 10,
      fat_g: Math.round(Number(existing.fat_g) * scale * 10) / 10,
      fiber_g:
        existing.fiber_g === null
          ? null
          : Math.round(Number(existing.fiber_g) * scale * 10) / 10
    };

    const { data, error } = await supabase
      .from('food_logs')
      .update(updatedPayload)
      .eq('id', parsed.id)
      .eq('user_id', user.id)
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
      return NextResponse.json({ error: 'Log id is required.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiRouteError(err);
  }
}
