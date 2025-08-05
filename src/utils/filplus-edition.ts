export type FilPlusEdition = {
  id: number;
  start: number;
  end?: number;
  lowReplicaThreshold: number;
  highReplicaThreshold: number;
};

// prettier-ignore
const filPlusEditions: FilPlusEdition[] = [
  { id: 5, start: 0, end: 1751846399, lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // < 2026-07-06
  { id: 6, start: 1751846400, lowReplicaThreshold: 4, highReplicaThreshold: 8 }, // >= 2026-07-07
];

export const getFilPlusEditionByTimestamp = (
  timestamp: number,
): FilPlusEdition => {
  const edition = filPlusEditions.find((edition) =>
    edition.end
      ? edition.start <= timestamp && edition.end >= timestamp
      : edition.start <= timestamp,
  );

  return edition ?? filPlusEditions[filPlusEditions.length - 1]; // return the last edition if no match found
};

export const getFilPlusEditionByNumber = (
  roundId: number,
): FilPlusEdition | undefined => {
  return filPlusEditions.find((round) => round.id === roundId);
};

export const getCurrentFilPlusEdition = (): FilPlusEdition => {
  const now = Math.floor(Date.now() / 1000);
  return getFilPlusEditionByTimestamp(now);
};

export const getFilPlusEditionDateTimeRange = (
  roundId: number,
): { startDate: Date; endDate: Date } | undefined => {
  const edition = getFilPlusEditionByNumber(roundId);

  if (!edition) {
    throw new Error(`FilPlus edition with ID ${roundId} not found`);
  }

  return {
    startDate: new Date(edition.start * 1000),
    endDate: edition.end ? new Date(edition.end * 1000) : new Date(),
  };
};
