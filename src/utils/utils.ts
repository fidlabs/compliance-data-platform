import { DateTime } from 'luxon';

export function stringToBool(s?: string): boolean | null {
  if (['1', 'TRUE', 'YES', 'ON'].includes(s?.toUpperCase())) return true;
  if (['0', 'FALSE', 'NO', 'OFF'].includes(s?.toUpperCase())) return false;
  return null;
}

export type stringifiedBool = 'true' | 'false';

export function lastWeek(): Date {
  return DateTime.now().toUTC().minus({ week: 1 }).startOf('week').toJSDate();
}

export function envNotSet(value?: any) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  );
}

export function envSet(value?: any) {
  return !envNotSet(value);
}
