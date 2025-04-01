import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IntersectionType } from '@nestjs/swagger';

export enum StorageProviderComplianceScoreRange {
  NonCompliant, // complianceScore: 0 - 0
  PartiallyCompliant, // complianceScore: 1 - 2
  Compliant, // complianceScore: 3 - 3
}

export class StorageProviderComplianceMetrics {
  @ApiPropertyOptional({
    description:
      'Set to false to disable retrievability compliance metric check; default is true',
    type: Boolean,
  })
  retrievability?: 'true' | 'false';

  @ApiPropertyOptional({
    description:
      'Set to false to disable numberOfClients compliance metric check; default is true',
    type: Boolean,
  })
  numberOfClients?: 'true' | 'false';

  @ApiPropertyOptional({
    description:
      'Set to false to disable totalDealSize compliance metric check; default is true',
    type: Boolean,
  })
  totalDealSize?: 'true' | 'false';
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

export class StorageProviderComplianceMetricsResponse {
  @ApiProperty()
  retrievability: boolean;

  @ApiProperty()
  numberOfClients: boolean;

  @ApiProperty()
  totalDealSize: boolean;
}

export class StorageProviderComplianceWeekResponse {
  @ApiProperty({
    description: 'Storage providers compliance metrics checked',
  })
  metricsChecked: StorageProviderComplianceMetricsResponse;

  @ApiProperty({
    description:
      'Last full week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: StorageProviderComplianceWeek, isArray: true })
  results: StorageProviderComplianceWeek[];

  constructor(
    metricsChecked: StorageProviderComplianceMetricsResponse,
    averageSuccessRate: number,
    results: StorageProviderComplianceWeek[],
  ) {
    this.metricsChecked = metricsChecked;
    this.averageSuccessRate = averageSuccessRate;
    this.results = results;
  }
}

export class StorageProviderComplianceScore {
  complianceScore: number; // 0 - 3
  provider: string;
}

export class StorageProviderWithIpInfo {
  @ApiProperty({ type: String, description: 'ID of the storage provider' })
  provider: string;
  @ApiProperty({
    type: String,
    description: 'Latitude of the storage provider',
  })
  lat: string;
  @ApiProperty({
    type: String,
    description: 'Longitude of the storage provider',
  })
  long: string;
  @ApiProperty({ type: String, description: 'Country of the storage provider' })
  country: string;
  @ApiProperty({ type: String, description: 'Region of the storage provider' })
  region: string;
  @ApiProperty({ type: String, description: 'City of the storage provider' })
  city: string;
}
