import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { PoRepDealState } from 'prisma/generated/client';
import { F0Id, stringToNumber } from 'src/utils/utils';
import { F0IdInput, IsBigIntLike, IsF0IdInput } from 'src/utils/validators';

export type PoRepSLIType = (typeof poRepSLITypes)[number];

export const poRepHistoryWindowSize = ['day', 'week', 'month'] as const;
export const poRepSLITypes = [
  'retrievabilityBps',
  'bandwidthMbps',
  'latencyMs',
  'indexingPct',
] as const;

class PaginationParameters {
  @ApiPropertyOptional({
    description: 'Number of items per page; default is no pagination',
    type: 'number',
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => stringToNumber(String(value)))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Page number, starts from 1; default is no pagination',
    type: 'number',
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => stringToNumber(String(value)))
  page?: number;
}

class PaginationMetadata {
  @ApiProperty({
    description: 'Current pagination page.',
    type: 'integer',
    minimum: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Total number of pages.',
    type: 'integer',
    minimum: 0,
  })
  pagesCount: number;

  @ApiProperty({
    description: 'Total count of matching results.',
    type: 'integer',
    minimum: 0,
  })
  totalCount: number;
}

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

// Deals list
export enum DealRailState {
  FINALIZED = 'finalized',
  TERMINATED = 'terminated',
  ACTIVE = 'active',
  IDLE = 'idle',
}

const dealsAvailableSortingKeys = [
  'deal_id',
  'deal_size_bytes',
  'predicted_deal_revenue',
  'total_amount_settled',
  'total_settlements_count',
] as const;

