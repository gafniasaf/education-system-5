import { test, expect } from '@playwright/test';

test.describe('Expertfolio Preview (labs)', () => {
  test('renders Expertfolio labs page and sections', async ({ page }) => {
    // Assumes FEATURE_EXPERTFOLIO=1 in env for the preview run
    await page.goto('/labs/expertfolio');
    await expect(page.getByRole('heading', { name: /Expertfolio/i })).toBeVisible();

    // Sections present
    await expect(page.getByRole('heading', { name: /Admin Audit Logs/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Files$/i })).toBeVisible();
  });
});


