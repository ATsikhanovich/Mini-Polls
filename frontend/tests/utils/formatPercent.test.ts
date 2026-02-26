import { describe, it, expect } from 'vitest';
import { formatPercent } from '../../src/utils/formatPercent';

describe('formatPercent', () => {
  it('formats a decimal fraction as a percentage string', () => {
    expect(formatPercent(0.753)).toBe('75.3%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1)).toBe('100%');
  });

  it('formats 0%', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('formats whole-number percentages without decimal point', () => {
    expect(formatPercent(0.5)).toBe('50%');
  });
});
