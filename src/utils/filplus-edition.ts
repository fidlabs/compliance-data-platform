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
  const round = filPlusEditions.find((round) =>
    round.end
      ? round.start <= timestamp && round.end >= timestamp
      : round.start <= timestamp,
  );

  return round ?? filPlusEditions[filPlusEditions.length - 1]; // return the last round if no match found
};
