import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ApiError } from '../../src/api/polls';

// Mock the entire API module
vi.mock('../../src/api/polls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/polls')>();
  return {
    ...actual,
    getPollBySlug: vi.fn(),
    castVote: vi.fn(),
    checkVote: vi.fn(),
  };
});

// Mock react-router-dom navigate + useParams
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ slug: 'test1' }),
  };
});

import { getPollBySlug, castVote, checkVote } from '../../src/api/polls';
const mockGetPollBySlug = vi.mocked(getPollBySlug);
const mockCastVote = vi.mocked(castVote);
const mockCheckVote = vi.mocked(checkVote);

import VotePage from '../../src/pages/VotePage';

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

function renderPage() {
  return render(
    <MemoryRouter>
      <VotePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckVote.mockResolvedValue({ hasVoted: false });
});

describe('VotePage', () => {
  it('shows "Loading…" text while API calls are in flight', () => {
    mockGetPollBySlug.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders poll question and all options after loading', async () => {
    mockGetPollBySlug.mockResolvedValue(activePoll);
    renderPage();
    await waitFor(() => expect(screen.getByText('Best language?')).toBeInTheDocument());
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Rust')).toBeInTheDocument();
  });

  it('"Vote" button is disabled when no option is selected', async () => {
    mockGetPollBySlug.mockResolvedValue(activePoll);
    renderPage();
    const btn = await screen.findByRole('button', { name: /^vote$/i });
    expect(btn).toBeDisabled();
  });

  it('selecting an option enables the "Vote" button', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    renderPage();
    const label = await screen.findByText('TypeScript');
    await user.click(label);
    expect(screen.getByRole('button', { name: /^vote$/i })).toBeEnabled();
  });

  it('clicking "Vote" calls castVote with the correct slug and selected option ID', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    mockCastVote.mockResolvedValue({ voteId: 'v1', pollOptionId: 'opt-1', castAt: '' });
    renderPage();
    await user.click(await screen.findByText('TypeScript'));
    await user.click(screen.getByRole('button', { name: /^vote$/i }));
    expect(mockCastVote).toHaveBeenCalledWith('test1', { optionId: 'opt-1' });
  });

  it('on successful vote, navigates to /p/test1/results', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    mockCastVote.mockResolvedValue({ voteId: 'v1', pollOptionId: 'opt-1', castAt: '' });
    renderPage();
    await user.click(await screen.findByText('TypeScript'));
    await user.click(screen.getByRole('button', { name: /^vote$/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/p/test1/results'));
  });

  it('button shows "Voting…" and is disabled while submission is in progress', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    let resolveVote!: () => void;
    mockCastVote.mockReturnValue(
      new Promise((res) => {
        resolveVote = () => res({ voteId: 'v1', pollOptionId: 'opt-1', castAt: '' });
      }),
    );
    renderPage();
    await user.click(await screen.findByText('TypeScript'));
    await user.click(screen.getByRole('button', { name: /^vote$/i }));
    expect(await screen.findByRole('button', { name: /voting/i })).toBeDisabled();
    resolveVote();
  });

  it('navigates to results with replace:true when checkVote returns hasVoted: true', async () => {
    mockGetPollBySlug.mockResolvedValue(activePoll);
    mockCheckVote.mockResolvedValue({ hasVoted: true });
    renderPage();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/p/test1/results', { replace: true }),
    );
  });

  it('navigates to results with replace:true when poll isClosed is true', async () => {
    mockGetPollBySlug.mockResolvedValue({ ...activePoll, isClosed: true });
    renderPage();
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/p/test1/results', { replace: true }),
    );
  });

  it('renders NotFoundPage content when getPollBySlug throws ApiError(404)', async () => {
    mockGetPollBySlug.mockRejectedValue(new ApiError(404, null));
    renderPage();
    // NotFoundPage is a stub <div /> — just check it doesn't crash and "Loading" disappears
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
  });

  it('shows generic error message when getPollBySlug throws a network error', async () => {
    mockGetPollBySlug.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    expect(
      await screen.findByText(/something went wrong/i),
    ).toBeInTheDocument();
  });

  it('navigates to results on ApiError(409) during vote submission', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    mockCastVote.mockRejectedValue(new ApiError(409, null));
    renderPage();
    await user.click(await screen.findByText('TypeScript'));
    await user.click(screen.getByRole('button', { name: /^vote$/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/p/test1/results'));
  });

  it('navigates to results on ApiError(410) during vote submission', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    mockCastVote.mockRejectedValue(new ApiError(410, null));
    renderPage();
    await user.click(await screen.findByText('TypeScript'));
    await user.click(screen.getByRole('button', { name: /^vote$/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/p/test1/results'));
  });

  it('sets notFound on ApiError(404) during vote submission', async () => {
    const user = userEvent.setup();
    mockGetPollBySlug.mockResolvedValue(activePoll);
    mockCastVote.mockRejectedValue(new ApiError(404, null));
    renderPage();
    await user.click(await screen.findByText('TypeScript'));
    await user.click(screen.getByRole('button', { name: /^vote$/i }));
    // NotFoundPage renders — "Loading" is gone
    await waitFor(() => expect(screen.queryByText('Best language?')).not.toBeInTheDocument());
  });
});
