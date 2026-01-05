import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { AllocatorScoringMetric } from 'prisma/generated/client';
import {
  AllocatorComplianceScoreRange,
  AllocatorDatacapFlowData,
} from 'src/service/allocator/types.allocator';
import { stringifiedBool } from 'src/utils/utils';
import {
  DashboardStatistic,
  DashboardStatisticChange,
  PaginationSortingInfoRequest,
} from '../base/types.controller-base';
import { FilPlusEditionRequest } from '../base/types.filplus-edition-controller-base';
import { StorageProviderComplianceMetricsRequest } from '../storage-providers/types.storage-providers';

export enum AllocatorDataType {
  openData = 'openData',
  enterprise = 'enterprise',
}

export class GetAllocatorsLatestScoresRankingRequest {
  @ApiPropertyOptional({
    enum: AllocatorDataType,
    description:
      'Type of allocator data to use for ranking; default is all data',
  })
  dataType?: AllocatorDataType;
}

class AllocatorsScoresSummaryByMetricDataDetails {
  @ApiProperty({ description: 'Allocator ID' })
  allocatorId: string;

  @ApiProperty({ description: 'Report ID where the scores come from' })
  reportId: string;

  @ApiProperty({
    description: 'Report creation date; ISO format',
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  createDate: Date;

  @ApiProperty({
    description: 'Metric score of the allocator in the report',
  })
  totalScore: number;

  @ApiProperty({
    description:
      'Maximum possible metric score of the allocator from the latest report',
  })
  maxPossibleScore: number;

  @ApiProperty({
    description:
      'Percentage of the total score over the maximum possible score',
    format: 'decimal',
    example: '85.50',
  })
  scorePercentage: string;

  @ApiProperty({
    enum: AllocatorDataType,
    description: 'Type of data allocator is using',
  })
  dataType: AllocatorDataType;

  @ApiProperty({
    description: 'Total datacap of the allocator at the time of the report',
    format: 'int64',
    example: '42',
    nullable: true,
  })
  totalDatacap: string | null;
}

class AllocatorsScoresSummaryByMetricData {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'Date of the summary; ISO format',
  })
  date: Date;

  @ApiProperty({
    description:
      'List of allocators with low scores; null if details not included',
    isArray: true,
    nullable: true,
    type: AllocatorsScoresSummaryByMetricDataDetails,
  })
  scoreLowAllocators: AllocatorsScoresSummaryByMetricDataDetails[] | null;

  @ApiProperty({
    description:
      'List of allocators with medium scores; null if details not included',
    isArray: true,
    nullable: true,
    type: AllocatorsScoresSummaryByMetricDataDetails,
  })
  scoreMediumAllocators: AllocatorsScoresSummaryByMetricDataDetails[] | null;

  @ApiProperty({
    description:
      'List of allocators with high scores; null if details not included',
    isArray: true,
    nullable: true,
    type: AllocatorsScoresSummaryByMetricDataDetails,
  })
  scoreHighAllocators: AllocatorsScoresSummaryByMetricDataDetails[] | null;

  @ApiProperty({
    description: 'Number of allocators with low scores',
  })
  scoreLowAllocatorsCount: number;

  @ApiProperty({
    description: 'Number of allocators with medium scores',
  })
  scoreMediumAllocatorsCount: number;

  @ApiProperty({
    description: 'Number of allocators with high scores',
  })
  scoreHighAllocatorsCount: number;

  @ApiProperty({
    description: 'Total datacap of allocators with low scores',
    format: 'int64',
    example: '42',
  })
  scoreLowAllocatorsDatacap: string;

  @ApiProperty({
    description: 'Total datacap of allocators with medium scores',
    format: 'int64',
    example: '42',
  })
  scoreMediumAllocatorsDatacap: string;

  @ApiProperty({
    description: 'Total datacap of allocators with high scores',
    format: 'int64',
    example: '42',
  })
  scoreHighAllocatorsDatacap: string;
}

export class GetAllocatorsScoresSummaryByMetricResponse {
  @ApiProperty({
    description: 'Scoring metric the summary is for',
    enum: AllocatorScoringMetric,
  })
  metric: AllocatorScoringMetric;

  @ApiProperty({
    description: 'List of summary data grouped by week/month',
    isArray: true,
    type: AllocatorsScoresSummaryByMetricData,
  })
  data: AllocatorsScoresSummaryByMetricData[];
}

export class GetAllocatorsScoresSummaryByMetricRequest {
  @ApiPropertyOptional({
    description: 'Group by week or month; default is week',
    enum: ['week', 'month'],
    example: 'week',
  })
  groupBy?: 'week' | 'month';

  @ApiPropertyOptional({
    enum: AllocatorDataType,
    description: 'Type of allocator data to filter by; default is all data',
  })
  dataType?: AllocatorDataType;

  @ApiPropertyOptional({
    description:
      'Minimum score threshold to consider an allocator as medium score; default is 30',
    example: 30,
    type: Number,
  })
  mediumScoreThreshold?: string;

  @ApiPropertyOptional({
    description:
      'Minimum score threshold to consider an allocator as high score; default is 75',
    example: 75,
    type: Number,
  })
  highScoreThreshold?: string;

  @ApiPropertyOptional({
    description:
      'Flag to include detailed list of allocators per score category; default is false',
    type: Boolean,
  })
  includeDetails?: stringifiedBool;
}

