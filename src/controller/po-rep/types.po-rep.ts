import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsOptional } from 'class-validator';
import { F0IdInput, IsBigIntLike, IsF0IdInput } from 'src/utils/validators';
import {
  DashboardStatistic,
  DashboardStatisticChange,
  PaginationInfoRequest,
  PaginationInfoResponse,
} from '../base/types.controller-base';

export type PoRepSLIType = (typeof poRepSLITypes)[number];

export const poRepSLITypes = [
  'retrievabilityBps',
  'bandwidthMbps',
  'latencyMs',
  'indexingPct',
] as const;

export const poRepDashboardStatisticTypes = [
  'TOTAL_DEALS_DONE',
  'TOTAL_USD_PAID',
  'TOTAL_DATA_ONBOARDED',
  'TOTAL_DEALS_VALUE',
] as const;

export class PoRepSLIMeasurment {
  @ApiProperty({
    description: 'Date of measurement',
  })
  date: string;

  @ApiProperty({
    description: 'SLI Value',
  })
  value: number;
}

export class PoRepProviderSLIInfo {
  @ApiProperty({
    description: 'Type of SLI',
    enum: poRepSLITypes,
    enumName: 'PoRepSLIType',
  })
  type: PoRepSLIType;

  @ApiProperty({
    description:
      'Value for given metric declared by the Provider during registration',
  })
  declaredValue: number;

  @ApiProperty({
    description: 'Up to 3 last measured values for given metric',
    isArray: true,
    type: PoRepSLIMeasurment,
  })
  measuredValues: PoRepSLIMeasurment[];
}

export class PoRepProviderInfo {
  @ApiProperty({
    description: 'Provider ID',
  })
  providerId: string;

  @ApiProperty({
    description: 'Flag telling if provider is paused',
  })
  paused: boolean;

  @ApiProperty({
    description: 'Flag telling if provider is blocked',
  })
  blocked: boolean;

  @ApiProperty({
    isArray: true,
    type: PoRepProviderSLIInfo,
    description: 'List of SLI for provider with values declared and measured',
  })
  slis: PoRepProviderSLIInfo[];

  @ApiProperty({
    description: 'Total Available Space for this Provider',
  })
  availableBytes: string;

  @ApiProperty({
    description: 'Bytes committed to deals',
  })
  committedBytes: string;

  @ApiProperty({
    description: 'Bytes allocated to not yet accepted deals',
  })
  pendingBytes: string;

  @ApiProperty({
    description: 'Minimum deal duration with given provider in days',
  })
  minDealDurationDays: number;

  @ApiProperty({
    description: 'Maximum deal duration with given provider in days',
  })
  maxDealDurationDays: number;

  @ApiProperty({
    description:
      'Total number of deals with that Provider with either "accepted" or "completed" state',
  })
  activeDealsCount: number;

  @ApiProperty({
    description: 'Block at which Provider was registered',
  })
  registeredAtBlock: string;
}

export class PoRepOnboardedDataHistoryEntry {
  @ApiProperty({
    description: 'Entry date',
  })
  date: string;

  @ApiProperty({
    description: 'Entry volume of onboarded data in bytes',
  })
  volume: string;

  @ApiProperty({
    description:
      'Cumulative amount of onboarded data in bytes, up to the entry date',
  })
  cumulativeTotal: string;
}

export class PoRepDealsValueHistoryEntry {
  @ApiProperty({
    description: 'Entry date',
  })
  date: string;

  @ApiProperty({
    description: 'Total value of deals accepted in entry window in USD',
  })
  volumeUSD: number;

  @ApiProperty({
    description:
      'Cumulative total value of accepted deals in USD, up to entry date',
  })
  cumulativeTotalUSD: number;
}

export class PoRepDealsPaymentsHistoryEntry {
  @ApiProperty({
    description: 'Entry date',
  })
  date: string;

  @ApiProperty({
    description: 'Daily volume of payments in USD',
  })
  dailyAmountUSD: number;

  @ApiProperty({
    description: 'Cumulative amount of payments in USD up to the entry date',
  })
  cumulativeAmountUSD: number;
}

export type PoRepDashboardStatisticType =
  (typeof poRepDashboardStatisticTypes)[number];

