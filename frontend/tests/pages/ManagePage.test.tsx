import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ApiError } from '../../src/api/polls';

vi.mock('../../src/api/polls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/polls')>();
  return {
    ...actual,
    getPollByManagementToken: vi.fn(),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ token: 'mgmt-tok' }),
  };
});

import { getPollByManagementToken } from '../../src/api/polls';
const mockGetPollByManagementToken = vi.mocked(getPollByManagementToken);

import ManagePage from '../../src/pages/ManagePage';

const managementPollFixture = {
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

function renderPage() {
  return render(
    <MemoryRouter>
      <ManagePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ManagePage', () => {
  it('shows "Loading…" while fetching', () => {
    mockGetPollByManagementToken.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/Loading/i)).toBeTruthy();
  });

  it('renders poll question as heading', async () => {
    mockGetPollByManagementToken.mockResolvedValue(managementPollFixture);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Best colour?' })).toBeTruthy();
  });

  it('displays total vote count text', async () => {
    mockGetPollByManagementToken.mockResolvedValue(managementPollFixture);
    renderPage();
    expect(await screen.findByText(/3 votes total/i)).toBeTruthy();
  });

  it('renders each option with text, vote count, and percentage', async () => {
    mockGetPollByManagementToken.mockResolvedValue(managementPollFixture);
    renderPage();
    await screen.findByText('Red');
    expect(screen.getByText('Blue')).toBeTruthy();
    expect(screen.getAllByText(/2 votes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/66.7%/i).length).toBeGreaterThan(0);
  });

  it('renders ProgressBar for each option', async () => {
    mockGetPollByManagementToken.mockResolvedValue(managementPollFixture);
    renderPage();
    await screen.findByText('Red');
    expect(screen.getAllByRole('progressbar')).toHaveLength(managementPollFixture.options.length);
  });

  it('shows "Active" StatusBadge when poll is active', async () => {
    mockGetPollByManagementToken.mockResolvedValue({ ...managementPollFixture, isClosed: false });
    renderPage();
    expect(await screen.findByText('Active')).toBeTruthy();
  });

  it('shows "Closed" StatusBadge when poll is closed', async () => {
    mockGetPollByManagementToken.mockResolvedValue({
      ...managementPollFixture,
      isClosed: true,
      closedAt: '2026-02-01T00:00:00Z',
      expiresAt: null,
    });
    renderPage();
    expect(await screen.findByText('Closed')).toBeTruthy();
  });

  it('shows "Expired" StatusBadge when poll is expired', async () => {
    mockGetPollByManagementToken.mockResolvedValue({
      ...managementPollFixture,
      isClosed: true,
      expiresAt: '2026-01-01T00:00:00Z',
      closedAt: null,
    });
    renderPage();
    expect(await screen.findByText('Expired')).toBeTruthy();
  });

  it('renders voting link with CopyButton', async () => {
    mockGetPollByManagementToken.mockResolvedValue(managementPollFixture);
    renderPage();
    expect(await screen.findByText(/\/p\/col12/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('renders NotFoundPage on 404', async () => {
    mockGetPollByManagementToken.mockRejectedValue(new ApiError(404, null));
    renderPage();
    await waitFor(() => expect(screen.queryByText(/Loading/i)).toBeNull());
    expect(screen.queryByRole('heading', { name: 'Best colour?' })).toBeNull();
  });

  it('shows generic error on network failure', async () => {
    mockGetPollByManagementToken.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    expect(await screen.findByText(/something went wrong/i)).toBeTruthy();
  });
});
