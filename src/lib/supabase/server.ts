import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getSupabasePublicConfig } from './config';
import { SupabaseNotConfiguredError } from './client';

export function createServerSupabaseClient(): SupabaseClient {
  const { url, publicKey, isConfigured } = getSupabasePublicConfig();
  if (!isConfigured) {
    throw new SupabaseNotConfiguredError();
  }

  const cookieStore = cookies();

  return createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component render context cannot mutate cookies directly;
          // Next.js middleware refreshes session cookies on each request.
        }
      }
    }
  });
}

export class UnauthorizedError extends Error {
  public readonly code = 'UNAUTHORIZED';
  constructor(message = 'Authentication is required to perform this action.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Enforces server-side authentication via `supabase.auth.getUser()` (verifies JWT with Supabase Auth).
 * Never trusts client-provided user IDs or unverified session cookies.
 */
export async function requireAuthenticatedUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new UnauthorizedError();
  }

  return { supabase, user };
}

/**
 * Optional server-only admin client exclusively for full auth.users deletion in /api/account/delete
 * when SUPABASE_SERVICE_ROLE_KEY is configured on the server. NEVER imported in client modules.
 */
export function createOptionalAdminSupabaseClient(): SupabaseClient | null {
  const { url, isConfigured } = getSupabasePublicConfig();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!isConfigured || !serviceRoleKey) {
    return null;
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