export class PoRepDashboardStatistic extends DashboardStatistic {
  @ApiProperty({
    description: 'Type of PoRep dashboard statistic',
    enumName: 'PoRepDashboardStatisticType',
    enum: poRepDashboardStatisticTypes,
  })
  type: PoRepDashboardStatisticType;
}

export class GetPoRepStatisticsRequest extends PartialType(
  PickType(DashboardStatisticChange, ['interval'] as const),
) {}

const poRepHistoryWindowSize = ['day', 'week', 'month'] as const;
export class PoRepHistoryRequest {
  @ApiProperty({
    description: 'Window size of returned data, eg. "week"',
    enum: poRepHistoryWindowSize,
    enumName: 'PoRepHistoryWindowSize',
    required: false,
    default: 'day',
  })
  @IsOptional()
  @IsIn(poRepHistoryWindowSize)
  windowSize?: (typeof poRepHistoryWindowSize)[number];
}

export class PoRepProvidersListParameters extends PaginationInfoRequest {
  @ApiProperty({
    description: 'Filter by provider ID, no filter by default',
    required: false,
    type: 'string',
  })
  @IsOptional()
  @IsF0IdInput()
  filter?: F0IdInput;

  @ApiProperty({
    description:
      'Flag to filter by provider state. True for active only, false for inactive only, empty for both',
    required: false,
    type: 'boolean',
  })
  @IsOptional()
  @IsBooleanString()
  showActive?: string;
}

export class GetPoRepProvidersResponse extends PaginationInfoResponse {
  @ApiProperty({
    description: 'List of Providers participating in Po-Rep market',
    type: PoRepProviderInfo,
    isArray: true,
  })
  data: PoRepProviderInfo[];
}

export class PoRepSLIComplianceHistoryParamters {
  @ApiPropertyOptional({
    description: 'History window interval, default is one day window',
    enum: poRepHistoryWindowSize,
    enumName: 'PoRepHistoryWindowSize',
    required: false,
    default: 'day',
  })
  @IsOptional()
  @IsIn(poRepHistoryWindowSize)
  windowSize?: 'day' | 'week' | 'month';

  @ApiPropertyOptional({
    description: 'SLI type to filter by, leave empty to include all',
    required: false,
    enum: poRepSLITypes,
    enumName: 'PoREpSLIType',
  })
  @IsOptional()
  @IsIn(poRepSLITypes)
  sliType?: PoRepSLIType;

  @ApiPropertyOptional({
    description: 'Provider ID to filter by, no filter by default',
    required: false,
  })
  @IsOptional()
  @IsBigIntLike()
  providerId?: string;

  @ApiPropertyOptional({
    description: 'Deal ID to filter by, no filter by default',
    required: false,
  })
  @IsOptional()
  @IsBigIntLike()
  dealId?: string;
}

export class PoRepSLIComplianceHistoryStateValues {
  @ApiProperty({
    description:
      'Number of providers having at least one deal matching given state',
  })
  providersCount: number;

  @ApiProperty({
    description:
      'Percentage of providers having at least one deal matching given state',
  })
  providersPercentage: number;

  @ApiProperty({
    description: 'Number of deals matching given state',
  })
  dealsCount: number;

  @ApiProperty({
    description: 'Percentage of deals matching given state',
  })
  dealsPercentage: number;

  @ApiProperty({
    description: 'Total size of deals matching given state in bytes',
  })
  totalDealsSize: string;

  @ApiProperty({
    description: 'Percentage of deals size matching given state',
  })
  totalDealsSizePercentage: number;
}

export class PoRepSLIComplianceHistoryEntry {
  @ApiProperty({
    description: 'Window start ISO date (UTC)',
  })
  date: string;

  @ApiProperty({
    description:
      'Values for compliant deals. Compliant deals are those for which all selected SLIs were met in given window.',
  })
  compliant: PoRepSLIComplianceHistoryStateValues;

  @ApiProperty({
    description:
      'Values for non-compliant deals. Non-compliant deals are those for which any of the selected SLIs were not met in given window.',
  })
  nonCompliant: PoRepSLIComplianceHistoryStateValues;

  @ApiProperty({
    description:
      'Values for unknown state deals. Unknown deals are those for which any of the selected SLIs were not measured at least once in given window.',
  })
  unknown: PoRepSLIComplianceHistoryStateValues;
}
