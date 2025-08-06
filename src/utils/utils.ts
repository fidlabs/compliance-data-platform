import { DateTime } from 'luxon';
import { parse } from 'bytes-iec';

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

export function yesterday(): DateTime {
  return DateTime.now().toUTC().minus({ day: 1 }).startOf('day');
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

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseDataSizeToBytes(value?: string): bigint | null {
  if (!value) return null;

  if (!value.toUpperCase().endsWith('B'))
    throw new Error(`Invalid unit: ${value}`);

  return BigInt(parse(value));
}

export function bigIntToNumber(valueBigInt?: bigint): number | null {
  if (valueBigInt === undefined || valueBigInt === null) return null;

  // eslint-disable-next-line no-restricted-syntax
  const valueNumber = Number(valueBigInt);

  if (BigInt(valueNumber) !== valueBigInt) {
    throw new Error(`Value ${valueBigInt} is too large to convert to number`);
  }

  return valueNumber ?? null;
}

export function stringToNumber(valueString?: string): number | null {
  if (!valueString) return null;

  const rxInsignificant = /^[\s0]+|(?<=\..*)[\s0.]+$|\.0+$|\.$/gm;
  // eslint-disable-next-line no-restricted-globals
  const valueNumber = parseFloat(valueString);

  if (
    !Number.isFinite(valueNumber) ||
    valueNumber
      .toLocaleString('en-US', {
        useGrouping: false,
        maximumFractionDigits: 20,
        minimumFractionDigits: 0,
      })
      .replace(rxInsignificant, '') !== valueString.replace(rxInsignificant, '')
  ) {
    throw new Error(
      `Invalid / too large number or precision loss: ${valueString}`,
    );
  }

  return valueNumber ?? null;
}

export function bigIntDiv(
  a: bigint,
  b: bigint | number,
  precision: number = 2,
): number {
  const _precisionMultiplier = 10 ** precision;
  return stringToNumber(
    (
      bigIntToNumber((a * BigInt(_precisionMultiplier)) / BigInt(b)) /
      _precisionMultiplier
    ).toFixed(precision),
  );
}
