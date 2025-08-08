import { ApiProperty, IntersectionType } from '@nestjs/swagger';
import { FilPlusEditionRequest } from 'src/controller/base/program-round-controller-base';
import { StorageProviderComplianceMetricsRequest } from 'src/controller/storage-providers/types.storage-providers';
import { DEFAULT_FILPLUS_EDITION_ID } from 'src/utils/filplus-edition';
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
    roundId = DEFAULT_FILPLUS_EDITION_ID,
  ) {
    super();
    this.retrievability = retrievability;
    this.numberOfClients = numberOfClients;
    this.totalDealSize = totalDealSize;
    this.roundId = roundId;
  }

  public static of(metrics: StorageProviderComplianceMetricsRequest) {
    return new StorageProviderComplianceMetrics(
      stringToBool(metrics.retrievability) ?? true,
      stringToBool(metrics.numberOfClients) ?? true,
      stringToBool(metrics.totalDealSize) ?? true,
      Number(metrics.roundId),
    );
  }
}

export class StorageProviderComplianceWeekResponse {
  @ApiProperty({
    description: 'Storage providers compliance metrics checked',
  })
  metricsChecked: StorageProviderComplianceMetrics;

  @ApiProperty({
    description:
      'Last full week average storage providers retrievability success rate',
  })
  averageSuccessRate: number;

  @ApiProperty({ type: StorageProviderComplianceWeek, isArray: true })
  results: StorageProviderComplianceWeek[];

  constructor(
    metricsChecked: StorageProviderComplianceMetrics,
    averageSuccessRate: number,
    results: StorageProviderComplianceWeek[],
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
  avg_retrievability_success_rate: number;
  avg_retrievability_success_rate_http: number;
  num_of_clients: number;
  biggest_client_total_deal_size: bigint | null;
  total_deal_size: bigint | null;
  provider: string;
}
