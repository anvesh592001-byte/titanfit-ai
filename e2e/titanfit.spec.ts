import { expect, test } from '@playwright/test';

test.describe('TitanFit AI End-to-End Platform Verification', () => {
  test('renders Landing Page on desktop & mobile, theme toggle, and Verified Food Explorer', async ({
    page
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Precision Fitness Coaching/i })
    ).toBeVisible();

    // Test Verified Food Explorer search + live portion recalculation
    await page
      .getByRole('searchbox', { name: /Search verified foods/i })
      .fill('Paneer');
    await page.getByRole('button', { name: /Paneer/i }).click();
    const gramsInput = page.locator('#explorer-grams');
    await gramsInput.fill('200');
    await expect(page.getByText('516')).toBeVisible();

    // Toggle theme (dark -> light -> dark)
    const themeBtn = page.getByRole('button', { name: /Switch to light theme/i }).first();
    await themeBtn.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.getByRole('button', { name: /Switch to dark theme/i }).first().click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Mobile viewport check
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: /Toggle navigation menu/i }).click();
    await expect(
      page.locator('header').getByRole('link', { name: /Start Coaching/i })
    ).toBeVisible();
  });

  test('executes Calorie, BMR, TDEE & Macro Calculator with Metric/Imperial & Minor Safety Gate', async ({
    page
  }) => {
    await page.goto('/calculator');
    await expect(
      page.getByRole('heading', {
        name: /Calorie, BMR, TDEE & Macronutrient Calculator/i
      })
    ).toBeVisible();

    const targetCal = page.getByTestId('target-calories-value');
    await expect(targetCal).toBeVisible();

    // Switch to Imperial and back to Metric
    await page.getByRole('button', { name: /Imperial/i }).click();
    await expect(page.locator('#calc-weight-lbs')).toBeVisible();
    await page.getByRole('button', { name: /Metric/i }).click();
    await expect(page.locator('#calc-weight-kg')).toBeVisible();

    // Trigger Under-18 Minor Safety Protection
    await page.locator('#calc-age').fill('15');
    await expect(
      page.getByText(/Adolescent Under-18 Safety Protection Active/i)
    ).toBeVisible();
  });

  test('validates Auth forms (Signup, Login, Forgot Password, Reset Password, Verify Email) honestly', async ({
    page
  }) => {
    const appAlert = page.locator('[role="alert"]:not(#__next-route-announcer__)');

    // Signup validation
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await expect(appAlert).toContainText(/Full name is required/i);

    // Login validation
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(appAlert).toContainText(/valid email/i);

    // Forgot password validation
    await page.goto('/forgot-password');
    await page.getByRole('button', { name: /Send Recovery Link/i }).click();
    await expect(appAlert).toContainText(/valid email/i);

    // Reset password validation
    await page.goto('/reset-password');
    await page.locator('#reset-password').fill('short');
    await page.locator('#reset-confirm').fill('short');
    await page.getByRole('button', { name: /Update Password/i }).click();
    await expect(appAlert).toContainText(/at least 8 characters/i);

    // Verify email page
    await page.goto('/auth/verify-email');
    await expect(
      page.getByRole('heading', { name: /Email Verification/i })
    ).toBeVisible();
  });

  test('enforces Protected Route redirects for unauthenticated visitors and renders Privacy Policy', async ({
    page
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard/);

    await page.goto('/food-tracker');
    await expect(page).toHaveURL(/\/login\?redirectTo=%2Ffood-tracker/);

    await page.goto('/privacy');
    await expect(
      page.getByRole('heading', { name: /Privacy Policy & Health Disclaimer/i })
    ).toBeVisible();
  });

  test('rejects unauthenticated/unconfigured API mutations without simulating success', async ({
    request
  }) => {
    const profileRes = await request.put('/api/profile', {
      data: { profile: {}, preferences: {} }
    });
    expect([401, 503]).toContain(profileRes.status());

    const coachRes = await request.post('/api/ai/coach', {
      data: { message: 'Hello coach' }
    });
    expect([401, 503]).toContain(coachRes.status());
  });
});
