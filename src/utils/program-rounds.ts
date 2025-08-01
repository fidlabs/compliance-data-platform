export type ProgramRound = {
  id: number;
  start: number;
  isCurrent?: boolean;
  end?: number;
  lowReplicaRequirement: number;
  highReplicaRequirement?: number;
};

const programRoundData: ProgramRound[] = [
  { id: 5, start: 0, end: 1751846399, lowReplicaRequirement: 4 }, // < 2026-07-06
  {
    id: 6,
    start: 1751846400,
    isCurrent: true,
    lowReplicaRequirement: 4,
    highReplicaRequirement: 8,
  }, // >= 2026-07-07
];

export const getProgramRoundByTimestamp = (timestamp: number): ProgramRound => {
  const round = programRoundData.find((round) =>
    !round.end
      ? round.start <= timestamp
      : round.start <= timestamp && round.end >= timestamp,
  );

  if (!round) {
    return programRoundData[programRoundData.length - 1]; // Return the last round if no match found
  } else {
    return round;
  }
};

export const getProgramRoundByNumber = (
  roundId: number,
): ProgramRound | undefined => {
  return programRoundData.find((round) => round.id === roundId);
};

export const getCurrentProgramRound = (): ProgramRound => {
  const now = Math.floor(Date.now() / 1000);
  return getProgramRoundByTimestamp(now);
};
