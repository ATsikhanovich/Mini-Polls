import { describe, it, expect } from 'vitest';
import { derivePollStatus } from '../../src/utils/derivePollStatus';

describe('derivePollStatus', () => {
  it('returns "active" when isClosed is false and expiresAt is null', () => {
    expect(derivePollStatus(false, null)).toBe('active');
  });

  it('returns "active" when isClosed is false and expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1_000_000).toISOString();
    expect(derivePollStatus(false, future)).toBe('active');
  });

  it('returns "closed" when isClosed is true and expiresAt is null', () => {
    expect(derivePollStatus(true, null)).toBe('closed');
  });

  it('returns "closed" when isClosed is true and expiresAt is in the future', () => {
    const future = new Date(Date.now() + 1_000_000).toISOString();
    expect(derivePollStatus(true, future)).toBe('closed');
  });

  it('returns "expired" when isClosed is true and expiresAt is in the past', () => {
    const past = new Date(Date.now() - 1_000_000).toISOString();
    expect(derivePollStatus(true, past)).toBe('expired');
  });
});
