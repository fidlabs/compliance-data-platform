import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { F0IdInput, IsBigIntLike, IsF0IdInput } from 'src/utils/validators';

export type PoRepSLIType = (typeof poRepSLITypes)[number];

export const poRepHistoryWindowSize = ['day', 'week', 'month'] as const;
export const poRepSLITypes = [
  'retrievabilityBps',
  'bandwidthMbps',
  'latencyMs',
  'indexingPct',
] as const;

export class PoRepHistoryParameters {
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

// Onboarded data history
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

// Deals value history
export class PoRepDealsValueHistoryEntry {
  @ApiProperty({
    description: 'Window start ISO date (UTC)',
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

// Deals payments history
export class PoRepDealsPaymentsHistoryEntry {
  @ApiProperty({
    description: 'Window start ISO date (UTC)',
  })
  date: string;

  @ApiProperty({
    description: 'Daily volume of payments in USD',
  })
  volumeUSD: number;

  @ApiProperty({
    description:
      'Cumulative amount of payments in USD up to the given window end date',
  })
  cumulativeTotalUSD: number;
}

// SLI compliance history
export class PoRepSLIComplianceHistoryParameters {
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
    type: 'string',
  })
  @IsOptional()
  @IsF0IdInput()
  providerId?: F0IdInput;

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

// Active clients history
export class PoRepActiveClientsHistoryParameters extends PoRepHistoryParameters {
  @ApiPropertyOptional({
    description: 'Provider ID to filter by, no filter by default',
    required: false,
    type: 'string',
  })
  @IsOptional()
  @IsF0IdInput()
  providerId?: F0IdInput;
}

export class PoRepActiveClientsHistoryEntry {
  @ApiProperty({
    description: 'Window start ISO date (UTC)',
  })
  date: string;

  @ApiProperty({
    description:
      'Count of active clients in a window. Client is considered active if they have at least one deal completed before or during the window, that was not terminated before window start.',
  })
  activeClientsCount: number;
}
