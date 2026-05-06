import { ApiProperty } from '@nestjs/swagger';
import { PaginationInfoResponse } from '../base/types.controller-base';

export type PoRepSLIType = (typeof poRepSLITypes)[number];

export const poRepSLITypes = [
  'retrievabilityBps',
  'bandwidthMbps',
  'latencyMs',
  'indexingPct',
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
    enumName: 'SLIType',
    enum: poRepSLITypes,
    description: 'Type of SLI',
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

export class GetPoRepProvidersResponse extends PaginationInfoResponse {
  @ApiProperty({
    description: 'List of Providers participating in Po-Rep market',
    type: PoRepProviderInfo,
    isArray: true,
  })
  data: PoRepProviderInfo[];
}
