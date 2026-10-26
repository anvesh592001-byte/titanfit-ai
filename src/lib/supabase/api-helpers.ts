import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { SupabaseNotConfiguredError } from './client';
import { UnauthorizedError } from './server';
import { toSafeErrorMessage } from '@/lib/security/sanitize';

export function handleApiRouteError(error: unknown): NextResponse {
  if (error instanceof SupabaseNotConfiguredError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'SUPABASE_NOT_CONFIGURED'
      },
      { status: 503 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      {
        error: error.message,
        code: 'UNAUTHORIZED'
      },
      { status: 401 }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? 'Invalid request payload.',
        code: 'VALIDATION_ERROR',
        issues: error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message
        }))
      },
      { status: 400 }
    );
  }

  const code = (error as { code?: string } | null)?.code;
  if (code === 'LLM_NOT_CONFIGURED') {
    return NextResponse.json(
      {
        error: toSafeErrorMessage(error),
        code: 'LLM_NOT_CONFIGURED'
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      error: toSafeErrorMessage(error),
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  );
}
