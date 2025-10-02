import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { stringToBool } from 'src/utils/utils';

export enum StorageProviderComplianceScoreRange {
  NonCompliant = 'nonCompliant',
  PartiallyCompliant = 'partiallyCompliant',
  Compliant = 'compliant',
}

export class StorageProviderComplianceScore {
  complianceScore: StorageProviderComplianceScoreRange;
  provider: string;
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
    type: String,
    format: 'int64',
    example: '42',
  })
  compliantSpsTotalDatacap: bigint;

  @ApiProperty({
    description: 'Total datacap of partially compliant storage providers',
    type: String,
    format: 'int64',
    example: '42',
  })
  partiallyCompliantSpsTotalDatacap: bigint;

  @ApiProperty({
    description: 'Total datacap of non-compliant storage providers',
    type: String,
    format: 'int64',
    example: '42',
  })
  nonCompliantSpsTotalDatacap: bigint;
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

export class StorageProviderComplianceWeekResults extends IntersectionType(
  StorageProviderComplianceWeekCount,
  StorageProviderComplianceWeekTotalDatacap,
) {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
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

export class StorageProviderComplianceMetrics extends FilPlusEditionRequest {
  @ApiProperty()
  retrievability: boolean;

  @ApiProperty()
  numberOfClients: boolean;

  @ApiProperty()
  totalDealSize: boolean;

  constructor(
    retrievability = true,
    numberOfClients = true,
    totalDealSize = true,
  ) {
    super();
    this.retrievability = retrievability;
    this.numberOfClients = numberOfClients;
    this.totalDealSize = totalDealSize;
  }

  public static of(metrics: StorageProviderComplianceMetricsRequest) {
    return new StorageProviderComplianceMetrics(
      stringToBool(metrics.retrievability) ?? true,
      stringToBool(metrics.numberOfClients) ?? true,
      stringToBool(metrics.totalDealSize) ?? true,
    );
  }
}

export class StorageProviderComplianceWeek {
  @ApiProperty({
    description: 'Storage providers compliance metrics checked',
  })
  metricsChecked: StorageProviderComplianceMetrics;

  @ApiProperty({
    description:
      'Last full week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: StorageProviderComplianceWeekResults, isArray: true })
  results: StorageProviderComplianceWeekResults[];

  constructor(
    metricsChecked: StorageProviderComplianceMetrics,
    averageSuccessRate: number,
    results: StorageProviderComplianceWeekResults[],
  ) {
    this.metricsChecked = metricsChecked;
    this.averageSuccessRate = averageSuccessRate;
    this.results = results;
  }
}

export class StorageProviderWithIpInfo {
  @ApiProperty({ description: 'Storage provider ID' })
  provider: string;

  @ApiProperty({
    description: 'Latitude of the storage provider',
  })
  lat: string;

  @ApiProperty({
    description: 'Longitude of the storage provider',
  })
  long: string;

  @ApiProperty({ description: 'Country of the storage provider' })
  country: string;

  @ApiProperty({ description: 'Region of the storage provider' })
  region: string;

  @ApiProperty({ description: 'City of the storage provider' })
  city: string;
}

export class StorageProviderWeekly {
  avg_retrievability_success_rate_url_finder: number;
  avg_retrievability_success_rate: number;
  avg_retrievability_success_rate_http: number;
  num_of_clients: number;
  biggest_client_total_deal_size: bigint | null;
  total_deal_size: bigint | null;
  provider: string;
}
