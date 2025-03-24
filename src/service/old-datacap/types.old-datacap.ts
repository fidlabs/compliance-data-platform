import { ApiProperty } from '@nestjs/swagger';

export class OldDatacapAllocatorBalance {
  @ApiProperty({
    description: 'Allocator ID',
  })
  allocator: string;

  @ApiProperty({
    description: 'Old datacap owned by the allocator',
  })
  oldDatacap: bigint;

  @ApiProperty({
    description: 'Old datacap allocated by the allocator',
  })
  allocations: bigint;
}

export class OldDatacapAllocatorBalanceWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({
    description: 'Old datacap owned by allocators that week',
  })
  oldDatacap: bigint;

  @ApiProperty({
    description: 'Old datacap allocated to clients that week',
  })
  allocations: bigint;

  @ApiProperty({
    description: 'Number of allocators holding old datacap',
  })
  allocators: number;

  @ApiProperty({
    isArray: true,
    type: OldDatacapAllocatorBalance,
    description: 'Data on specific allocators',
  })
  drilldown: OldDatacapAllocatorBalance[];
}

export class OldDatacapAllocatorBalanceWeekResponse {
  @ApiProperty({
    type: OldDatacapAllocatorBalanceWeek,
    description: 'Allocators datacap balance by week',
    isArray: true,
  })
  results: OldDatacapAllocatorBalanceWeek[];
}

export class OldDatacapClientBalance {
  @ApiProperty({
    description: 'Client ID',
  })
  client: string;

  @ApiProperty({
    description: 'Old datacap owned by the client',
  })
  oldDatacap: bigint;

  @ApiProperty({
    description: 'Old datacap spent by the client',
  })
  claims: bigint;
}

export class OldDatacapClientBalanceWeek {
  @ApiProperty({
    type: String,
    format: 'date',
    example: '2024-04-22T00:00:00.000Z',
  })
  week: Date;

  @ApiProperty({
    description: 'Old datacap owned by clients that week',
  })
  oldDatacap: bigint;

  @ApiProperty({
    description: 'Old datacap spent by clients that week',
  })
  claims: bigint;

  @ApiProperty({
    description: 'Number of clients holding old datacap',
  })
  clients: number;

  @ApiProperty({
    isArray: true,
    type: OldDatacapClientBalance,
    description: 'Data on specific client',
  })
  drilldown: OldDatacapClientBalance[];
}

export class OldDatacapClientBalanceWeekResponse {
  @ApiProperty({
    type: OldDatacapClientBalanceWeek,
    description: 'Clients datacap balance by week',
    isArray: true,
  })
  results: OldDatacapClientBalanceWeek[];
}
