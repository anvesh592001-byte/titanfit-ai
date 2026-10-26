import { NextResponse } from 'next/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { getLlmRuntimeConfig } from '@/lib/ai/coach-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supa = getSupabasePublicConfig();
  const llm = getLlmRuntimeConfig();

  return NextResponse.json({
    supabaseConfigured: supa.isConfigured,
    llmConfigured: llm.isConfigured,
    llmModel: llm.model
  });
}
