import { DateTime } from 'luxon';

export type FilplusEditionConfig = {
  id: number;
  start?: number;
  end?: number;
  lowReplicaThreshold: number;
  highReplicaThreshold: number;
};

export type FilPlusEdition = {
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
} & FilplusEditionConfig;

// prettier-ignore
export const filPlusEditions: FilplusEditionConfig[] = [
  { id: 4, end: 1709251200, lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // < 1 March 2024
  { id: 5, start: 1709251200, end: 1752192000, lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // 1 March 2024 - 11 July 2025
  { id: 6, start: 1752192000, lowReplicaThreshold: 4, highReplicaThreshold: 8 }, // >= 11 July 2025
];

const getFilPlusEditions = (): FilPlusEdition[] => {
  return filPlusEditions.map((edition) => ({
    ...edition,
    isCurrent:
      Date.now() / 1000 >= edition.start && Date.now() / 1000 <= edition.end,
    startDate: DateTime.fromSeconds(edition.start).toUTC().toJSDate(),
    endDate: DateTime.fromSeconds(edition.end).toUTC().toJSDate(),
  }));
};

export const getFilPlusEditionByTimestamp = (
  timestamp: number,
): FilPlusEdition => {
  if (timestamp > 100000000000) {
    // assume milliseconds instead of seconds
    timestamp /= 1000;
  }
  const filPlusEditions = getFilPlusEditions();

  return filPlusEditions.find(
    (edition) =>
      (!edition.start || edition.start <= timestamp) &&
      (!edition.end || edition.end > timestamp),
  );
};

export const getFilPlusEditionById = (id: number): FilPlusEdition | null => {
  const filPlusEditions = getFilPlusEditions();
  return filPlusEditions.find((edition) => edition.id === id) ?? null;
};

export const getCurrentFilPlusEdition = (): FilPlusEdition => {
  const now = Math.floor(Date.now() / 1000);
  return getFilPlusEditionByTimestamp(now);
};
