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
}

export class StorageProviderComplianceWeek extends StorageProviderComplianceWeekPercentage {
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
