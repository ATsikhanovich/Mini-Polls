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

async function mockClosePoll(page: Page, onClose?: () => void) {
  await page.route('**/api/polls/*/close', (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }

    onClose?.();

    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'poll-1',
        isClosed: true,
        closedAt: '2026-02-27T12:00:00Z',
      }),
    });
  });
}

async function mockSetExpiration(page: Page, status = 200, expiresAt = '2026-03-15T18:00:00Z') {
  await page.route('**/api/polls/*/expiration', (route) => {
    if (route.request().method() !== 'PUT') {
      return route.continue();
    }

    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(
        status >= 400
          ? { title: 'Server error' }
          : {
              id: 'poll-1',
              expiresAt,
            },
      ),
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
    await expect(page.getByRole('heading', { name: /poll not found/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create a poll/i })).toBeVisible();
  });

  test('shows generic error on network failure', async ({ page }) => {
    await page.route('**/api/polls/by-token/*', (route) => {
      route.abort('failed');
    });
    await page.goto('/manage/fail-token');
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });

  test('shows "Close Poll" button for active poll', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Close Poll' })).toBeVisible();
  });

  test('does not show "Close Poll" button for closed poll', async ({ page }) => {
    await page.route('**/api/polls/by-token/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...defaultManagementPoll,
          isClosed: true,
          closedAt: '2026-02-27T12:00:00Z',
        }),
      });
    });

    await page.goto('/manage/test-token');
    await expect(page.getByRole('button', { name: 'Close Poll' })).not.toBeVisible();
  });

  test('closing poll updates status badge to "Closed"', async ({ page }) => {
    let closed = false;

    await page.route('**/api/polls/by-token/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          closed
            ? {
                ...defaultManagementPoll,
                isClosed: true,
                closedAt: '2026-02-27T12:00:00Z',
              }
            : defaultManagementPoll,
        ),
      });
    });

    await mockClosePoll(page, () => {
      closed = true;
    });

    await page.goto('/manage/test-token');
    await expect(page.getByText('Active')).toBeVisible();

    page.once('dialog', (dialog) => {
      dialog.accept();
    });

    await page.getByRole('button', { name: 'Close Poll' }).click();
    await expect(page.getByText('Closed')).toBeVisible();
  });

  test('cancelling confirmation does not close poll', async ({ page }) => {
    let closeCalls = 0;

    await page.route('**/api/polls/*/close', (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }

      closeCalls += 1;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'poll-1',
          isClosed: true,
          closedAt: '2026-02-27T12:00:00Z',
        }),
      });
    });

    await page.goto('/manage/test-token');

    page.once('dialog', (dialog) => {
      dialog.dismiss();
    });

    await page.getByRole('button', { name: 'Close Poll' }).click();
    await expect(page.getByText('Active')).toBeVisible();
    expect(closeCalls).toBe(0);
  });

  test('shows error on close failure', async ({ page }) => {
    await page.unroute('**/api/polls/by-token/*');
    await mockGetPollByToken(page, defaultManagementPoll);

    await page.route('**/api/polls/*/close', (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }

      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ title: 'Server error' }),
      });
    });

    await page.goto('/manage/test-token');

    page.once('dialog', (dialog) => {
      dialog.accept();
    });

    await page.getByRole('button', { name: 'Close Poll' }).click();
    await expect(page.getByText(/failed to close/i)).toBeVisible();
  });

  test('shows expiration form for active poll', async ({ page }) => {
    await expect(page.getByLabel(/expiration date/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('does not show expiration form for closed poll', async ({ page }) => {
    await page.route('**/api/polls/by-token/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...defaultManagementPoll,
          isClosed: true,
          closedAt: '2026-02-27T12:00:00Z',
        }),
      });
    });

    await page.goto('/manage/test-token');
    await expect(page.getByLabel(/expiration date/i)).not.toBeVisible();
  });

  test('setting expiration updates the displayed data', async ({ page }) => {
    let expiresAt: string | null = null;

    await page.unroute('**/api/polls/by-token/*');
    await page.route('**/api/polls/by-token/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...defaultManagementPoll,
          expiresAt,
        }),
      });
    });
    await page.route('**/api/polls/*/expiration', async (route) => {
      if (route.request().method() !== 'PUT') {
        return route.continue();
      }
      expiresAt = '2026-03-15T18:00:00Z';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'poll-1', expiresAt }),
      });
    });

    await page.goto('/manage/test-token');
    await page.getByLabel(/expiration date/i).fill('2026-03-15T18:00');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(/expires:/i)).toBeVisible();
    await expect(page.getByText(/expiration updated/i)).toBeVisible();
  });

  test('shows error when set-expiration fails', async ({ page }) => {
    await mockSetExpiration(page, 500);

    await page.goto('/manage/test-token');
    await page.getByLabel(/expiration date/i).fill('2026-03-15T18:00');
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText(/failed to set expiration/i)).toBeVisible();
  });
});
