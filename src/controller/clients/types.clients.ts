import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  PickType,
} from '@nestjs/swagger';
import {
  DashboardStatistic,
  DashboardStatisticChange,
  PaginationInfoResponse,
  PaginationSortingInfoRequest,
} from '../base/types.controller-base';

export class ClientStorageProvidersStats {
  @ApiProperty({ description: 'Storage provider ID' })
  provider: string;

  @ApiProperty({
    description: 'Total deal size with the provider in bytes',
    type: String,
    format: 'int64',
    example: '42',
  })
  total_deal_size: bigint;

  @ApiProperty({
    description: 'Percentage of total deal size with the provider',
  })
  percent: string;
}

export class GetClientStorageProvidersResponse {
  @ApiProperty({
    description: 'Client name',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'List of client storage providers',
    type: ClientStorageProvidersStats,
    isArray: true,
  })
  stats: ClientStorageProvidersStats[];
}

export class GetClientLatestClaimRequest extends PaginationSortingInfoRequest {
  @ApiPropertyOptional({
    description: 'Storage provider ID or piece CID to filter by',
  })
  filter?: string;
}

export class ClientLatestClaim {
  @ApiProperty({})
  id: number;

  @ApiProperty({})
  clientId: string;

  @ApiProperty({})
  dealId: number;

  @ApiProperty({})
  isDDO: boolean;

  @ApiProperty({})
  type: string;

  @ApiProperty({})
  providerId: string;

  @ApiProperty({})
  pieceCid: string;

  @ApiProperty({})
  pieceSize: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2024-04-22T00:00:00.000Z',
    description: 'ISO format',
  })
  createdAt: Date;
}

export class GetClientLatestClaimResponse {
  @ApiProperty({
    description: 'List of latest client claims',
    type: ClientLatestClaim,
    isArray: true,
  })
  data: ClientLatestClaim[];

  @ApiProperty({
    description: 'Number of returned claims',
  })
  count: number;

  @ApiProperty({
    description: 'Total sum of DDO piece sizes in bytes',
  })
  totalSumOfDdoPieceSize: string;

  @ApiProperty({
    description: 'Total sum of non-DDO piece sizes in bytes',
  })
  totalSumOfNonDdoPieceSize: string;
}

export const clientsDashboardStatisticTypes = [
  'TOTAL_CLIENTS',
  'TOTAL_ACTIVE_CLIENTS',
  'FAILING_CLIENTS',
  'DATACAP_SPENT_BY_CLIENTS',
  'CLIENTS_WITH_ACTIVE_DEALS',
  'CLIENTS_WITH_ACTIVE_DEALS_AND_DATACAP',
  'TOTAL_REMAINING_CLIENTS_DATACAP',
] as const;

export type ClientsDashboardStatisticType =
  (typeof clientsDashboardStatisticTypes)[number];

export class ClientsDashboardStatistic extends DashboardStatistic {
  @ApiProperty({
    description: 'Type of clients dashboard statistic',
    enumName: 'ClientsDashboardStatisticType',
    enum: clientsDashboardStatisticTypes,
  })
  type: ClientsDashboardStatisticType;
}

export class Client {
  @ApiProperty({
    description: 'Client ID',
  })
  id: string;

  @ApiProperty({
    description: 'Client name',
    nullable: true,
  })
  name: string | null;

  @ApiProperty({
    description: 'Client address',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: 'Github URL',
    nullable: true,
  })
  githubUrl: string | null;

  @ApiProperty({
    description: 'Datacap received in bytes',
  })
  datacapReceived: string;

  @ApiProperty({
    description: 'Datacap remaining in bytes',
  })
  datacapRemaining: string;

  @ApiProperty({
    description: 'Datacap used in last two weeks in bytes',
  })
  datacapUsed2Weeks: string;

  @ApiProperty({
    description: 'Datacap used in last 90 days in bytes',
  })
  datacapUsed90Days: string;
}

export class ClientsList extends PaginationInfoResponse {
  @ApiProperty({
    description: 'List of clients',
    isArray: true,
    type: Client,
  })
  data: Client[];
}

export class ClientDatacapAllocation {
  @ApiProperty({
    description: 'ID of allocator making the allocation',
  })
  allocatorId: string;

  @ApiProperty({
    description: 'ID of client receiving the allocation',
  })
  clientId: string;

  @ApiProperty({
    description: 'Amount of datacap allocated in bytes',
  })
  datacapAmount: string;

  @ApiProperty({
    description: 'ISO data time when allocation was made',
  })
  timestamp: string;
}

export class ClientsListQueryParameters extends PaginationSortingInfoRequest {
  @ApiPropertyOptional({
    description: 'Client ID/address/name to filter by',
  })
  filter?: string;
}

export class GetClientsStatisticsRequest extends PartialType(
  PickType(DashboardStatisticChange, ['interval'] as const),
) {}
