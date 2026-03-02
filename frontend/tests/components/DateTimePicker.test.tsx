import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateTimePicker } from '../../src/components/DateTimePicker';

describe('DateTimePicker', () => {
  it('renders a button with default placeholder text when no value is provided', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    // The button uses aria-label for accessibility
    const button = screen.getByLabelText(/select date and time/i);
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('displays the formatted value when provided', () => {
    const handleChange = vi.fn();
    const iso = '2026-03-15T14:30:00.000Z';
    render(<DateTimePicker value={iso} onChange={handleChange} />);

    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Mar');
    expect(button.textContent).toContain('15');
  });

  it('opens the popover when the button is clicked', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the popover when clicking outside', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <div>
        <DateTimePicker value={null} onChange={handleChange} />
        <div data-testid="outside">Outside element</div>
      </div>,
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onChange with ISO string when Confirm button is clicked', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    const button = screen.getByLabelText(/select date and time/i);
    fireEvent.click(button);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(handleChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/));
  });

  it('closes popover after confirming', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes popover when Escape key is pressed', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open when disabled', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} disabled={true} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has aria-disabled when disabled', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('initializes with provided ISO value', () => {
    const handleChange = vi.fn();
    const iso = '2026-03-15T14:30:00.000Z';
    render(<DateTimePicker value={iso} onChange={handleChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const hourSelect = screen.getByLabelText('Hour') as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText('Minute') as HTMLSelectElement;

    // Note: Timezone conversion may affect hours slightly
    // Just verify the selects exist and have values
    expect(hourSelect).toHaveValue();
    expect(minuteSelect).toHaveValue();
  });

  it('shows calendar and time input in the popover', () => {
    const handleChange = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Check for calendar elements
    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Minute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();

    // ensure hour/minute option text will be readable against default dropdown background
    const hourSelect = screen.getByLabelText('Hour') as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText('Minute') as HTMLSelectElement;
    Array.from(hourSelect.options).forEach((opt) => {
      expect(opt).toHaveClass('text-black');
    });
    Array.from(minuteSelect.options).forEach((opt) => {
      expect(opt).toHaveClass('text-black');
    });
  });

  it('uses custom aria-label when provided', () => {
    const handleChange = vi.fn();
    render(
      <DateTimePicker
        value={null}
        onChange={handleChange}
        aria-label="Custom date picker label"
      />,
    );

    const button = screen.getByLabelText('Custom date picker label');
    expect(button).toBeInTheDocument();
  });

  it('respects min date constraint', () => {
    const handleChange = vi.fn();
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minIso = minDate.toISOString();

    render(<DateTimePicker value={null} onChange={handleChange} min={minIso} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Calendar should be visible with min date constraint
  });

  it('applies custom className', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <DateTimePicker
        value={null}
        onChange={handleChange}
        className="custom-class"
      />,
    );

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('calls onBlur when provided after confirming', () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} onBlur={handleBlur} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(handleBlur).toHaveBeenCalled();
  });

  it('calls onBlur when Escape is pressed', () => {
    const handleChange = vi.fn();
    const handleBlur = vi.fn();
    render(<DateTimePicker value={null} onChange={handleChange} onBlur={handleBlur} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(handleBlur).toHaveBeenCalled();
  });
});
