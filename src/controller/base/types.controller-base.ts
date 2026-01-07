import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
  IntersectionType,
} from '@nestjs/swagger';
import { BigIntString } from 'src/utils/utils';

export class PaginationInfoRequest {
  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
    minimum: 1,
    type: Number,
  })
  limit?: string;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
    minimum: 1,
    type: Number,
  })
  page?: string;
}

export class PaginationInfo {
  @ApiPropertyOptional({
    description: 'Number of items per page; undefined if no pagination',
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; undefined if no pagination',
  })
  page?: number;
}

class _PaginationInfoResponse extends PaginationInfo {
  @ApiPropertyOptional({
    description: 'Total number of pages; undefined if no pagination or unknown',
  })
  pages?: number;

  @ApiPropertyOptional({
    description: 'Total number of items; undefined if no pagination or unknown',
  })
  total?: number;
}

export class PaginationInfoResponse {
  @ApiPropertyOptional({
    description: 'Pagination information',
  })
  pagination?: _PaginationInfoResponse;
}

export class SortingInfoRequest {
  @ApiPropertyOptional({
    description: 'Sorting field; default is no sorting',
  })
  sort?: string;

  @ApiPropertyOptional({
    description: 'Sorting order; default is ascending',
    enum: ['asc', 'desc'],
  })
  order?: 'asc' | 'desc';
}

export class PaginationSortingInfoRequest extends IntersectionType(
  PaginationInfoRequest,
  SortingInfoRequest,
) {}

// Dashboard Statistics
export type DashboardStatisticChangeInterval =
  (typeof dashboardStatisticChangeIntervals)[number];

const dashboardStatisticChangeIntervals = ['day', 'week', 'month'] as const;

export class BigIntDashboardStatisticValue {
  @ApiProperty({
    description: 'BigInt value for the statistic as string',
  })
  value: BigIntString;

  @ApiProperty({
    enum: ['bigint'],
  })
  type: 'bigint';
}

export class NumericDashboardStatisticValue {
  @ApiProperty({
    description: 'Numeric value for the statistic',
  })
  value: number;

  @ApiProperty({
    enum: ['numeric'],
  })
  type: 'numeric';
}

export class PercentageDashboardStatisticValue {
  @ApiProperty({
    description: 'Percentage value for the statistic',
  })
  value: number;

  @ApiProperty({
    enum: ['percentage'],
  })
  type: 'percentage';
}

const durationDashboardStatisticUnits = [
  'millisecond',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'year',
] as const;
export type DurationDashboardStatisticUnit =
  (typeof durationDashboardStatisticUnits)[number];

export class DurationDashboardStatisticValue {
  @ApiProperty({
    description: 'Value for the statistic in duration units',
  })
  value: number;

  @ApiProperty({
    description: 'Duration unit',
    enum: durationDashboardStatisticUnits,
  })
  unit: DurationDashboardStatisticUnit;

  @ApiProperty({
    enum: ['duration'],
  })
  type: 'duration';
}

export type DashboardStatisticValue =
  | BigIntDashboardStatisticValue
  | NumericDashboardStatisticValue
  | PercentageDashboardStatisticValue
  | DurationDashboardStatisticValue;

export class DashboardStatisticChange {
  @ApiProperty({
    description: 'Percentage change of given statistic in time',
  })
  value: number;

  @ApiProperty({
    description: 'Interval used to calculate change in time',
    enumName: 'DashboardStatisticChangeInterval',
    enum: dashboardStatisticChangeIntervals,
  })
  interval: DashboardStatisticChangeInterval;
}

@ApiExtraModels(
  BigIntDashboardStatisticValue,
  NumericDashboardStatisticValue,
  PercentageDashboardStatisticValue,
  DurationDashboardStatisticValue,
)
export class DashboardStatistic {
  @ApiProperty({ description: 'Statistic title' })
  title: string;

  @ApiPropertyOptional({
    description: 'Optional description of the statistic',
  })
  description: string | null;

  @ApiProperty({
    description: 'Current value of given statistic',
    oneOf: [
      { $ref: getSchemaPath(BigIntDashboardStatisticValue) },
      { $ref: getSchemaPath(NumericDashboardStatisticValue) },
      { $ref: getSchemaPath(PercentageDashboardStatisticValue) },
    ],
  })
  value: DashboardStatisticValue;

  @ApiPropertyOptional({
    description: 'Percentage change of given statistic in time',
  })
  percentageChange?: DashboardStatisticChange | null;
}
