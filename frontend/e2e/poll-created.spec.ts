import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockCreatePollSuccess(page: Page) {
  await page.route('**/api/polls', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        slug: 'test1',
        managementToken: 'mgmt-tok',
      }),
    });
  });
}

async function submitCreateForm(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox', { name: /poll question/i }).fill('Best color?');
  await page.getByRole('textbox', { name: /option 1/i }).fill('Red');
  await page.getByRole('textbox', { name: /option 2/i }).fill('Blue');
  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page).toHaveURL('/poll-created');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Poll Created page', () => {
  test.beforeEach(async ({ page }) => {
    await mockCreatePollSuccess(page);
  });

  test('displays voting and management links', async ({ page }) => {
    await submitCreateForm(page);
    await expect(page.getByText(/\/p\/test1/)).toBeVisible();
    await expect(page.getByText(/\/manage\/mgmt-tok/)).toBeVisible();
  });

  test('shows two Copy buttons', async ({ page }) => {
    await submitCreateForm(page);
    await expect(page.getByRole('button', { name: /^copy$/i })).toHaveCount(2);
  });

  test('"Go to management page" link navigates to the management route', async ({ page }) => {
    await submitCreateForm(page);
    await page.getByRole('link', { name: /management page/i }).click();
    await expect(page).toHaveURL('/manage/mgmt-tok');
  });

  test('redirects to home when navigating to /poll-created directly without state', async ({
    page,
  }) => {
    await page.goto('/poll-created');
    await expect(page).toHaveURL('/');
  });
});
