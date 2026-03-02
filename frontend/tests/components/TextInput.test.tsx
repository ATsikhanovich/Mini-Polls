import { render, screen } from '@testing-library/react';
import { TextInput } from '../../src/components/TextInput';
import { describe, it, expect } from 'vitest';

describe('TextInput component', () => {
  it('renders an input element with given props and default styles', () => {
    render(<TextInput type="text" aria-label="foo" value="bar" />);
    const input = screen.getByLabelText('foo') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('bar');
    // should have at least one of the base class names
    expect(input.className).toMatch(/rounded-\[var\(--radius-input\)\]/);
    // color-scheme style applied
    expect(input.style.colorScheme).toBe('dark');
  });

  it('forwards additional className and style props', () => {
    render(
      <TextInput
        type="number"
        aria-label="baz"
        className="extra-class"
        style={{ width: '100px' }}
      />,
    );
    const input = screen.getByLabelText('baz');
    expect(input).toHaveClass('extra-class');
    expect((input as HTMLElement).style.width).toBe('100px');
  });
});
