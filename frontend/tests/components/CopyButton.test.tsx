import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { CopyButton } from '../../src/components/CopyButton';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CopyButton', () => {
  it('renders with default "Copy" label', () => {
    render(<CopyButton value="https://example.com" />);
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument();
  });

  it('renders with a custom label', () => {
    render(<CopyButton value="https://example.com" label="Copy link" />);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('calls navigator.clipboard.writeText with the correct value on click', async () => {
    // userEvent.setup() installs a virtual clipboard on navigator.clipboard in jsdom
    const user = userEvent.setup();
    const spy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<CopyButton value="https://example.com/p/abc" />);
    await user.click(screen.getByRole('button'));
    // "Copied!" confirms the promise resolved; spy confirms the exact value sent
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith('https://example.com/p/abc');
  });

  it('shows "Copied!" after a successful copy', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="https://example.com" />);
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('schedules a 2-second revert to original label', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const user = userEvent.setup();
    render(<CopyButton value="https://example.com" label="Copy" />);
    await user.click(screen.getByRole('button'));
    await screen.findByText('Copied!');
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
  });

  it('shows "Failed" if writeText rejects', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('not allowed'));
    render(<CopyButton value="https://example.com" />);
    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('Failed')).toBeInTheDocument();
  });
});