export class PoRepDealsListParameters extends PaginationParameters {
  @ApiPropertyOptional({
    description:
      'Optional filter by storage provider id, if provided then only deals of that provider will be returned',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsF0IdInput()
  providerId?: F0IdInput;

  @ApiPropertyOptional({
    description:
      'Optional filter by deal rail state, if not provided all deals will be returned',
    enum: DealRailState,
    required: false,
  })
  @IsOptional()
  @IsEnum(DealRailState)
  railState?: DealRailState;

  @ApiPropertyOptional({
    description: `Set to true to show active deals only. Deal is considered 
      active when it's in ${PoRepDealState.COMPLETED} state and it's payment 
      rail is in ${DealRailState.ACTIVE} or ${DealRailState.TERMINATED} state.`,
    required: false,
  })
  @IsOptional()
  @IsBooleanString()
  activeOnly?: 'true' | 'false' | '1' | '0';

  @ApiPropertyOptional({
    description:
      'Optional sorting key, if not provided deals will be sorted by deal id ascending',
    enumName: 'DealsListSortingKey',
    enum: dealsAvailableSortingKeys,
    required: false,
  })
  @IsOptional()
  @IsIn(dealsAvailableSortingKeys)
  sort?: (typeof dealsAvailableSortingKeys)[number];

  @ApiPropertyOptional({
    description: 'Optional sorting direction, "asc" by default',
    enumName: 'DealsListSortingDirection',
    enum: ['asc', 'desc'],
    required: false,
    default: 'asc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}

export class PoRepDeal {
  @ApiProperty({
    description: 'Unique identificator of a deal, an incrementing integer',
    type: 'string',
  })
  dealId: bigint;

  @ApiProperty({
    description: `Unique identificator of a storage provider, with whom the
      deal was made, presented in form of a f0 address.`,
    type: 'string',
  })
  @Transform(({ value }) => (value as F0Id).toString())
  providerId: F0Id;

  @ApiProperty({
    description: 'EVM address of the client who made the deal',
  })
  clientAddress: string;

  @ApiProperty({
    description: `State of a deal, can be one of:\n
      - ${PoRepDealState.PROPOSED} - deal was propsoed but no yet accepted by
      any storage provider\n
      - ${PoRepDealState.ACCEPTED} - deal was accepted but client needs to 
      prepare deal data\n
      - ${PoRepDealState.COMPLETED} - deal is active or storage provider is 
      onboarding deal data\n
      - ${PoRepDealState.TERMINATED} - deal was terminated\n
      - ${PoRepDealState.REJECTED} - deal was rejected
    `,
    enum: PoRepDealState,
    enumName: 'PoRepDealState',
  })
  dealState: PoRepDealState;

  @ApiProperty({
    description: `Unique identificator of a payment rail for a deal. Null
      value means that payment rail was not yet created for that deal.`,
    type: 'string',
    nullable: true,
  })
  railId: bigint | null;

  @ApiProperty({
    description: `State of the payment rail for a deal, can be one of:\n
      - ${DealRailState.IDLE}: rail was set up but is not yet active\n
      - ${DealRailState.ACTIVE}: payment rate was set up and rail is active\n
      - ${DealRailState.TERMINATED}: rail is being shut down\n
      - ${DealRailState.FINALIZED}: rail reached it's end and all settlements
      were made\n
      - null - rail was not yet created for that deal`,
    nullable: true,
  })
  railState: DealRailState | null;

  @ApiProperty({
    description: `Deal is considered active when it's in 
      ${PoRepDealState.COMPLETED} state and it's payment rail is in 
      ${DealRailState.ACTIVE} or ${DealRailState.TERMINATED} state.`,
  })
  active: boolean;

  @ApiProperty({
    description: `Address of ERC20 token used for deal payment rail. Zero
      address signify native token. Null value means no payment rail was set up 
      yet for that deal.`,
    nullable: true,
  })
  tokenAddress: string | null;

  @ApiProperty({
    description: `Symbol of ERC20 token used for deal payment rail. Null value 
      means no payment rail was set up yet for that deal.`,
    nullable: true,
  })
  tokenSymbol: string | null;

  @ApiProperty({
    description: `Number of decimal places of ERC20 token used for deal payment 
      rail. Null value means no payment rail was set up yet for that deal.`,
    nullable: true,
  })
  tokenDecimals: number | null;

  @ApiProperty({
    description: `Minimum retrievability percentage defined in deal requirements. 
      Represented as a floating point number between 0 and 1, eg. value of 0.1
      means that minumum retrievability required by deal is 10%. Null values 
      signify deals that do not have specific retrievability requirements.`,
    minimum: 0,
    maximum: 1,
    nullable: true,
  })
  minRequiredRetrievability: number | null;

  @ApiProperty({
    description: `Minimum bandwidth defined in deal requirements. Represented
      as an integer in units of Megabits per second. Null values signify deals 
      that do not have specific bandwidth requirements.`,
    minimum: 1,
    nullable: true,
  })
  minRequiredBandwidthMbps: number | null;

  @ApiProperty({
    description: `Maximum latency defined in deal requirements. Represented
      as an integer in units of milliseconds. Null values signify deals that do 
      not have specific latency requirements.`,
    minimum: 1,
    nullable: true,
  })
  maxRequiredLatencyMs: number | null;

  @ApiProperty({
    description: `Minimum percentage of positive IPNI advertisments defined 
      in deal requirements. Represented as a floating point number between 0 
      and 1, eg. value of 0.1 means that minumum indexing required by deal is 
      10%. Null values signify deals that do not have specific indexing 
      requirements.`,
    minimum: 0,
    maximum: 1,
    nullable: true,
  })
  minRequiredIndexing: number | null;

  @ApiProperty({
    description: `Average retrievability measured for deal in last 30 days that
      will be used to determine future payment rail settlements. Represented as 
      a floating point number between 0 and 1, eg. value of 0.1 means 10%
      average retrievability this month. Null values signify that no 
      retrievability measurments for that deal were taken this month.`,
    minimum: 0,
    maximum: 1,
    nullable: true,
  })
  predictedAverageRetrievability: number | null;

  @ApiProperty({
    description: `Average bandwidth measured for deal in last 30 days that will 
      be used to determine future payment rail settlements. Represented as a 
      integer in untis of Megabites per second. Null values signify that no 
      bandwidth measurments for that deal were taken this month.`,
    minimum: 0,
    nullable: true,
  })
  predictedAverageBandwidthMbps: number | null;

  @ApiProperty({
    description: `Average latency measured for deal in last 30 days that will 
      be used to determine future payment rail settlements. Represented as a 
      integer in untis of milliseconds. Null values signify that no latency 
      measurments for that deal were taken this month.`,
    minimum: 0,
    nullable: true,
  })
  predictedAverageLatencyMs: number | null;

  @ApiProperty({
    description: `Average percentage of positive IPNI advertisments measured 
      for deal in last 30 days that will be used to determine future payment 
      rail settlements. Represented as a floating point number between 0 and 1, 
      eg. value of 0.1 means 10% average indexing this month. Null values 
      signify that no indexing measurments for that deal were taken this month.`,
    minimum: 0,
    maximum: 1,
    nullable: true,
  })
  predictedAverageIndexing: number | null;

  @ApiProperty({
    description: 'Total deal size in bytes.',
    type: 'string',
  })
  dealSizeBytes: bigint;

  @ApiProperty({
    description: 'Flag telling if deal data was onboarded by storage provider.',
  })
  isDataOnboarded: boolean;

  @ApiProperty({
    description: `Price of deal, per sector (32GiB), per month in Wei 
      (smallest non-dividable unit of the underlying token).`,
    type: 'string',
  })
  pricePerSectorPerMonthWei: bigint;

  @ApiProperty({
    description: `Predicted revenue from a deal. Result of dividing total deal
      size by 32GiB (rounded up) and multiplying by deal lenght in full months.
      Presented in Wei (smallest non-dividable unit of the underlying token). 
      Includes network fees.`,
    type: 'string',
  })
  predictedDealRevenueWei: bigint;

  @ApiProperty({
    description: `Total settled amount on the payment rail for a deal. 
      Presented in Wei (smallest non-dividable unit of the underlying token). 
      Includes network fees. Null if no payment rail for deal exists.`,
    type: 'string',
    nullable: true,
  })
  totalSettledValueWei: bigint | null;

  @ApiProperty({
    description: `Total number of settlments done on the payment rail for a 
      deal. Usually one settlement is done per month. Null if no payment rail 
      for deal exists.`,
    nullable: true,
  })
  settlementsCount: number | null;

  @ApiProperty({
    description: `ISO Datetime of last settlement for a deal. Null if no 
      settlements were made.`,
    nullable: true,
  })
  @Transform(({ value }) => {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return null;
  })
  lastSettlementAt: Date | null;

  @ApiProperty({
    description: `Filecoin epoch of deal proposal creation`,
    nullable: true,
  })
  dealCreatedAtEpoch: bigint;

  @ApiProperty({
    description: `ISO Datetime of deal proposal creation`,
    nullable: true,
  })
  @Transform(({ value }) => {
    return (value as Date).toISOString();
  })
  dealCreatedAt: Date;

  constructor(poRepDeal: PoRepDeal) {
    Object.assign(this, poRepDeal);
  }
}

export class PoRepDealsList {
  @ApiProperty({
    description:
      'Paginated and sorted list of deals matching provided parameters.',
    type: [PoRepDeal],
  })
  data: PoRepDeal[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadata,
  })
  pagination: PaginationMetadata;
}

// Provider compliance statistics
const compliantDealsPercentageFieldKey = 'compliantDealsPercentage';

export class PoRepProviderComplianceStatistics {
  @ApiProperty({
    description: 'Total count of deals made with provider',
  })
  totalDealsCount: number;

  @ApiProperty({
    description: `Number of deals that are in state "COMPLETED" and have active
      payment rail.`,
  })
  activeDealsCount: number;

  @ApiProperty({
    description: `Percentage of provider deals that are compliant. Deals are 
      considered compliant if all predicted SLI values match deal requirements. 
      Predicted SLI values are calulated as average of measurements from last 
      30 days. Represented as a floating point number between 0 and 1. Null 
      value signify provider with no active deals.`,
    nullable: true,
  })
  [compliantDealsPercentageFieldKey]: number | null;

  @ApiProperty({
    description: `Count of active provider deals that are compliant. See 
      decription for "${compliantDealsPercentageFieldKey}" field on how that is 
      calculated.`,
  })
  compliantDealsCount: number;

  @ApiProperty({
    description: `Count of active provider deals that are non compliant. See 
      decription for "${compliantDealsPercentageFieldKey}" field on how that is 
      calculated.`,
  })
  nonCompliantDealsCount: number;

  @ApiProperty({
    description: `Count of active provider deals with unknow compliace state 
      (deals for which for any measured SLI there was no measurment in last 30 
      days).`,
  })
  unknownDealsCount: number;
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
    enumName: 'PoRepSLIType',
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
