import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PoRepSLIType, poRepSLITypes } from 'src/service/po-rep/types.po-rep';
import { F0IdInput, IsF0IdInput } from 'src/utils/validators';
import {
  DashboardStatistic,
  DashboardStatisticChange,
  PaginationInfoRequest,
  PaginationInfoResponse,
} from '../base/types.controller-base';
import { StorageProviderUrlFinderDealSLIType } from 'prisma/generated/client';

export const poRepDashboardStatisticTypes = [
  'TOTAL_DEALS_DONE',
  'TOTAL_USD_PAID',
  'TOTAL_DATA_ONBOARDED',
  'TOTAL_DEALS_VALUE',
  'ACTIVE_CLIENTS_COUNT',
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
      'Flag to filter by provider state. True for active only, false for inactive only, omit to include both',
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

export class PoRepProviderComplianceStatisticsParameters {
  @ApiProperty({
    description: `Provider ID for which statistic should be returned. Either 
      numerical id or f0 address.`,
    type: 'string',
  })
  @IsF0IdInput()
  providerId: F0IdInput;
}

export class GetAvgSLIDataRequest {
  @ApiProperty({
    description: 'List of porep market deal IDs to get SLI data for',
    isArray: true,
    type: Number,
    minimum: 1,
  })
  dealIds: string[];
}

export class GetAvgSLIDataResponse {
  @ApiProperty({
    description: 'SLI metadata for each SLI type',
    type: Object,
  })
  sliMetadata: Record<
    string,
    {
      name: string;
      description: string;
      unit: string;
    }
  >;

  @ApiProperty({
    description:
      'Average SLI data for each deal ID, with SLI type as key and average value as value',
    type: Object,
  })
  data: Record<string, Record<string, number | null>>;
}
