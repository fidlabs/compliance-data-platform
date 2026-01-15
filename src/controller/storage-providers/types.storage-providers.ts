import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { StorageProviderComplianceScoreRange } from 'src/service/storage-provider/types.storage-provider';
import { stringifiedBool } from 'src/utils/utils';
import {
  DashboardStatistic,
  DashboardStatisticChange,
  PaginationSortingInfoRequest,
} from '../base/types.controller-base';
import { FilPlusEditionRequest } from '../base/types.filplus-edition-controller-base';
import { StorageProvidersMetricType } from 'prisma/generated/client';

export class StorageProviderComplianceMetricsRequest extends FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'Flag to filter by HTTP retrievability type',
    type: Boolean,
  })
  httpRetrievability: stringifiedBool;

  @ApiPropertyOptional({
    description: 'Flag to filter by URL finder retrievability',
    type: Boolean,
  })
  urlFinderRetrievability: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Set to false to disable numberOfClients compliance metric check; default is true',
    type: Boolean,
  })
  numberOfClients?: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Set to false to disable totalDealSize compliance metric check; default is true',
    type: Boolean,
  })
  totalDealSize?: stringifiedBool;

  constructor(
    numberOfClients: stringifiedBool = 'true',
    totalDealSize: stringifiedBool = 'true',
    httpRetrievability: stringifiedBool = 'true',
    urlFinderRetrievability: stringifiedBool = 'true',
  ) {
    super();
    this.numberOfClients = numberOfClients;
    this.totalDealSize = totalDealSize;
    this.httpRetrievability = httpRetrievability;
    this.urlFinderRetrievability = urlFinderRetrievability;
  }
}

export class GetWeekStorageProvidersWithSpsComplianceRequestData extends StorageProviderComplianceMetricsRequest {
  @ApiPropertyOptional({
    description:
      'Requested week to check compliance for; default is last week; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  week?: string;
}

export class GetStorageProvidersRequest extends PaginationSortingInfoRequest {
  @ApiPropertyOptional({
    description: 'Storage provider ID to filter by',
  })
  provider?: string;
}

export class GetStorageProviderFilscanInfoRequest {
  @ApiProperty({
    description: 'Storage provider ID to ask for',
  })
  provider: string;
}

export class GetWeekStorageProvidersWithSpsComplianceRequest extends IntersectionType(
  GetWeekStorageProvidersWithSpsComplianceRequestData,
  GetStorageProvidersRequest,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: StorageProviderComplianceScoreRange,
  })
  complianceScore?: StorageProviderComplianceScoreRange;
}

export const storageProvidersDashboardStatisticTypes = [
  'TOTAL_STORAGE_PROVIDERS',
  'TOTAL_ACTIVE_STORAGE_PROVIDERS',
  'DDO_DEALS_PERCENTAGE',
  'DDO_DEALS_PERCENTAGE_TO_DATE',
  'STORAGE_PROVIDERS_WITH_HIGH_RPA_PERCENTAGE',
  'STORAGE_PROVIDERS_REPORTING_TO_IPNI_PERCENTAGE',
  'AVERAGE_URL_FINDER_RETRIEVABILITY_PERCENTAGE',
] as const;

export type StorageProvidersDashboardStatisticType =
  (typeof storageProvidersDashboardStatisticTypes)[number];

export class StorageProvidersDashboardStatistic extends DashboardStatistic {
  @ApiProperty({
    description: 'Type of storage providers dashboard statistic',
    enumName: 'StorageProvidersDashboardStatisticType',
    enum: storageProvidersDashboardStatisticTypes,
  })
  type: StorageProvidersDashboardStatisticType;
}

export class GetStorageProvidersStatisticsRequest extends PartialType(
  PickType(DashboardStatisticChange, ['interval'] as const),
) {}

export class GetStorageProvidersSLIDataRequest {
  @ApiProperty({
    description: 'List of storage providers IDs to get SLI data for',
    isArray: true,
  })
  storageProvidersIds: string[];
}

class StorageProvidersSLIData {
  @ApiProperty({
    enum: StorageProvidersMetricType,
    description: 'SLI Metric',
  })
  sliMetric: StorageProvidersMetricType;

  @ApiProperty({ description: 'SLI Metric Name' })
  sliMetricName: string;

  @ApiProperty({ description: 'SLI Metric Value' })
  sliMetricValue: string;

  @ApiProperty({ description: 'SLI Metric Description' })
  sliMetricDescription: string;

  @ApiProperty({ description: 'SLI Metric Unit' })
  sliMetricUnit: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Last updated at; ISO format',
  })
  updatedAt: Date;
}

export class GetStorageProvidersSLIDataResponse {
  @ApiProperty({ description: 'Storage provider ID' })
  storageProviderId: string;

  @ApiProperty({ description: 'Storage provider Name', nullable: true })
  storageProviderName: string | null;

  @ApiProperty({
    isArray: true,
    type: StorageProvidersSLIData,
    description: 'SLI Data for the storage provider',
  })
  data: StorageProvidersSLIData[];
}
