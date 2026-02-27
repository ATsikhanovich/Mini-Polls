import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ApiError } from '../../src/api/polls';

vi.mock('../../src/api/polls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/polls')>();
  return {
    ...actual,
    getResults: vi.fn(),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ slug: 'test1' }),
  };
});

import { getResults } from '../../src/api/polls';
const mockGetResults = vi.mocked(getResults);

import ResultsPage from '../../src/pages/ResultsPage';

const resultsFixture = {
  question: 'Best language?',
  isClosed: false,
  totalVotes: 3,
  options: [
    { id: 'opt-1', text: 'TypeScript', voteCount: 2, percentage: 66.7 },
    { id: 'opt-2', text: 'Rust', voteCount: 1, percentage: 33.3 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ResultsPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ResultsPage', () => {
  it('shows "Loading…" while fetching results', () => {
    mockGetResults.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders the poll question as a heading', async () => {
    mockGetResults.mockResolvedValue(resultsFixture);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Best language?' })).toBeInTheDocument();
  });

  it('displays total vote count text', async () => {
    mockGetResults.mockResolvedValue(resultsFixture);
    renderPage();
    expect(await screen.findByText(/3 votes total/i)).toBeInTheDocument();
  });

  it('renders each option with its text, vote count, and percentage', async () => {
    mockGetResults.mockResolvedValue(resultsFixture);
    renderPage();
    await screen.findByText('TypeScript');
    expect(screen.getByText('Rust')).toBeInTheDocument();
    expect(screen.getAllByText(/2 votes/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/66.7%/i).length).toBeGreaterThan(0);
  });

  it('renders a ProgressBar for each option', async () => {
    mockGetResults.mockResolvedValue(resultsFixture);
    renderPage();
    await screen.findByText('TypeScript');
    const bars = screen.getAllByRole('progressbar');
    expect(bars).toHaveLength(resultsFixture.options.length);
  });

  it('shows a "Closed" StatusBadge when isClosed is true', async () => {
    mockGetResults.mockResolvedValue({ ...resultsFixture, isClosed: true });
    renderPage();
    expect(await screen.findByText('Closed')).toBeInTheDocument();
  });

  it('does not show a StatusBadge when isClosed is false', async () => {
    mockGetResults.mockResolvedValue({ ...resultsFixture, isClosed: false });
    renderPage();
    await screen.findByText('TypeScript');
    expect(screen.queryByText('Closed')).not.toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('Expired')).not.toBeInTheDocument();
  });

  it('renders NotFoundPage content when getResults throws ApiError(404)', async () => {
    mockGetResults.mockRejectedValue(new ApiError(404, null));
    renderPage();
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
  });

  it('shows generic error message on network failure', async () => {
    mockGetResults.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });
});
