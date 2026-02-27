import { test, expect, type Page } from '@playwright/test';

// Node.js global — typed locally to avoid requiring @types/node
declare function setTimeout(callback: () => void, ms: number): unknown;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock a successful POST /api/polls response */
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

/** Mock a 400 validation error from POST /api/polls */
async function mockCreatePoll400(page: Page, errors: Record<string, string[]>) {
  await page.route('**/api/polls', (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Validation failed', errors }),
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Create Poll page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Layout ─────────────────────────────────────────────────────────────

  test('shows the app header with a link to /', async ({ page }) => {
    const link = page.getByRole('link', { name: 'Mini-Polls' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/');
  });

  test('renders the Create a Poll heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create a Poll' })).toBeVisible();
  });

  test('renders the question input with placeholder', async ({ page }) => {
    const input = page.getByRole('textbox', { name: /poll question/i });
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', /what's on your mind/i);
  });

  test('renders exactly 2 option inputs on load', async ({ page }) => {
    const opts = page.getByRole('textbox', { name: /option \d/i });
    await expect(opts).toHaveCount(2);
  });

  test('renders 2 disabled remove buttons on load', async ({ page }) => {
    const removeBtns = page.getByRole('button', { name: /remove option/i });
    await expect(removeBtns).toHaveCount(2);
    for (const btn of await removeBtns.all()) {
      await expect(btn).toBeDisabled();
    }
  });

  // ── Option management ──────────────────────────────────────────────────

  test('clicking "Add option" appends a third input', async ({ page }) => {
    await page.getByRole('button', { name: /add option/i }).click();
    await expect(page.getByRole('textbox', { name: /option 3/i })).toBeVisible();
  });

  test('remove button is enabled once there are more than 2 options', async ({ page }) => {
    await page.getByRole('button', { name: /add option/i }).click();
    const removeBtns = page.getByRole('button', { name: /remove option/i });
    await expect(removeBtns).toHaveCount(3);
    for (const btn of await removeBtns.all()) {
      await expect(btn).toBeEnabled();
    }
  });

  test('clicking remove deletes the corresponding option', async ({ page }) => {
    await page.getByRole('button', { name: /add option/i }).click();
    await page.getByRole('textbox', { name: /option 3/i }).fill('Option C');
    await page.getByRole('button', { name: /remove option 3/i }).click();
    await expect(page.getByRole('textbox', { name: /option 3/i })).not.toBeAttached();
    // Only 2 inputs remain
    await expect(page.getByRole('textbox', { name: /option \d/i })).toHaveCount(2);
  });

  // ── Client-side validation ─────────────────────────────────────────────

  test('shows "Question is required" when question is empty on submit', async ({ page }) => {
    await page.getByRole('textbox', { name: /option 1/i }).fill('A');
    await page.getByRole('textbox', { name: /option 2/i }).fill('B');
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText('Question is required')).toBeVisible();
  });

  test('shows "At least 2 options are required" when both options are blank', async ({ page }) => {
    await page.getByRole('textbox', { name: /poll question/i }).fill('My question');
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText('At least 2 options are required')).toBeVisible();
  });

  test('shows per-option error for each blank option', async ({ page }) => {
    await page.getByRole('button', { name: /add option/i }).click();
    await page.getByRole('textbox', { name: /poll question/i }).fill('Q');
    await page.getByRole('textbox', { name: /option 1/i }).fill('Filled');
    // options 2 and 3 are blank
    await page.getByRole('button', { name: /^create$/i }).click();
    const perItemErrors = page.getByText('Option cannot be empty');
    // 2 blank options → 2 per-item error messages
    await expect(perItemErrors).toHaveCount(2);
  });

  test('clears validation errors on the next submit attempt', async ({ page }) => {
    // First submit — trigger validation errors
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText('Question is required')).toBeVisible();

    // Fill in the form and submit again (mock success)
    await mockCreatePollSuccess(page);
    await page.getByRole('textbox', { name: /poll question/i }).fill('Q?');
    await page.getByRole('textbox', { name: /option 1/i }).fill('A');
    await page.getByRole('textbox', { name: /option 2/i }).fill('B');
    await page.getByRole('button', { name: /^create$/i }).click();
    await expect(page.getByText('Question is required')).not.toBeAttached();
  });

  // ── Successful submission ──────────────────────────────────────────────

  test('submits the form and navigates to /poll-created on success', async ({ page }) => {
    await mockCreatePollSuccess(page);

    await page.getByRole('textbox', { name: /poll question/i }).fill('Favourite colour?');
    await page.getByRole('textbox', { name: /option 1/i }).fill('Red');
    await page.getByRole('textbox', { name: /option 2/i }).fill('Blue');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page).toHaveURL('/poll-created');
  });

  test('trims whitespace from question and options before submitting', async ({ page }) => {
    let requestBody: Record<string, unknown> = {};
    await page.route('**/api/polls', (route) => {
      requestBody = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          slug: 'x',
          managementToken: 't',
          votingUrl: 'http://localhost:3000/p/x',
          managementUrl: 'http://localhost:3000/manage/t',
        }),
      });
    });

    await page.getByRole('textbox', { name: /poll question/i }).fill('  My Q  ');
    await page.getByRole('textbox', { name: /option 1/i }).fill('  Opt A  ');
    await page.getByRole('textbox', { name: /option 2/i }).fill('  Opt B  ');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page).toHaveURL('/poll-created');
    expect(requestBody.question).toBe('My Q');
    expect(requestBody.options).toEqual(['Opt A', 'Opt B']);
  });

  test('button shows "Creating…" while request is in flight', async ({ page }) => {
    // Delay the response slightly so we can observe the loading state
    await page.route('**/api/polls', async (route) => {
      await new Promise<void>(r => setTimeout(r, 300));
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          slug: 'x',
          managementToken: 't',
        }),
      });
    });

    await page.getByRole('textbox', { name: /poll question/i }).fill('Q?');
    await page.getByRole('textbox', { name: /option 1/i }).fill('A');
    await page.getByRole('textbox', { name: /option 2/i }).fill('B');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByRole('button', { name: /creating/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /creating/i })).toBeDisabled();
  });

  // ── API error handling ─────────────────────────────────────────────────

  test('shows inline validation message on API 400 error', async ({ page }) => {
    await mockCreatePoll400(page, { Question: ['Question must not be empty.'] });

    await page.getByRole('textbox', { name: /poll question/i }).fill('Q');
    await page.getByRole('textbox', { name: /option 1/i }).fill('A');
    await page.getByRole('textbox', { name: /option 2/i }).fill('B');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText('Question must not be empty.')).toBeVisible();
  });

  test('shows generic error message on network failure', async ({ page }) => {
    await page.route('**/api/polls', (route) =>
      route.abort('failed'),
    );

    await page.getByRole('textbox', { name: /poll question/i }).fill('Q');
    await page.getByRole('textbox', { name: /option 1/i }).fill('A');
    await page.getByRole('textbox', { name: /option 2/i }).fill('B');
    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText('Something went wrong. Please try again.')).toBeVisible();
  });
});
