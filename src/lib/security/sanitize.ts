/**
 * Security sanitization helpers for redirects, error messages, and user input.
 */

export function sanitizeRedirectPath(
  candidate: string | null | undefined,
  fallback = '/dashboard'
): string {
  if (!candidate || typeof candidate !== 'string') {
    return fallback;
  }
  const trimmed = candidate.trim();
  // Must begin with single '/' and never '//' or '/\' or contain protocol schemes
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('://') ||
    /[\r\n\t\0]/.test(trimmed)
  ) {
    return fallback;
  }
  return trimmed;
}

export function toSafeErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred. Please try again.'
): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    // Avoid leaking raw SQL connection strings or stack traces
    if (/postgres:\/\/|supabase_service_role|secret/i.test(error.message)) {
      return fallback;
    }
    return error.message || fallback;
  }
  return fallback;
}

export function getLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
