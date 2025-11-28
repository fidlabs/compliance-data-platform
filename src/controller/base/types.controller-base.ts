import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from '@nestjs/swagger';

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
export type DashboardStatisticValueType =
  (typeof dashboardStatisticValueTypes)[number];

export type DashboardStatisticChangeInterval =
  (typeof dashboardStatisticChangeIntervals)[number];

const dashboardStatisticValueTypes = ['numeric', 'percentage'] as const;
const dashboardStatisticChangeIntervals = ['day', 'week', 'month'] as const;

export class DashboardStatisticValue {
  @ApiProperty({
    description: 'Value for statistic as number',
  })
  value: number;

  @ApiProperty({
    description: 'Type of statistic value',
    enumName: 'DashboardStatisticValueType',
    enum: dashboardStatisticValueTypes,
  })
  type: DashboardStatisticValueType;
}

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

export class DashboardStatistic {
  @ApiProperty({ description: 'Statistic title' })
  title: string;

  @ApiPropertyOptional({
    description: 'Optional description of the statistic',
  })
  description: string | null;

  @ApiProperty({ description: 'Current value of given statistic' })
  value: DashboardStatisticValue;

  @ApiPropertyOptional({
    description: 'Percentage change of given statistic in time',
  })
  percentageChange?: DashboardStatisticChange | null;
}
