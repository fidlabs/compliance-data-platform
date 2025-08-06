import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationSortingInfo } from '../base/types.controller-base';

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

export class GetClientLatestClaimRequest extends PaginationSortingInfo {
  @ApiPropertyOptional({
    description: 'Storage provider ID to filter by',
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
}
