import { ApiProperty } from '@nestjs/swagger';

export class ClientStorageProvidersStats {
  @ApiProperty({ description: 'Storage provider ID' })
  provider: string;

  @ApiProperty({
    description: 'Total deal size with the provider in bytes',
    type: String,
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
  })
  name: string | null;

  @ApiProperty({
    description: 'List of client storage providers',
    type: ClientStorageProvidersStats,
    isArray: true,
  })
  stats: ClientStorageProvidersStats[];
}
