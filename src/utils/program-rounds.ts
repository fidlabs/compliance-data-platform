type ProgramRound = {
  id: number;
  start: number;
  end?: number;
};

const programRoundDate: ProgramRound[] = [
  { id: 5, start: 1736208000, end: 1751846399 }, // 2025-01-07 - 2026-07-06
  { id: 6, start: 1751846400 }, // 2026-07-07 to now
];

export const getProgramRoundByTimestamp = (timestamp: number): ProgramRound => {
  const rounds = Object.keys(programRoundDate).map(Number);

  const round = programRoundDate.find(({ start, end }) => {
    return timestamp >= start && (end === undefined || timestamp <= end);
  });

  if (!round) {
    return programRoundDate[rounds[rounds.length - 1]]; // Return the last round if no match found
  } else {
    return round;
  }
};

export const getProgramRoundByNumber = (roundId: number): ProgramRound => {
  return programRoundDate.find((round) => round.id === roundId);
};

export const getCurrentProgramRound = (): ProgramRound => {
  const now = Math.floor(Date.now() / 1000);
  return getProgramRoundByTimestamp(now);
};
