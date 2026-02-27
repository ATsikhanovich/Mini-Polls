import { test, expect } from '@playwright/test';

test.describe('Catch-all not found route', () => {
  test('shows not-found content and navigates home from CTA', async ({ page }) => {
    await page.goto('/some/random/path');

    await expect(page.getByRole('heading', { name: /poll not found/i })).toBeVisible();
    const homeLink = page.getByRole('link', { name: /create a poll/i });
    await expect(homeLink).toBeVisible();

    await homeLink.click();
    await expect(page).toHaveURL('/');
  });
});
