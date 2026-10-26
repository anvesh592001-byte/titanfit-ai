import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from './config';

export class SupabaseNotConfiguredError extends Error {
  public readonly code = 'SUPABASE_NOT_CONFIGURED';
  constructor() {
    super(
      'Supabase connection is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in .env.local.'
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient {
  const { url, publicKey, isConfigured } = getSupabasePublicConfig();
  if (!isConfigured) {
    throw new SupabaseNotConfiguredError();
  }
  if (!browserClient) {
    browserClient = createBrowserClient(url, publicKey);
  }
  return browserClient;
}
