import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreatePollPage from '../../src/pages/CreatePollPage';
import { ApiError } from '../../src/api/polls';

// Mock the API module
vi.mock('../../src/api/polls', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/api/polls')>();
  return {
    ...actual,
    createPoll: vi.fn(),
  };
});

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { createPoll } from '../../src/api/polls';
const mockCreatePoll = vi.mocked(createPoll);

function renderPage() {
  return render(
    <MemoryRouter>
      <CreatePollPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreatePollPage', () => {
  it('renders the question input and at least 2 option inputs', () => {
    renderPage();
    expect(screen.getByRole('textbox', { name: /poll question/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /option 1/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /option 2/i })).toBeInTheDocument();
  });

  it('"Add option" button appends a new input field', async () => {
    const user = userEvent.setup();
    renderPage();
    const addBtn = screen.getByRole('button', { name: /add option/i });
    await user.click(addBtn);
    expect(screen.getByRole('textbox', { name: /option 3/i })).toBeInTheDocument();
  });

  it('remove button removes an option', async () => {
    const user = userEvent.setup();
    renderPage();
    // Add a third option first so we can remove one
    await user.click(screen.getByRole('button', { name: /add option/i }));
    expect(screen.getByRole('textbox', { name: /option 3/i })).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove option 3/i });
    await user.click(removeBtn);
    expect(screen.queryByRole('textbox', { name: /option 3/i })).not.toBeInTheDocument();
  });

  it('remove buttons are disabled when only 2 options remain', () => {
    renderPage();
    const removeBtns = screen.getAllByRole('button', { name: /remove option/i });
    expect(removeBtns).toHaveLength(2);
    removeBtns.forEach((btn) => expect(btn).toBeDisabled());
  });

  it('shows "Question is required" error when question is empty on submit', async () => {
    const user = userEvent.setup();
    renderPage();
    // Fill the options so that error is only about question
    await user.type(screen.getByRole('textbox', { name: /option 1/i }), 'A');
    await user.type(screen.getByRole('textbox', { name: /option 2/i }), 'B');
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText('Question is required')).toBeInTheDocument();
    expect(mockCreatePoll).not.toHaveBeenCalled();
  });

  it('shows options error when fewer than 2 non-empty options on submit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByRole('textbox', { name: /poll question/i }), 'My question');
    // Leave both options empty
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText('At least 2 options are required')).toBeInTheDocument();
    expect(mockCreatePoll).not.toHaveBeenCalled();
  });

  it('calls createPoll with trimmed data and navigates to /poll-created on success', async () => {
    const user = userEvent.setup();
    mockCreatePoll.mockResolvedValueOnce({
      slug: 'abc12',
      managementToken: 'tok',
    });

    renderPage();
    await user.type(screen.getByRole('textbox', { name: /poll question/i }), '  Best color?  ');
    await user.type(screen.getByRole('textbox', { name: /option 1/i }), '  Red  ');
    await user.type(screen.getByRole('textbox', { name: /option 2/i }), '  Blue  ');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreatePoll).toHaveBeenCalledWith({
        question: 'Best color?',
        options: ['Red', 'Blue'],
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/poll-created', {
      state: {
        votingUrl: 'http://localhost:3000/p/abc12',
        managementUrl: 'http://localhost:3000/manage/tok',
        slug: 'abc12',
        managementToken: 'tok',
      },
    });
  });

  it('displays validation messages inline on API 400 error', async () => {
    const user = userEvent.setup();
    mockCreatePoll.mockRejectedValueOnce(
      new ApiError(400, {
        title: 'Validation failed',
        errors: { Question: ['Question must not be empty.'] },
      }),
    );

    renderPage();
    await user.type(screen.getByRole('textbox', { name: /poll question/i }), 'Q');
    await user.type(screen.getByRole('textbox', { name: /option 1/i }), 'A');
    await user.type(screen.getByRole('textbox', { name: /option 2/i }), 'B');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('Question must not be empty.')).toBeInTheDocument();
  });

  it('displays generic error message on network failure', async () => {
    const user = userEvent.setup();
    mockCreatePoll.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    renderPage();
    await user.type(screen.getByRole('textbox', { name: /poll question/i }), 'Q');
    await user.type(screen.getByRole('textbox', { name: /option 1/i }), 'A');
    await user.type(screen.getByRole('textbox', { name: /option 2/i }), 'B');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});
