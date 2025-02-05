import { ApiProperty } from '@nestjs/swagger';

export enum ProviderComplianceScoreRange {
  NonCompliant, // 0-0
  PartiallyCompliant, // 1-2
  Compliant, // 3-3
}

export class StorageProviderComplianceWeekPercentage {
  @ApiProperty({ type: Number })
  compliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  partiallyCompliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  nonCompliantSpsPercentage: number;

  @ApiProperty({ type: Number })
  totalSps: number;
}

export class StorageProviderComplianceWeekCount {
  @ApiProperty({ type: Number })
  compliantSps: number;

  @ApiProperty({ type: Number })
  partiallyCompliantSps: number;

  @ApiProperty({ type: Number })
  nonCompliantSps: number;

  @ApiProperty({ type: Number })
  totalSps: number;
}

export class StorageProviderComplianceWeek extends StorageProviderComplianceWeekCount {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;
}

export class StorageProviderComplianceWeekResponse {
  @ApiProperty({ type: StorageProviderComplianceWeek, isArray: true })
  results: StorageProviderComplianceWeek[];

  constructor(results: StorageProviderComplianceWeek[]) {
    this.results = results;
  }
}
