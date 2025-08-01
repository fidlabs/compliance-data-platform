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
