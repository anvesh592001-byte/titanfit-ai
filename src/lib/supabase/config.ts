export interface SupabasePublicConfig {
  url: string;
  publicKey: string;
  isConfigured: boolean;
}

/**
 * Supports both NEXT_PUBLIC_SUPABASE_ANON_KEY and the newer
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY format (`sb_publishable_...`).
 * Never reads or exposes service-role or secret keys.
 */
export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const publicKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  const isValidUrl = /^https?:\/\/.+/i.test(url);
  const isConfigured = Boolean(isValidUrl && publicKey.length >= 16);

  return {
    url,
    publicKey,
    isConfigured
  };
}

export const PROTECTED_ROUTE_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/nutrition',
  '/food-tracker',
  '/workouts',
  '/workout-history',
  '/ai-coach',
  '/progress',
  '/grocery-list',
  '/profile',
  '/settings'
] as const;

export function isProtectedPathname(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
