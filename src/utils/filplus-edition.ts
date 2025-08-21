import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export const DEFAULT_FILPLUS_EDITION_ID = 6;

export type FilplusEditionConfig = {
  id: number;
  startTimestamp: number;
  endTimestamp: number;
  lowReplicaThreshold: number;
  highReplicaThreshold: number;
};

export type FilPlusEdition = {
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
} & FilplusEditionConfig;

// prettier-ignore
const filPlusEditions: FilplusEditionConfig[] = [
  { id: 5, startTimestamp: 0, endTimestamp: 1751846399, lowReplicaThreshold: 4, highReplicaThreshold: 10 }, // < 2026-07-06 and before 2026-07-07
  { id: 6, startTimestamp: 1751846400, endTimestamp: 4891363200, lowReplicaThreshold: 4, highReplicaThreshold: 8 }, // >= 2026-07-07 to future
];

const getFilPlusEditions = (): FilPlusEdition[] => {
  return filPlusEditions.map((edition) => ({
    ...edition,
    isCurrent: edition.id === DEFAULT_FILPLUS_EDITION_ID,
    startDate: DateTime.fromSeconds(edition.startTimestamp).toUTC().toJSDate(),
    endDate: DateTime.fromSeconds(edition.endTimestamp).toUTC().toJSDate(),
  }));
};

export const getFilPlusEditionByTimestamp = (
  timestamp: number,
): FilPlusEdition => {
  const allEditions = getFilPlusEditions();

  const edition = allEditions.find((edition) =>
    edition.endTimestamp
      ? edition.startTimestamp <= timestamp && edition.endTimestamp >= timestamp
      : edition.startTimestamp <= timestamp,
  );

  return edition ?? allEditions[filPlusEditions.length - 1]; // return the last edition if no match found
};

export const getFilPlusEditionByNumber = (
  roundId: number,
): FilPlusEdition | undefined => {
  const allEditions = getFilPlusEditions();

  return allEditions.find((round) => round.id === roundId);
};

export const getCurrentFilPlusEdition = (): FilPlusEdition => {
  const now = Math.floor(Date.now() / 1000);
  return getFilPlusEditionByTimestamp(now);
};

export const getFilPlusEditionWithDateTimeRange = (
  roundId: number,
): FilPlusEdition => {
  const edition = getFilPlusEditionByNumber(roundId);

  if (!edition) {
    throw new Error(`FilPlus edition with ID ${roundId} not found`);
  }

  return edition;
};

export const getAllocatorRegistryModelByFilPlusEdition = (roundId: number) => {
  const editionData = getFilPlusEditionByNumber(roundId);

  if (!editionData) {
    throw new BadRequestException(`Invalid program round ID: ${roundId}`);
  }

  return editionData.isCurrent
    ? 'allocator_registry'
    : 'allocator_registry_archived';
};
