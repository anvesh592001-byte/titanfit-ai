import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabasePublicConfig, isProtectedPathname } from './config';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const { url, publicKey, isConfigured } = getSupabasePublicConfig();

  // When Supabase environment variables are not configured yet, still enforce protected route guards
  // so unauthenticated visitors never access protected app views or see simulated user sessions.
  if (!isConfigured) {
    if (isProtectedPathname(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('redirectTo', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>
      ) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      }
    }
  });

  // Always call getUser() to revalidate the Auth token and refresh session cookies safely.
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (isProtectedPathname(pathname)) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.search = '';
      loginUrl.searchParams.set('redirectTo', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }

    // Handle accounts whose email has not been verified yet without redirect loops
    const isEmailVerified = Boolean(user.email_confirmed_at || user.confirmed_at);
    if (!isEmailVerified && pathname !== '/auth/verify-email') {
      const verifyUrl = request.nextUrl.clone();
      verifyUrl.pathname = '/auth/verify-email';
      verifyUrl.search = '';
      if (user.email) {
        verifyUrl.searchParams.set('email', user.email);
      }
      return NextResponse.redirect(verifyUrl);
    }
  }

  // Redirect already authenticated & verified users away from login/signup
  if (user && (user.email_confirmed_at || user.confirmed_at)) {
    if (pathname === '/login' || pathname === '/signup') {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = '/dashboard';
      dashboardUrl.search = '';
      return NextResponse.redirect(dashboardUrl);
    }
  }

  return supabaseResponse;
}
