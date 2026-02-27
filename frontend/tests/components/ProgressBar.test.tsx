import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressBar } from '../../src/components/ProgressBar';

describe('ProgressBar', () => {
  it('renders a progressbar role element', () => {
    render(<ProgressBar percentage={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('fill bar has width: 0% style when percentage is 0', () => {
    const { container } = render(<ProgressBar percentage={0} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('fill bar has width: 50% style when percentage is 50', () => {
    const { container } = render(<ProgressBar percentage={50} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('fill bar has width: 100% style when percentage is 100', () => {
    const { container } = render(<ProgressBar percentage={100} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('clamps percentage above 100 to 100% width', () => {
    const { container } = render(<ProgressBar percentage={150} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('clamps negative percentage to 0% width', () => {
    const { container } = render(<ProgressBar percentage={-10} />);
    const fill = container.querySelector('[style]') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('displays formatted percentage text (e.g. "42.9%")', () => {
    render(<ProgressBar percentage={42.9} />);
    expect(screen.getByText('42.9%')).toBeInTheDocument();
  });

  it('drops the trailing .0 in formatted percentage (e.g. "50%")', () => {
    render(<ProgressBar percentage={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays label text when label prop is provided', () => {
    render(<ProgressBar percentage={30} label="Red" />);
    expect(screen.getByText('Red')).toBeInTheDocument();
  });

  it('has correct aria-valuenow attribute matching the percentage', () => {
    render(<ProgressBar percentage={75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });
});
