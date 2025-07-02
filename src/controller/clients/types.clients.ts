import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationSortingInfo } from '../base/types.controller-base';

export class ClientStorageProvidersStats {
  @ApiProperty({ description: 'Storage provider ID' })
  provider: string;

  @ApiProperty({
    description: 'Total deal size with the provider in bytes',
    type: String,
    format: 'int64',
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
  id: number;
  clientId: string;
  dealId: number;
  isDDO: boolean;
  type: string;
  providerId: string;
  pieceCid: string;
  pieceSize: string;
  createdAt: Date;
}

export class GetClientLatestClaimResponse {
  @ApiProperty({
    description: 'List of latest client claims',
    type: ClientLatestClaim,
    isArray: true,
  })
  data: ClientLatestClaim[];
}
