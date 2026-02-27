/**
 * Derives a display status from the backend `isClosed` flag and `expiresAt` timestamp.
 *
 * - `'expired'` — closed AND expiresAt is non-null AND the expiration date is in the past.
 * - `'closed'`  — closed but not expired (manually closed or no expiration).
 * - `'active'`  — not closed.
 */
export function derivePollStatus(
  isClosed: boolean,
  expiresAt: string | null,
): 'active' | 'closed' | 'expired' {
  if (isClosed && expiresAt !== null && new Date(expiresAt) <= new Date()) {
    return 'expired';
  }
  if (isClosed) {
    return 'closed';
  }
  return 'active';
}
