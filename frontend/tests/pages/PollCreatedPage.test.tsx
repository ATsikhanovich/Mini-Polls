import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PollCreatedPage from '../../src/pages/PollCreatedPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const validState = {
  votingUrl: 'http://localhost:3000/p/abc12',
  managementUrl: 'http://localhost:3000/manage/mgmt-tok',
  slug: 'abc12',
  managementToken: 'mgmt-tok',
};

function renderPage(state: unknown = validState) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/poll-created', state }]}>
      <PollCreatedPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PollCreatedPage', () => {
  it('renders the voting URL', () => {
    renderPage();
    expect(screen.getByText('http://localhost:3000/p/abc12')).toBeInTheDocument();
  });

  it('renders the management URL', () => {
    renderPage();
    expect(screen.getByText('http://localhost:3000/manage/mgmt-tok')).toBeInTheDocument();
  });

  it('renders two Copy buttons', () => {
    renderPage();
    expect(screen.getAllByRole('button', { name: /^copy$/i })).toHaveLength(2);
  });

  it('renders a link to the management page', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /management page/i });
    expect(link).toHaveAttribute('href', '/manage/mgmt-tok');
  });

  it('redirects to / when route state is null', () => {
    renderPage(null);
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('redirects to / when route state is missing required fields', () => {
    renderPage({ slug: 'abc12' });
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