export class GetAllocatorsLatestScoresRankingResponse {
  @ApiProperty({ description: 'Allocator ID' })
  allocatorId: string;

  @ApiProperty({ description: 'Allocator name' })
  allocatorName: string;

  @ApiProperty({
    description: 'Total score of the allocator from the latest report',
  })
  totalScore: number;

  @ApiProperty({
    description:
      'Maximum possible score of the allocator from the latest report',
  })
  maxPossibleScore: number;

  @ApiProperty({
    description:
      'Percentage of the total score over the maximum possible score',
    format: 'decimal',
    example: '85.50',
  })
  scorePercentage: string;

  @ApiProperty({
    description:
      'Percentage of the total score over the maximum possible score one week ago; null if week ago data is not available',
    nullable: true,
  })
  weekAgoScorePercentage: string | null;

  @ApiProperty({
    description:
      'Percentage of the total score over the maximum possible score one month ago; null if month ago data is not available',
    nullable: true,
  })
  monthAgoScorePercentage: string | null;

  @ApiProperty({
    enum: AllocatorDataType,
    description: 'Type of data allocator is using',
  })
  dataType: AllocatorDataType;

  @ApiProperty({
    description: 'Total datacap of the allocator',
    format: 'int64',
    example: '42',
    nullable: true,
    type: String,
  })
  totalDatacap: bigint | null;
}

export class GetDatacapFlowDataRequest {
  @ApiPropertyOptional({
    description:
      'Requested date to fetch historical data to; default is now, meaning all available data; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  cutoffDate?: string;
}

export class GetDatacapFlowDataResponse {
  @ApiProperty({
    type: String,
    description: 'Requested date; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  cutoffDate: Date;

  @ApiProperty({
    description: 'FilPlus edition ID the data is relevant to',
    example: 6,
  })
  filPlusEditionId: number;

  @ApiProperty({
    isArray: true,
    type: AllocatorDatacapFlowData,
    description: 'Datacap flow data up to the requested date',
  })
  data: AllocatorDatacapFlowData[];
}

class _GetAllocatorsRequest extends FilPlusEditionRequest {
  @ApiPropertyOptional({
    description: 'Filter to apply to addressId, address, name or orgName',
  })
  filter?: string;

  @ApiPropertyOptional({
    description:
      'Filter to find allocators using given metaallocator id or address; default is no filtering',
  })
  usingMetaallocator?: string;
}

export class GetAllocatorsRequest extends IntersectionType(
  _GetAllocatorsRequest,
  PaginationSortingInfoRequest,
) {
  @ApiPropertyOptional({
    description: 'Flag to show inactive allocators; default is true',
    type: Boolean,
  })
  showInactive?: stringifiedBool;

  @ApiPropertyOptional({
    description:
      'Filter to apply to isMetaallocator field; default is no filtering',
    type: Boolean,
  })
  isMetaallocator?: stringifiedBool;

  @ApiPropertyOptional({
    enum: AllocatorDataType,
    description: 'Type of allocator data to filter by; default is all data',
  })
  dataType?: AllocatorDataType;
}

export class GetWeekAllocatorsWithSpsComplianceRequestData extends IntersectionType(
  StorageProviderComplianceMetricsRequest,
  _GetAllocatorsRequest,
) {
  @ApiPropertyOptional({
    description:
      'Requested week to check compliance for; default is last week; ISO format',
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
  })
  week?: string;

  @ApiProperty({
    example: 50,
    description: 'Requested compliance threshold percentage',
    default: 50,
    minimum: 0,
    maximum: 100,
  })
  complianceThresholdPercentage: number;
}

export class GetWeekAllocatorsWithSpsComplianceRequest extends IntersectionType(
  GetWeekAllocatorsWithSpsComplianceRequestData,
  PaginationSortingInfoRequest,
) {
  @ApiPropertyOptional({
    description: 'Compliance score to filter by',
    enum: AllocatorComplianceScoreRange,
  })
  complianceScore?: AllocatorComplianceScoreRange;
}

export class GetAllocatorReportRequest {
  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
  })
  clientPaginationPage?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
  })
  clientPaginationLimit?: string;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
  })
  providerPaginationPage?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
  })
  providerPaginationLimit?: string;
}

export const allocatorsDashboardStatisticTypes = [
  'TOTAL_APPROVED_ALLOCATORS',
  'TOTAL_ACTIVE_ALLOCATORS',
  'COMPLIANT_ALLOCATORS',
  'NON_COMPLIANT_ALLOCATORS',
  'NUMBER_OF_ALERTS',
  'AVERAGE_NUMBER_OF_CLIENTS',
  'AVERAGE_PERCENTAGE_OF_RETURNING_CLIENTS',
  'AVERAGE_TIME_TO_FIRST_DEAL',
] as const;

export type AllocatorsDashboardStatisticType =
  (typeof allocatorsDashboardStatisticTypes)[number];

export class AllocatorsDashboardStatistic extends DashboardStatistic {
  @ApiProperty({
    description: 'Type of allocator dashboard statistic',
    enumName: 'AllocatorsDashboardStatisticType',
    enum: allocatorsDashboardStatisticTypes,
  })
  type: AllocatorsDashboardStatisticType;
}

export class GetAllocatorsStatisticsRequest extends PartialType(
  PickType(DashboardStatisticChange, ['interval'] as const),
) {}

export class GetAllocatorVerifiedClientsRequest extends PaginationSortingInfoRequest {}
