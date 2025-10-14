import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/types.filplus-edition-controller-base';
import { RetrievabilityType } from 'src/controller/stats/allocators/types.allocator-stats';
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
      'Average storage providers HTTP retrievability success rate in the week',
  })
  averageHttpSuccessRate: number;

  @ApiProperty({
    description:
      'Average storage providers Url Finder retrievability success rate in the week',
  })
  averageUrlFinderSuccessRate: number;
}

export class StorageProviderComplianceMetrics extends FilPlusEditionRequest {
  @ApiProperty()
  retrievabilityType?: RetrievabilityType;

  @ApiProperty()
  numberOfClients: boolean;

  @ApiProperty()
  totalDealSize: boolean;

  constructor(
    numberOfClients = true,
    totalDealSize = true,
    retrievabilityType = null,
  ) {
    super();
    this.retrievabilityType = retrievabilityType;
    this.numberOfClients = numberOfClients;
    this.totalDealSize = totalDealSize;
  }

  public static of(metrics: StorageProviderComplianceMetricsRequest) {
    return new StorageProviderComplianceMetrics(
      stringToBool(metrics.numberOfClients) ?? true,
      stringToBool(metrics.totalDealSize) ?? true,
      metrics.retrievabilityType,
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
      'Last full week average storage providers HTTP retrievability success rate',
  })
  averageHttpSuccessRate: number;

  @ApiProperty({
    description:
      'Last full week average storage providers URL Finder retrievability success rate',
  })
  averageUrlFinderSuccessRate: number;

  @ApiProperty({ type: StorageProviderComplianceWeekResults, isArray: true })
  results: StorageProviderComplianceWeekResults[];

  constructor(
    metricsChecked: StorageProviderComplianceMetrics,
    averageHttpSuccessRate: number,
    averageUrlFinderSuccessRate: number,
    results: StorageProviderComplianceWeekResults[],
  ) {
    this.metricsChecked = metricsChecked;
    this.averageHttpSuccessRate = averageHttpSuccessRate;
    this.averageUrlFinderSuccessRate = averageUrlFinderSuccessRate;
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
