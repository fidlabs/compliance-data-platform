import { DateTime } from 'luxon';

export function stringToBool(s?: string): boolean | null {
  if (['1', 'TRUE', 'YES', 'ON'].includes(s?.toUpperCase())) return true;
  if (['0', 'FALSE', 'NO', 'OFF'].includes(s?.toUpperCase())) return false;
  return null;
}

export function stringToDate(isoString?: string): Date | null {
  if (!isoString) return null;
  const date = DateTime.fromISO(isoString, { zone: 'utc' });
  return date.isValid ? date.toJSDate() : null;
}

export type stringifiedBool = 'true' | 'false';

export function lastWeek(): Date {
  return DateTime.now().toUTC().minus({ week: 1 }).startOf('week').toJSDate();
}

export function yesterday(): Date {
  return DateTime.now().toUTC().minus({ day: 1 }).startOf('day').toJSDate();
}

export function envNotSet(value?: any): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  );
}

export function envSet(value?: any): boolean {
  return !envNotSet(value);
}
