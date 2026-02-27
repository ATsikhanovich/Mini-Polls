import { test, expect, type Page } from '@playwright/test';

const defaultManagementPoll = {
  id: 'poll-1',
  question: 'Best colour?',
  slug: 'col12',
  isClosed: false,
  expiresAt: null,
  closedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  totalVotes: 3,
  options: [
    { id: 'opt-1', text: 'Red', sortOrder: 0, voteCount: 2, percentage: 66.7 },
    { id: 'opt-2', text: 'Blue', sortOrder: 1, voteCount: 1, percentage: 33.3 },
  ],
};

async function mockGetPollByToken(page: Page, data: typeof defaultManagementPoll) {
  await page.route('**/api/polls/by-token/*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

test.describe('Manage page', () => {
  test.beforeEach(async ({ page }) => {
    await mockGetPollByToken(page, defaultManagementPoll);
    await page.goto('/manage/test-token');
  });

  test('displays the poll question heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Best colour?' })).toBeVisible();
  });

  test('shows total vote count', async ({ page }) => {
    await expect(page.getByText(/3 votes total/i)).toBeVisible();
  });

  test('displays each option with vote count and percentage', async ({ page }) => {
    await expect(page.getByText('Red')).toBeVisible();
    await expect(page.getByText('Blue')).toBeVisible();
    await expect(page.getByText(/2 votes/i)).toBeVisible();
    await expect(page.locator('span.text-sm', { hasText: /66.7%/ }).first()).toBeVisible();
    await expect(page.getByText(/1 vote/i)).toBeVisible();
    await expect(page.locator('span.text-sm', { hasText: /33.3%/ }).first()).toBeVisible();
  });

  test('renders progress bars for each option', async ({ page }) => {
    await expect(page.getByRole('progressbar')).toHaveCount(defaultManagementPoll.options.length);
  });

  test('shows "Active" badge for active poll', async ({ page }) => {
    await expect(page.getByText('Active')).toBeVisible();
  });

  test('shows "Closed" badge for closed poll', async ({ page }) => {
    await page.route('**/api/polls/by-token/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...defaultManagementPoll, isClosed: true }),
      });
    });
    await page.goto('/manage/test-token');
    await expect(page.getByText('Closed')).toBeVisible();
  });

  test('shows voting link with Copy button', async ({ page }) => {
    await expect(page.getByText(/\/p\/col12/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy' })).toBeVisible();
  });

  test('shows not-found content for invalid token (404)', async ({ page }) => {
    await page.route('**/api/polls/by-token/*', (route) => {
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.goto('/manage/bad-token');
    await expect(page.getByRole('heading', { name: 'Best colour?' })).not.toBeVisible();
  });

  test('shows generic error on network failure', async ({ page }) => {
    await page.route('**/api/polls/by-token/*', (route) => {
      route.abort('failed');
    });
    await page.goto('/manage/fail-token');
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });
});
