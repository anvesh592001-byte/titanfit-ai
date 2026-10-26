import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { sanitizeRedirectPath } from '@/lib/security/sanitize';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = sanitizeRedirectPath(searchParams.get('next'), '/onboarding');

  const { isConfigured } = getSupabasePublicConfig();
  if (!isConfigured) {
    return NextResponse.redirect(
      `${origin}/auth/verify-email?status=error&message=${encodeURIComponent(
        'Supabase environment variables are not configured yet.'
      )}`
    );
  }

  try {
    const supabase = createServerSupabaseClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(
        `${origin}/auth/verify-email?status=error&message=${encodeURIComponent(error.message)}`
      );
    }

    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash: tokenHash
      });
      if (!error) {
        const destination = type === 'recovery' ? '/reset-password' : next;
        return NextResponse.redirect(`${origin}${destination}`);
      }
      return NextResponse.redirect(
        `${origin}/auth/verify-email?status=error&message=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${origin}/auth/verify-email?status=missing_params`);
  } catch {
    return NextResponse.redirect(
      `${origin}/auth/verify-email?status=error&message=${encodeURIComponent(
        'Verification link could not be processed. Request a fresh link.'
      )}`
    );
  }
}
