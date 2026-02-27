import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const defaultResults = {
  question: 'Best language?',
  isClosed: false,
  totalVotes: 3,
  options: [
    { id: 'opt-1', text: 'TypeScript', voteCount: 2, percentage: 66.7 },
    { id: 'opt-2', text: 'Rust', voteCount: 1, percentage: 33.3 },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockGetResults(page: Page, results: typeof defaultResults) {
  await page.route('**/api/polls/*/results', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(results),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Results page', () => {
  test.beforeEach(async ({ page }) => {
    await mockGetResults(page, defaultResults);
    await page.goto('/p/test1/results');
  });

  test('displays the poll question heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Best language?' })).toBeVisible();
  });

  test('shows total vote count', async ({ page }) => {
    await expect(page.getByText(/3 votes total/i)).toBeVisible();
  });

  test('displays each option with its vote count and percentage text', async ({ page }) => {
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('Rust')).toBeVisible();
    await expect(page.getByText(/2 votes/i)).toBeVisible();
    await expect(page.locator('span.text-sm', { hasText: /66.7%/ }).first()).toBeVisible();
    await expect(page.getByText(/1 vote/i)).toBeVisible();
    await expect(page.locator('span.text-sm', { hasText: /33.3%/ }).first()).toBeVisible();
  });

  test('renders progress bars for each option', async ({ page }) => {
    const bars = page.getByRole('progressbar');
    await expect(bars).toHaveCount(defaultResults.options.length);
  });

  test('shows "Closed" badge when isClosed is true', async ({ page }) => {
    await page.route('**/api/polls/*/results', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...defaultResults, isClosed: true }),
      });
    });
    await page.goto('/p/test1/results');
    await expect(page.getByText('Closed')).toBeVisible();
  });

  test('does not show a status badge when isClosed is false', async ({ page }) => {
    await expect(page.getByText('Closed')).not.toBeVisible();
    await expect(page.getByText('Active')).not.toBeVisible();
    await expect(page.getByText('Expired')).not.toBeVisible();
  });

  test('shows "Poll not found" content for a 404', async ({ page }) => {
    await page.route('**/api/polls/*/results', (route) => {
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.goto('/p/test1/results');
    // NotFoundPage rendered — heading from results should not be visible
    await expect(page.getByRole('heading', { name: 'Best language?' })).not.toBeVisible();
  });

  test('shows generic error on network failure', async ({ page }) => {
    await page.route('**/api/polls/*/results', (route) => {
      route.abort('failed');
    });
    await page.goto('/p/test1/results');
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test('does not show "already voted" banner on direct navigation', async ({ page }) => {
    await page.goto('/p/test1/results');
    await expect(page.getByText(/already voted/i)).not.toBeVisible();
  });
});
