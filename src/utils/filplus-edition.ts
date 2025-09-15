import { DateTime } from 'luxon';

export type FilPlusEdition = {
  id: number;
  startDate?: Date;
  endDate?: Date;
  lowReplicaThreshold: number;
  highReplicaThreshold: number;
};

// prettier-ignore
export const filPlusEditions: FilPlusEdition[] = [
  { id: 4, endDate: DateTime.fromMillis(1709251200000).toUTC().toJSDate(), lowReplicaThreshold: 4, highReplicaThreshold: 10, }, // < 1 March 2024
  { id: 5, startDate: DateTime.fromMillis(1709251200000).toUTC().toJSDate(), endDate: DateTime.fromMillis(1752192000000).toUTC().toJSDate(), lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // 1 March 2024 - 11 July 2025
  { id: 6, startDate: DateTime.fromMillis(1752192000000).toUTC().toJSDate(), lowReplicaThreshold: 4, highReplicaThreshold: 8 }, // >= 11 July 2025
];

export const getFilPlusEditionByTimestamp = (
  timestamp: number,
): FilPlusEdition => {
  if (timestamp < 100000000000) {
    // assume seconds instead of milliseconds
    timestamp *= 1000;
  }

  return filPlusEditions.find(
    (edition) =>
      (!edition.startDate || edition.startDate.getTime() <= timestamp) &&
      (!edition.endDate || edition.endDate.getTime() > timestamp),
  );
};

export const getFilPlusEditionById = (id: number): FilPlusEdition | null => {
  return filPlusEditions.find((edition) => edition.id === id) ?? null;
};

export const getCurrentFilPlusEdition = (): FilPlusEdition => {
  return getFilPlusEditionByTimestamp(Date.now());
};
