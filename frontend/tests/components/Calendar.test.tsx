import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Calendar } from '../../src/components/Calendar';

describe('Calendar', () => {
  const selectedDate = new Date(2026, 2, 15); // March 15, 2026

  it('renders the calendar with the correct month and year', () => {
    const handleSelect = vi.fn();
    render(<Calendar selectedDate={selectedDate} onSelectDate={handleSelect} />);

    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('renders weekday headers', () => {
    const handleSelect = vi.fn();
    render(<Calendar selectedDate={selectedDate} onSelectDate={handleSelect} />);

    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    weekdays.forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
  });

  it('calls onSelectDate when a day is clicked', () => {
    const handleSelect = vi.fn();
    render(<Calendar selectedDate={selectedDate} onSelectDate={handleSelect} />);

    const day10Button = screen.getByLabelText('March 10, 2026');
    fireEvent.click(day10Button);

    expect(handleSelect).toHaveBeenCalledWith(expect.any(Date));
    const callArg = handleSelect.mock.calls[0][0] as Date;
    expect(callArg.getDate()).toBe(10);
    expect(callArg.getMonth()).toBe(2);
  });

  it('highlights the selected date', () => {
    const handleSelect = vi.fn();
    render(<Calendar selectedDate={selectedDate} onSelectDate={handleSelect} />);

    const selectedButton = screen.getByLabelText('March 15, 2026');
    expect(selectedButton).toHaveClass('bg-primary-500');
  });

  it('disables dates before minDate', () => {
    const minDate = new Date(2026, 2, 10);
    const handleSelect = vi.fn();
    render(
      <Calendar selectedDate={selectedDate} onSelectDate={handleSelect} minDate={minDate} />,
    );

    const day5Button = screen.getByLabelText('March 5, 2026');
    expect(day5Button).toBeDisabled();

    const day10Button = screen.getByLabelText('March 10, 2026');
    expect(day10Button).not.toBeDisabled();
  });

  it('navigates to previous month when left arrow is clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(<Calendar selectedDate={selectedDate} onSelectDate={handleSelect} />);

    const prevButton = container.querySelector('button[aria-label="Previous month"]') as HTMLButtonElement;
    fireEvent.click(prevButton);

    expect(screen.getByText('February 2026')).toBeInTheDocument();
  });

  it('navigates to next month when right arrow is clicked', () => {
    const handleSelect = vi.fn();
    const { container } = render(<Calendar selectedDate={selectedDate} onSelectDate={handleSelect} />);

    const nextButton = container.querySelector('button[aria-label="Next month"]') as HTMLButtonElement;
    fireEvent.click(nextButton);

    expect(screen.getByText('April 2026')).toBeInTheDocument();
  });

  it('handles year boundary when navigating months', () => {
    const decemberDate = new Date(2025, 11, 15);
    const handleSelect = vi.fn();
    const { container, rerender } = render(
      <Calendar selectedDate={decemberDate} onSelectDate={handleSelect} />,
    );

    expect(screen.getByText('December 2025')).toBeInTheDocument();

    const nextButton = container.querySelector('button[aria-label="Next month"]') as HTMLButtonElement;
    fireEvent.click(nextButton);

    rerender(<Calendar selectedDate={decemberDate} onSelectDate={handleSelect} />);
    expect(screen.getByText('January 2026')).toBeInTheDocument();
  });

  it('disables all interactions when disabled prop is true', () => {
    const handleSelect = vi.fn();
    const { container } = render(
      <Calendar selectedDate={selectedDate} onSelectDate={handleSelect} disabled={true} />,
    );

    const dayButton = screen.getByLabelText('March 10, 2026');
    fireEvent.click(dayButton);

    expect(handleSelect).not.toHaveBeenCalled();

    const prevButton = container.querySelector('button[aria-label="Previous month"]') as HTMLButtonElement;
    expect(prevButton).toBeDisabled();
  });
});
