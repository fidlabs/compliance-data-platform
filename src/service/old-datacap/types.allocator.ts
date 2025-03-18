import { ApiProperty } from '@nestjs/swagger';

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
}

export class OldDatacapAllocatorBalanceWeekResponse {
  @ApiProperty({
    type: OldDatacapAllocatorBalanceWeek,
    description: 'Allocators datacap balance by week',
    isArray: true,
  })
  results: OldDatacapAllocatorBalanceWeek[];
}
