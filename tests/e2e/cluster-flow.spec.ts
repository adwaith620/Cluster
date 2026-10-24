import { test, expect } from '@playwright/test';

test.describe('Cluster E2E Smoke & Public Flows', () => {
  test('Landing page renders brand, tagline, and navigation CTAs', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/Cluster/);
    await expect(page.getByText('Scan. Discover. Connect.')).toBeVisible();

    // Check CTAs
    await expect(page.getByRole('link', { name: /Create a Session/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Organiser Sign In/i })).toBeVisible();
  });

  test('Organiser login page displays authentication form, Google Sign-In, and navigation', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /Organiser Sign In/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();

    // Check mode toggle to Sign up
    await page.getByRole('button', { name: /Sign up/i }).click();
    await expect(page.getByRole('heading', { name: /Create Organiser Account/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
  });

  test('Public participant join route handles unknown or invalid session codes gracefully', async ({ page }) => {
    await page.goto('/join/UNKNOWN99');

    // Should not crash or show raw error page; shows structured error
    await expect(page.getByText(/Unable to Join/i)).toBeVisible({ timeout: 10000 });
  });
});
