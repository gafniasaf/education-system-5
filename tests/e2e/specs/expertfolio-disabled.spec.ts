import { test, expect } from '@playwright/test';

test.describe('Expertfolio disabled (labs)', () => {
  test('shows disabled message when flag off', async ({ page }) => {
    await page.goto('/labs/expertfolio');
    await expect(page.getByText(/Expertfolio is disabled/i)).toBeVisible();
  });
});


