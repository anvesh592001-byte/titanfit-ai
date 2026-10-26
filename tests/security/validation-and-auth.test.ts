import { beforeEach, describe, expect, it } from 'vitest';
import { sanitizeRedirectPath } from '@/lib/security/sanitize';
import {
  checkRateLimit,
  resetRateLimitForTests
} from '@/lib/security/rate-limit';
import {
  accountDeleteSchema,
  aiCoachRequestSchema,
  signUpSchema
} from '@/lib/validation/schemas';
import { buildCoachSystemPrompt, matchFoodsForPrompt } from '@/lib/ai/coach-service';

describe('Security Sanitization, Rate Limiting & Validation', () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  it('prevents open-redirect URLs in sanitizeRedirectPath', () => {
    expect(sanitizeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/food-tracker?date=2026-10-26')).toBe(
      '/food-tracker?date=2026-10-26'
    );
    expect(sanitizeRedirectPath('https://attacker.example/phish')).toBe('/dashboard');
    expect(sanitizeRedirectPath('//attacker.example')).toBe('/dashboard');
    expect(sanitizeRedirectPath('/\\attacker.example')).toBe('/dashboard');
  });

  it('enforces sliding-window rate limits accurately', () => {
    expect(checkRateLimit({ key: 'u1', limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    expect(checkRateLimit({ key: 'u1', limit: 2, windowMs: 60_000 }).allowed).toBe(true);
    const blocked = checkRateLimit({ key: 'u1', limit: 2, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('validates signup password strength, confirmation, and disclaimer consent', () => {
    const weak = signUpSchema.safeParse({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'short',
      confirmPassword: 'short',
      acceptDisclaimer: true
    });
    expect(weak.success).toBe(false);

    const valid = signUpSchema.safeParse({
      fullName: 'Test User',
      email: 'user@example.com',
      password: 'StrongPassword9',
      confirmPassword: 'StrongPassword9',
      acceptDisclaimer: true
    });
    expect(valid.success).toBe(true);
  });

  it('validates AI coach message limits and account deletion confirmation phrase', () => {
    expect(aiCoachRequestSchema.safeParse({ message: '' }).success).toBe(false);
    expect(
      aiCoachRequestSchema.safeParse({ message: 'x'.repeat(2005) }).success
    ).toBe(false);
    expect(
      accountDeleteSchema.safeParse({ confirmationText: 'delete my account' }).success
    ).toBe(false);
    expect(
      accountDeleteSchema.safeParse({ confirmationText: 'DELETE MY ACCOUNT' }).success
    ).toBe(true);
  });

  it('matches verified foods and embeds deterministic targets into AI coach system prompt without PII', () => {
    const matched = matchFoodsForPrompt('How much protein is in paneer and soya chunks?');
    expect(matched.some((f) => f.name.includes('Paneer'))).toBe(true);
    expect(matched.some((f) => f.name.includes('Soya Chunks'))).toBe(true);

    const prompt = buildCoachSystemPrompt({
      profile: {
        fitness_goal: 'muscle_gain',
        activity_level: 'moderately_active',
        dietary_preference: 'vegetarian',
        preferred_units: 'metric',
        country: 'IN',
        food_budget: 6000
      },
      preferences: {
        allergies: ['peanuts'],
        excluded_foods: [],
        meals_per_day: 4,
        workout_location: 'gym',
        equipment: ['dumbbells', 'barbell'],
        training_experience: 'intermediate',
        workout_days_per_week: 4,
        session_duration_minutes: 50
      },
      deterministicTargets: null,
      recentSummary: {
        loggedFoodDaysLast7: 5,
        avgDailyCaloriesLast7: 2350,
        avgDailyProteinGLast7: 132,
        workoutsCompletedLast14: 6,
        latestWeightKg: 71.2,
        avgSleepHoursLast7: 7.6,
        avgStepsLast7: 8900
      },
      matchedVerifiedFoods: matched
    });

    expect(prompt).toContain('peanuts');
    expect(prompt).toContain('IFCT_2017');
    expect(prompt).not.toContain('@');
  });
});
