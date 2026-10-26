import React from 'react';
import { requireAuthenticatedUser } from '@/lib/supabase/server';
import {
  fetchGroceryLists,
  fetchSavedMealPlans
} from '@/lib/db/repositories';
import { GroceryListClient } from '@/components/nutrition/GroceryListClient';

export default async function GroceryListPage() {
  const { supabase, user } = await requireAuthenticatedUser();
  const [lists, mealPlans] = await Promise.all([
    fetchGroceryLists(supabase, user.id),
    fetchSavedMealPlans(supabase, user.id)
  ]);

  return <GroceryListClient initialLists={lists} savedMealPlans={mealPlans} />;
}
