/**
 * Formats a decimal fraction as a percentage string.
 *
 * @example
 * formatPercent(0.753) // "75.3%"
 * formatPercent(1)     // "100%"
 * formatPercent(0)     // "0%"
 */
export const formatPercent = (value: number, decimals = 1): string => {
  return `${(value * 100).toFixed(decimals).replace(/\.0$/, '')}%`;
};
