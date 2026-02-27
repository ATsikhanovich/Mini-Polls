import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from '../../src/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders "Active" text when status is active', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders "Closed" text when status is closed', () => {
    render(<StatusBadge status="closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders "Expired" text when status is expired', () => {
    render(<StatusBadge status="expired" />);
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('applies distinct CSS classes for each status', () => {
    const { rerender } = render(<StatusBadge status="active" />);
    const activeClass = screen.getByText('Active').className;

    rerender(<StatusBadge status="closed" />);
    const closedClass = screen.getByText('Closed').className;

    rerender(<StatusBadge status="expired" />);
    const expiredClass = screen.getByText('Expired').className;

    expect(activeClass).not.toBe(closedClass);
    expect(closedClass).not.toBe(expiredClass);
    expect(activeClass).not.toBe(expiredClass);
  });
});
