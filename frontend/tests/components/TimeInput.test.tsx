import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeInput } from '../../src/components/TimeInput';

describe('TimeInput', () => {
  it('renders hour and minute selects', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={14} minutes={30} onChange={handleChange} />);

    expect(screen.getByLabelText('Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Minute')).toBeInTheDocument();
  });

  it('displays the correct hour and minute values', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={14} minutes={30} onChange={handleChange} />);

    const hourSelect = screen.getByLabelText('Hour') as HTMLSelectElement;
    const minuteSelect = screen.getByLabelText('Minute') as HTMLSelectElement;

    expect(hourSelect.value).toBe('14');
    expect(minuteSelect.value).toBe('30');
  });

  it('calls onChange when hour is changed', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={14} minutes={30} onChange={handleChange} />);

    const hourSelect = screen.getByLabelText('Hour');
    fireEvent.change(hourSelect, { target: { value: '10' } });

    expect(handleChange).toHaveBeenCalledWith(10, 30);
  });

  it('calls onChange when minute is changed', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={14} minutes={30} onChange={handleChange} />);

    const minuteSelect = screen.getByLabelText('Minute');
    fireEvent.change(minuteSelect, { target: { value: '45' } });

    expect(handleChange).toHaveBeenCalledWith(14, 45);
  });

  it('provides minute options in 15-minute increments and ensures visibility styling', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={14} minutes={30} onChange={handleChange} />);

    const minuteSelect = screen.getByLabelText('Minute') as HTMLSelectElement;
    const options = Array.from(minuteSelect.options).map((opt) => opt.value);

    expect(options).toEqual(['0', '15', '30', '45']);

    // each option should use dark text so it remains readable on light backgrounds
    Array.from(minuteSelect.options).forEach((opt) => {
      expect(opt).toHaveClass('text-black');
    });
  });

  it('provides all 24 hours and ensures visibility styling', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={0} minutes={0} onChange={handleChange} />);

    const hourSelect = screen.getByLabelText('Hour') as HTMLSelectElement;
    const options = Array.from(hourSelect.options).map((opt) => parseInt(opt.value, 10));

    expect(options.length).toBe(24);
    expect(options[0]).toBe(0);
    expect(options[23]).toBe(23);

    Array.from(hourSelect.options).forEach((opt) => {
      expect(opt).toHaveClass('text-black');
    });
  });

  it('disables selects when disabled prop is true', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={14} minutes={30} onChange={handleChange} disabled={true} />);

    const hourSelect = screen.getByLabelText('Hour');
    const minuteSelect = screen.getByLabelText('Minute');

    expect(hourSelect).toBeDisabled();
    expect(minuteSelect).toBeDisabled();
  });

  it('formats hour values with leading zero', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={9} minutes={0} onChange={handleChange} />);

    const hourSelect = screen.getByLabelText('Hour') as HTMLSelectElement;
    const optionText = hourSelect.options[9].textContent;

    expect(optionText).toBe('09');
  });

  it('formats minute values with leading zero', () => {
    const handleChange = vi.fn();
    render(<TimeInput hours={0} minutes={0} onChange={handleChange} />);

    const minuteSelect = screen.getByLabelText('Minute') as HTMLSelectElement;
    const optionText = minuteSelect.options[0].textContent;

    expect(optionText).toBe('00');
  });
});
