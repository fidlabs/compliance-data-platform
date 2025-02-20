import { ApiProperty } from '@nestjs/swagger';
import { IntersectionType } from '@nestjs/swagger';

export enum ProviderComplianceScoreRange {
  NonCompliant, // compliance score: 0 - 0
  PartiallyCompliant, // compliance score: 1 - 2
  Compliant, // compliance score: 3 - 3
}

export class StorageProviderComplianceWeekPercentage {
  @ApiProperty({
    description: 'Percentage of compliant storage providers',
  })
  compliantSpsPercentage: number;

  @ApiProperty({
    description: 'Percentage of partially compliant storage providers',
  })
  partiallyCompliantSpsPercentage: number;

  @ApiProperty({
    description: 'Percentage of non-compliant storage providers',
  })
  nonCompliantSpsPercentage: number;
}

export class StorageProviderComplianceWeekTotalDatacap {
  @ApiProperty({
    description: 'Total datacap of compliant storage providers',
  })
  compliantSpsTotalDatacap: number;

  @ApiProperty({
    description: 'Total datacap of partially compliant storage providers',
  })
  partiallyCompliantSpsTotalDatacap: number;

  @ApiProperty({
    description: 'Total datacap of non-compliant storage providers',
  })
  nonCompliantSpsTotalDatacap: number;
}

export class StorageProviderComplianceWeekCount {
  @ApiProperty({
    description: 'Number of compliant storage providers',
  })
  compliantSps: number;

  @ApiProperty({
    description: 'Number of partially compliant storage providers',
  })
  partiallyCompliantSps: number;

  @ApiProperty({
    description: 'Number of non-compliant storage providers',
  })
  nonCompliantSps: number;
}

export class StorageProviderComplianceWeek extends IntersectionType(
  StorageProviderComplianceWeekCount,
  StorageProviderComplianceWeekTotalDatacap,
) {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({
    description: 'Total number of storage providers in the week',
  })
  totalSps: number;

  @ApiProperty({
    description:
      'Average storage providers retrievability success rate in the week',
  })
  averageSuccessRate: number;
}

export class StorageProviderComplianceWeekResponse {
  @ApiProperty({
    description:
      'Last full week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: StorageProviderComplianceWeek, isArray: true })
  results: StorageProviderComplianceWeek[];

  constructor(
    averageSuccessRate: number,
    results: StorageProviderComplianceWeek[],
  ) {
    this.averageSuccessRate = averageSuccessRate;
    this.results = results;
  }
}
