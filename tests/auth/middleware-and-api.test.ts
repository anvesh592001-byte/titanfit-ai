import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getSupabasePublicConfig, isProtectedPathname } from '@/lib/supabase/config';
import { updateSession } from '@/lib/supabase/middleware';

// Mock @supabase/ssr for controlled session & email-verification testing
const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser
    }
  }))
}));

describe('Supabase Auth Config, Middleware Session Handling & Protected Routes', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    mockGetUser.mockReset();
  });

  it('supports both NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo-project.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_valid_public_key_12345';

    const cfg = getSupabasePublicConfig();
    expect(cfg.isConfigured).toBe(true);
    expect(cfg.publicKey).toBe('sb_publishable_valid_public_key_12345');
  });

  it('identifies protected routes accurately', () => {
    expect(isProtectedPathname('/dashboard')).toBe(true);
    expect(isProtectedPathname('/food-tracker')).toBe(true);
    expect(isProtectedPathname('/workouts')).toBe(true);
    expect(isProtectedPathname('/ai-coach')).toBe(true);
    expect(isProtectedPathname('/settings')).toBe(true);
    expect(isProtectedPathname('/')).toBe(false);
    expect(isProtectedPathname('/calculator')).toBe(false);
    expect(isProtectedPathname('/privacy')).toBe(false);
  });

  it('redirects unauthenticated requests from protected routes to /login with redirectTo', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_public_key_value_1234567890';
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });

    const req = new NextRequest('http://localhost:3000/nutrition?plan=weekly');
    const res = await updateSession(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('location') ?? '';
    expect(location).toContain('/login?redirectTo=%2Fnutrition%3Fplan%3Dweekly');
  });

  it('redirects unverified email accounts to /auth/verify-email without redirect loops', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_public_key_value_1234567890';
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'u-1',
          email: 'pending@titanfit.test',
          email_confirmed_at: null
        }
      }
    });

    const req = new NextRequest('http://localhost:3000/dashboard');
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/auth/verify-email');
  });

  it('allows verified authenticated sessions onto protected routes and redirects /login -> /dashboard', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://demo-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon_public_key_value_1234567890';

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'u-verified',
          email: 'athlete@titanfit.test',
          email_confirmed_at: '2026-10-26T00:00:00Z'
        }
      }
    });

    const dashReq = new NextRequest('http://localhost:3000/dashboard');
    const dashRes = await updateSession(dashReq);
    expect(dashRes.status).toBe(200);

    const loginReq = new NextRequest('http://localhost:3000/login');
    const loginRes = await updateSession(loginReq);
    expect(loginRes.status).toBe(307);
    expect(loginRes.headers.get('location')).toContain('/dashboard');
  });
});
