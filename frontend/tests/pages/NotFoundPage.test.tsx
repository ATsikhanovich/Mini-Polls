import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import NotFoundPage from '../../src/pages/NotFoundPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders heading "Poll not found"', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /poll not found/i })).toBeInTheDocument();
  });

  it('renders a link to the home page', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /create a poll/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders descriptive text', () => {
    renderPage();
    expect(screen.getByText(/does not exist or the link is invalid/i)).toBeInTheDocument();
  });
});
