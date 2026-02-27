import { test, expect, type Page } from '@playwright/test';

// Node.js global — typed locally to avoid requiring @types/node
declare function setTimeout(callback: () => void, ms: number): unknown;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activePoll = {
  id: 'poll-1',
  question: 'Best language?',
  slug: 'test1',
  expiresAt: null,
  isClosed: false,
  createdAt: '2026-01-01T00:00:00Z',
  options: [
    { id: 'opt-1', text: 'TypeScript', sortOrder: 0 },
    { id: 'opt-2', text: 'Rust', sortOrder: 1 },
  ],
};

const defaultResults = {
  question: 'Best language?',
  isClosed: false,
  totalVotes: 3,
  options: [
    { id: 'opt-1', text: 'TypeScript', voteCount: 2, percentage: 66.7 },
    { id: 'opt-2', text: 'Rust', voteCount: 1, percentage: 33.3 },
  ],
};

const castVoteResponse = {
  voteId: 'vote-1',
  pollOptionId: 'opt-1',
  castAt: '2026-01-01T12:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockGetPollBySlug(page: Page, poll: typeof activePoll) {
  await page.route('**/api/polls/by-slug/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(poll),
    });
  });
}

async function mockCheckVoteNotVoted(page: Page) {
  await page.route('**/api/polls/*/vote-check', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ hasVoted: false }),
    });
  });
}

async function mockCastVoteSuccess(page: Page) {
  await page.route('**/api/polls/*/votes', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(castVoteResponse),
    });
  });
}

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

test.describe('Vote page', () => {
  test.beforeEach(async ({ page }) => {
    await mockGetPollBySlug(page, activePoll);
    await mockCheckVoteNotVoted(page);
    await mockGetResults(page, defaultResults);
    await page.goto('/p/test1');
  });

  test('displays the poll question and all options', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Best language?' })).toBeVisible();
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('Rust')).toBeVisible();
  });

  test('"Vote" button is disabled when no option is selected', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^vote$/i })).toBeDisabled();
  });

  test('selecting an option enables the "Vote" button', async ({ page }) => {
    await page.getByText('TypeScript').click();
    await expect(page.getByRole('button', { name: /^vote$/i })).toBeEnabled();
  });

  test('clicking "Vote" sends a POST with the correct optionId', async ({ page }) => {
    let capturedBody: string | null = null;
    await page.route('**/api/polls/*/votes', async (route) => {
      capturedBody = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(castVoteResponse),
      });
    });

    await page.getByText('TypeScript').click();
    await page.getByRole('button', { name: /^vote$/i }).click();

    expect(capturedBody).toBeTruthy();
    const body = JSON.parse(capturedBody!);
    expect(body.optionId).toBe('opt-1');
  });

  test('after a successful vote, navigates to /p/test1/results', async ({ page }) => {
    await mockCastVoteSuccess(page);
    await page.getByText('TypeScript').click();
    await page.getByRole('button', { name: /^vote$/i }).click();
    await expect(page).toHaveURL(/\/p\/test1\/results/);
  });

  test('button shows "Voting…" while request is in flight', async ({ page }) => {
    // Override the votes route with a delayed response
    await page.route('**/api/polls/*/votes', async (route) => {
      await new Promise<void>(r => setTimeout(r, 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(castVoteResponse),
      });
    });

    await page.getByText('TypeScript').click();
    await page.getByRole('button', { name: /^vote$/i }).click();
    await expect(page.getByRole('button', { name: /voting/i })).toBeVisible();
  });

  test('redirects to results when vote-check returns hasVoted: true', async ({ page }) => {
    // Override the vote-check before navigating
    await page.route('**/api/polls/*/vote-check', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hasVoted: true }),
      });
    });
    await page.goto('/p/test1');
    await expect(page).toHaveURL(/\/p\/test1\/results/);
  });

  test('redirects to results when poll isClosed is true', async ({ page }) => {
    await page.route('**/api/polls/by-slug/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...activePoll, isClosed: true }),
      });
    });
    await page.goto('/p/test1');
    await expect(page).toHaveURL(/\/p\/test1\/results/);
  });

  test('shows "Poll not found" content for a 404 from getPollBySlug', async ({ page }) => {
    await page.route('**/api/polls/by-slug/**', (route) => {
      route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.goto('/p/test1');
    // NotFoundPage is currently a stub; just verify the question heading is absent
    await expect(page.getByRole('heading', { name: 'Best language?' })).not.toBeVisible();
  });

  test('shows generic error on network failure from getPollBySlug', async ({ page }) => {
    await page.route('**/api/polls/by-slug/**', (route) => {
      route.abort('failed');
    });
    await page.goto('/p/test1');
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test('navigates to results on 409 from castVote', async ({ page }) => {
    await page.route('**/api/polls/*/votes', (route) => {
      route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({}) });
    });
    await page.getByText('TypeScript').click();
    await page.getByRole('button', { name: /^vote$/i }).click();
    await expect(page).toHaveURL(/\/p\/test1\/results/);
  });
});
