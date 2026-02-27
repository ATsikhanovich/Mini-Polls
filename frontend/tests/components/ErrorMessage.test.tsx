import { render, screen } from '@testing-library/react';
import { ErrorMessage } from '../../src/components/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ErrorMessage message={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when message is undefined', () => {
    const { container } = render(<ErrorMessage message={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when message is an empty string', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the error text when message is provided', () => {
    render(<ErrorMessage message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with error styling', () => {
    render(<ErrorMessage message="Validation error" />);
    const p = screen.getByText('Validation error');
    expect(p.tagName).toBe('P');
    expect(p.className).toMatch(/text-red/);
  });
});
