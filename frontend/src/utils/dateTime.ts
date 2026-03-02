/**
 * Date-time utilities for custom date-time picker.
 */

/**
 * Get the current minimum ISO datetime string (e.g., "2026-03-02T15:30").
 * Applies timezone correction to ensure displayed min date is relative to local time.
 */
export function getDateTimeLocalMin(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Convert an ISO datetime string (e.g., "2026-03-02T15:30:00Z") to datetime-local format (e.g., "2026-03-02T15:30").
 * Returns empty string if input is null/undefined.
 */
export function toDateTimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

/**
 * Parse a datetime-local input value (e.g., "2026-03-02T15:30") into a Date object.
 * Note: datetime-local values are interpreted as local time, not UTC.
 */
export function parseDateTime(dateTimeLocalValue: string): Date {
  // datetime-local format: YYYY-MM-DDTHH:mm
  // Parse as local time by adding timezone offset
  const date = new Date(dateTimeLocalValue);
  return date;
}

/**
 * Convert separate date and time components to an ISO 8601 string.
 *
 * @param date - A Date object or string in YYYY-MM-DD format
 * @param hours - Hour in 24-hour format (0-23)
 * @param minutes - Minutes (0-59)
 * @returns ISO 8601 string (e.g., "2026-03-02T15:30:00Z")
 */
export function formatToISO(date: Date | string, hours: number, minutes: number): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    // Parse YYYY-MM-DD format
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Create a local date with specified time
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hoursStr = String(hours).padStart(2, '0');
  const minutesStr = String(minutes).padStart(2, '0');

  // Create ISO string: YYYY-MM-DDTHH:mm:00.000Z
  const isoString = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000Z`;
  return isoString;
}

/**
 * Check if a date is in the past relative to now.
 */
export function isDateInPast(date: Date): boolean {
  return date <= new Date();
}

/**
 * Get the number of days in a given month.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get the day of the week for the first day of a given month (0-6, Sunday-Saturday).
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Check if a date is valid (e.g., not NaN after parsing).
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

/**
 * Format a Date object as YYYY-MM-DD.
 */
export function formatDateAsString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract date and time components from an ISO string.
 * Returns null if the string is invalid.
 */
export function extractDateTimeComponents(iso: string | null | undefined): {
  date: Date;
  hours: number;
  minutes: number;
} | null {
  if (!iso) return null;

  const parsed = parseDateTime(iso);
  if (!isValidDate(parsed)) return null;

  return {
    date: parsed,
    hours: parsed.getHours(),
    minutes: parsed.getMinutes(),
  };
}
