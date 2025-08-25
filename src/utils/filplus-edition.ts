export type FilPlusEdition = {
  id: number;
  start?: number;
  end?: number;
  lowReplicaThreshold: number;
  highReplicaThreshold: number;
};

// prettier-ignore
export const filPlusEditions: FilPlusEdition[] = [
  { id: 4, end: 1709251200, lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // < 1 March 2024
  { id: 5, start: 1709251200, end: 1752192000, lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // 1 March 2024 - 11 July 2025
  { id: 6, start: 1752192000, lowReplicaThreshold: 4, highReplicaThreshold: 8 }, // >= 11 July 2025
];

export const getFilPlusEditionByTimestamp = (
  timestamp: number,
): FilPlusEdition => {
  if (timestamp > 100000000000) {
    // assume milliseconds instead of seconds
    timestamp /= 1000;
  }

  return filPlusEditions.find(
    (edition) =>
      (!edition.start || edition.start <= timestamp) &&
      (!edition.end || edition.end > timestamp),
  );
};

export const getFilPlusEditionById = (id: number): FilPlusEdition | null => {
  return filPlusEditions.find((edition) => edition.id === id) ?? null;
};

export const getCurrentFilPlusEdition = (): FilPlusEdition => {
  const now = Math.floor(Date.now() / 1000);
  return getFilPlusEditionByTimestamp(now);
};
