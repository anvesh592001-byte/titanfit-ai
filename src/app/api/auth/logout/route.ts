import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';

export async function POST() {
  const { isConfigured } = getSupabasePublicConfig();
  if (!isConfigured) {
    return NextResponse.json({ ok: true });
  }
  try {
    const supabase = createServerSupabaseClient();
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
